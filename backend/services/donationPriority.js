const Donation = require('../models/donation');
const haversine = require('../utils/haversine');

const HOURS = 60 * 60 * 1000;

function urgencyFor(expiryTime, hasExpired = false) {
  if (hasExpired || !expiryTime) return hasExpired ? 'EXPIRED' : 'UNKNOWN';
  const hoursLeft = (new Date(expiryTime).getTime() - Date.now()) / HOURS;
  if (hoursLeft <= 2) return 'EMERGENCY';
  if (hoursLeft <= 5) return 'URGENT';
  if (hoursLeft <= 12) return 'PRIORITY';
  return 'STANDARD';
}

async function markExpiredDonations() {
  await Donation.updateMany(
    { expiryTime: { $lte: new Date() }, hasExpired: { $ne: true }, status: { $nin: ['collected'] } },
    { $set: { hasExpired: true } }
  );
}

function distanceFrom(origin, location) {
  return origin && location?.lat != null && location?.lng != null
    ? haversine(origin, location)
    : Number.MAX_SAFE_INTEGER;
}

function sortForPickup(donations, origin) {
  const priority = { EMERGENCY: 0, URGENT: 1, PRIORITY: 2, STANDARD: 3, UNKNOWN: 4, EXPIRED: 5 };
  const queued = donations
    .map(donation => ({ ...donation, urgency: urgencyFor(donation.expiryTime, donation.hasExpired), distanceKm: distanceFrom(origin, donation.location) }))
    .filter(donation => !donation.hasExpired)
    .sort((a, b) => priority[a.urgency] - priority[b.urgency] || a.distanceKm - b.distanceKm || new Date(a.expiryTime || 0) - new Date(b.expiryTime || 0));

  // Each urgency tier is ordered with nearest-neighbour routing, so emergency food is always handled first.
  let position = origin;
  return Object.values(priority).flatMap((_, rank) => {
    const group = queued.filter(donation => priority[donation.urgency] === rank);
    const ordered = [];
    while (group.length) {
      group.sort((a, b) => distanceFrom(position, a.location) - distanceFrom(position, b.location));
      const next = group.shift();
      next.distanceKm = distanceFrom(position, next.location);
      ordered.push(next);
      if (next.location?.lat != null) position = next.location;
    }
    return ordered;
  });
}

module.exports = { markExpiredDonations, sortForPickup, urgencyFor };

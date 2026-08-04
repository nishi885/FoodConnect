// utils/sorting.js
// Smart sorting for food listings
const haversine = require('./haversine');

/**
 * Sort food listings by expiry, then distance
 * @param {Array} foods [{expiryTime, ngoLocation: {lat, lng}}]
 * @returns {Array} sorted foods
 */
function smartSort(foods, refLocation) {
  return foods.sort((a, b) => {
    const expA = new Date(a.expiryTime);
    const expB = new Date(b.expiryTime);
    if (expA < expB) return -1;
    if (expA > expB) return 1;
    // If expiry is same, sort by distance
    const distA = haversine(refLocation, a.ngoLocation);
    const distB = haversine(refLocation, b.ngoLocation);
    return distA - distB;
  });
}
module.exports = { smartSort };

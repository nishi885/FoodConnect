// utils/matching.js
// NGO matching utility
const haversine = require('./haversine');

/**
 * Find the best NGO based on distance and capacity
 * @param {Object} donorLoc {lat, lng}
 * @param {Array} ngos [{_id, name, location: {lat, lng}, capacity}]
 * @returns {Object} Best NGO
 */
function findBestNGO(donorLoc, ngos) {
  let best = null;
  let minDist = Infinity;
  ngos.forEach(ngo => {
    if (ngo.capacity > 0 && ngo.location) {
      const dist = haversine(donorLoc, ngo.location);
      if (dist < minDist) {
        minDist = dist;
        best = ngo;
      }
    }
  });
  return best;
}

module.exports = { findBestNGO };

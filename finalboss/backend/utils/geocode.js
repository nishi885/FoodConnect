// utils/geocode.js
// Geocoding utility using OpenStreetMap Nominatim API
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

/**
 * Geocode a location string to { lat, lng } using Nominatim
 * @param {string} location
 * @returns {Promise<{lat: number, lng: number}>}
 */
async function geocodeLocation(location) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'FoodConnect/1.0' } });
  const data = await res.json();
  if (data && data.length > 0) {
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon)
    };
  }
  console.error(`Geocoding failed: No results for address: "${location}"`);
  throw new Error(`Location not found for address: "${location}". Please enter a more specific or valid address.`);
}

module.exports = { geocodeLocation };

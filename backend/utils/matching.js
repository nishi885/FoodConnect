// Function to calculate distance between two locations (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // radius of Earth in km

  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in km
}

// Main function to get best NGO
function getBestNGO(donorLocation, ngoList) {
  let bestNGO = null;
  let minDistance = Infinity;

  ngoList.forEach((ngo) => {
    const distance = calculateDistance(
      donorLocation.lat,
      donorLocation.lng,
      ngo.location.lat,
      ngo.location.lng
    );

    // Check if NGO has capacity
    if (ngo.capacity > 0 && distance < minDistance) {
      minDistance = distance;
      bestNGO = { ...ngo, distance };
    }
  });

  return bestNGO;
}

module.exports = { getBestNGO };
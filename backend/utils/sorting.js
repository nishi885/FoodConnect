function sortFoodByPriority(foodList, userLocation) {
  return foodList.sort((a, b) => {
    // First: sort by expiry time (earlier first)
    const expiryA = new Date(a.expiry_time);
    const expiryB = new Date(b.expiry_time);

    if (expiryA < expiryB) return -1;
    if (expiryA > expiryB) return 1;

    // Second: sort by distance (if expiry same)
    const distA =
      Math.abs(a.location.lat - userLocation.lat) +
      Math.abs(a.location.lng - userLocation.lng);

    const distB =
      Math.abs(b.location.lat - userLocation.lat) +
      Math.abs(b.location.lng - userLocation.lng);

    return distA - distB;
  });
}

module.exports = { sortFoodByPriority };
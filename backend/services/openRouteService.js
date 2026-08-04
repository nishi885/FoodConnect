const ORS_DIRECTIONS_URL = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';

async function getDrivingRoute(origin, stops) {
  if (!process.env.OPENROUTESERVICE_API_KEY || !origin || !stops.length) return null;
  const locations = [origin, ...stops.map(stop => stop.location)]
    .filter(point => Number.isFinite(point?.lat) && Number.isFinite(point?.lng))
    .slice(0, 50)
    .map(point => [point.lng, point.lat]);
  if (locations.length < 2) return null;

  const response = await globalThis.fetch(ORS_DIRECTIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: process.env.OPENROUTESERVICE_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ coordinates: locations, instructions: false })
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error('OpenRouteService could not create the route: ' + details.slice(0, 160));
  }
  const geojson = await response.json();
  const feature = geojson.features?.[0];
  return feature ? { geometry: feature.geometry, summary: feature.properties?.summary || null } : null;
}

module.exports = { getDrivingRoute };

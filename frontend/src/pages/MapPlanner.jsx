import { useEffect, useRef, useState } from 'react';
import api from '../api.js';

const DEFAULT_CENTER = [20.5937, 78.9629];
const INDIA_BOUNDS = [
  [6.4627, 68.1862],
  [35.5081, 97.3956]
];

function haversineDistance(a, b) {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(address + ', India')}`;
  const response = await fetch(url, {
    headers: { Accept: 'application/json' }
  });

  if (!response.ok) {
    throw new Error('Geocoding failed');
  }

  const data = await response.json();
  const result = data?.[0];
  if (!result) {
    throw new Error('No coordinates found');
  }

  return {
    lat: Number(result.lat),
    lon: Number(result.lon),
    display: result.display_name || address
  };
}

function sortByNearestPickup(items) {
  if (items.length <= 1) return items;

  const ordered = [];
  const visited = new Set();
  let current = items[0];

  ordered.push(current);
  visited.add(current._id);

  while (ordered.length < items.length) {
    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const item of items) {
      if (visited.has(item._id)) continue;
      const distance = haversineDistance([current.lat, current.lon], [item.lat, item.lon]);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = item;
      }
    }

    if (!nearest) break;
    ordered.push(nearest);
    visited.add(nearest._id);
    current = nearest;
  }

  return ordered;
}

export default function MapPlanner() {
  const mapNode = useRef(null);
  const [message, setMessage] = useState('Loading assigned pickups…');
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState('');

  useEffect(() => {
    let cancelled = false;

    api('/api/donations?bucket=pending')
      .then(async (data) => {
        if (cancelled) return;

        const donations = data.donations || [];
        if (!donations.length) {
          setItems([]);
          setMessage('No assigned pickups available.');
          setSummary('');
          return;
        }

        setMessage('Geocoding pickup locations…');

        const geocoded = [];
        for (const item of donations) {
          try {
            const coords = await geocodeAddress(item.address || item.location || 'India');
            geocoded.push({
              ...item,
              lat: coords.lat,
              lon: coords.lon,
              displayAddress: coords.display
            });
          } catch (error) {
            console.warn('Could not geocode address:', item.address, error);
          }
        }

        if (!geocoded.length) {
          setItems([]);
          setMessage('Pickup locations could not be mapped.');
          setSummary('');
          return;
        }

        const ordered = sortByNearestPickup(geocoded);
        setItems(ordered);
        setMessage('Pickup route loaded.');
        setSummary(`${ordered.length} pickup${ordered.length > 1 ? 's' : ''} mapped in route order.`);
      })
      .catch((err) => {
        if (!cancelled) {
          setMessage(err.message || 'Something went wrong while loading pickups.');
          setSummary('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapNode.current || !items.length) return;

    let activeMap;
    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !mapNode.current) return;

      activeMap = L.map(mapNode.current).setView(DEFAULT_CENTER, 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(activeMap);

      const validPoints = items.filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lon));
      if (!validPoints.length) return;

      const routeCoords = validPoints.map((item) => [item.lat, item.lon]);
      const routeLine = L.polyline(routeCoords, {
        color: '#2a9d8f',
        weight: 5,
        opacity: 0.9
      }).addTo(activeMap);

      validPoints.forEach((item, index) => {
        const marker = L.marker([item.lat, item.lon]).addTo(activeMap);
        marker.bindPopup(`<strong>${index + 1}. ${item.foodType}</strong><br />${item.address || item.displayAddress}`);
      });

      activeMap.fitBounds(routeLine.getBounds().pad(0.35), { maxZoom: 12 });

      if (activeMap.getBounds().isValid && !INDIA_BOUNDS.every(([sw, ne]) => activeMap.getBounds().contains(sw) && activeMap.getBounds().contains(ne))) {
        activeMap.setView(DEFAULT_CENTER, 5);
      }
    });

    return () => {
      isMounted = false;
      if (activeMap) {
        activeMap.remove();
      }
    };
  }, [items]);

  return (
    <div className="page-card">
      <h1>Route Planner</h1>
      <p>{message}</p>
      {summary && <div className="map-summary">{summary}</div>}
      <div className="map-actions">
        {items.map((item, index) => (
          <button key={item._id} onClick={() => window.alert(`${index + 1}. ${item.foodType}\n${item.address}`)}>
            {index + 1}. {item.foodType} — {item.address}
          </button>
        ))}
      </div>
      <div ref={mapNode} className="map-canvas" />
    </div>
  );
}

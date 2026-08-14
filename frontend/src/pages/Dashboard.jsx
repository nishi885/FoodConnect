import { useEffect, useState } from 'react';
import api from '../api.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api('/api/dashboard').then(data => setStats(data)).catch(() => setStats(null));
  }, []);

  return (
    <div className="page-card">
      <h1>Dashboard</h1>
      <div className="stats-grid">
        {stats ? (
          Object.entries(stats).map(([key, value]) => (
            <div key={key} className="stat-card">
              <div className="stat-label">{key.replace(/([A-Z])/g, ' $1')}</div>
              <div className="stat-value">{value}</div>
            </div>
          ))
        ) : (
          <div>Loading statistics…</div>
        )}
      </div>
    </div>
  );
}

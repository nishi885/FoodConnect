import { useEffect, useState } from 'react';
import api from '../api.js';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Donations({ history = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');
  const [agents, setAgents] = useState([]);

  const bucket = history ? 'history' : 'pending';

  useEffect(() => {
    api(`/api/donations?bucket=${bucket}`).then(data => setItems(data.donations)).catch(err => setMessage(err.message));
    if (location.pathname.startsWith('/admin/')) {
      api('/api/agents').then(data => setAgents(data.agents)).catch(() => {});
    }
  }, [bucket, location.pathname]);

  const handleAction = async (id, action) => {
    try {
      if (action === 'cancel') {
        await api(`/api/donations/${id}/cancel`, { method: 'POST' });
      } else if (action === 'collect') {
        await api(`/api/donations/${id}/collect`, { method: 'POST' });
      } else {
        const agentId = window.prompt('Agent ID');
        await api(`/api/donations/${id}/admin-action`, {
          method: 'POST',
          body: JSON.stringify({ action, agent: agentId, message: 'Assigned by admin' })
        });
      }
      const updated = await api(`/api/donations?bucket=${bucket}`);
      setItems(updated.donations);
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="page-card">
      <h1>{history ? 'Previous' : 'Pending'} {location.pathname.includes('/collections') ? 'Collections' : 'Donations'}</h1>
      {message && <div className="form-error">{message}</div>}
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Food</th>
            <th>Quantity</th>
            <th>Status</th>
            <th>Address</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item._id}>
              <td>{index + 1}</td>
              <td>{item.foodType}</td>
              <td>{item.quantity}</td>
              <td>{item.status}</td>
              <td>{item.address}</td>
              <td>
                {!history && item.status === 'assigned' && location.pathname.startsWith('/agent') && (
                  <button onClick={() => handleAction(item._id, 'collect')}>Mark collected</button>
                )}
                {!history && item.status === 'pending' && location.pathname.startsWith('/donor') && (
                  <button onClick={() => handleAction(item._id, 'cancel')}>Cancel</button>
                )}
                {location.pathname.startsWith('/admin') && item.status !== 'collected' && (
                  <button onClick={() => handleAction(item._id, 'assign')}>Assign</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

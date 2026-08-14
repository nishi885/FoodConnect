import { useEffect, useState } from 'react';
import api from '../api.js';

export default function NotificationPanel() {
  const [notifications, setNotifications] = useState([]);
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);

  const load = async () => {
    try {
      const data = await api('/notifications');
      setNotifications(data.notifications || []);
      setCount(data.unreadCount || 0);
    } catch {
      setNotifications([]);
      setCount(0);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, []);

  const markAll = async () => {
    await api('/notifications/mark-read', { method: 'POST', body: JSON.stringify({}) });
    load();
  };

  return (
    <div className="notification-panel">
      <button className="nav-button" onClick={() => setOpen(!open)}>
        Notifications {count > 0 ? `(${count})` : ''}
      </button>
      {open && (
        <div className="notification-menu">
          {notifications.length === 0 ? (
            <div className="notification-empty">No notifications</div>
          ) : (
            notifications.map(item => (
              <div className="notification-item" key={item._id}>
                <div>{item.message}</div>
                <div className="notification-meta">{new Date(item.createdAt).toLocaleString()}</div>
              </div>
            ))
          )}
          <button className="nav-button small" onClick={markAll}>Mark all read</button>
        </div>
      )}
    </div>
  );
}

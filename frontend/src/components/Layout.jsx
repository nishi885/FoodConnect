import { Outlet, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../api.js';
import NotificationPanel from './NotificationPanel.jsx';

function Layout({ user, setUser }) {
  const navigate = useNavigate();
  const [sessionUser, setSessionUser] = useState(user);

  useEffect(() => {
    setSessionUser(user);
  }, [user]);

  const logout = async () => {
    await api('/api/logout', { method: 'POST' });
    setUser(null);
    navigate('/');
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <Link to="/">FoodConnect</Link>
        </div>
        <nav className="app-nav">
          <Link to="/home/about-us">About us</Link>
          <Link to="/home/mission">Our mission</Link>
          <Link to="/home/contact-us">Contact us</Link>
          {sessionUser ? (
            <>
              <NotificationPanel />
              <button className="nav-button" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/auth/login">Login</Link>
              <Link to="/auth/signup">Signup</Link>
            </>
          )}
        </nav>
      </header>

      <div className="app-body">
        {sessionUser && <Sidebar user={sessionUser} />}
        <div className="page-content">
          <Outlet context={{ user: sessionUser, setUser }} />
        </div>
      </div>
    </div>
  );
}

function Sidebar({ user }) {
  const base = `/${user.role}`;
  const nav = {
    donor: [
      ['Dashboard', '/dashboard'],
      ['Donate', '/donate'],
      ['Pending donations', '/donations/pending'],
      ['Previous donations', '/donations/previous'],
      ['Profile', '/profile']
    ],
    agent: [
      ['Dashboard', '/dashboard'],
      ['Pending collections', '/collections/pending'],
      ['Previous collections', '/collections/previous'],
      ['Route planner', '/profile/google-maps'],
      ['Profile', '/profile']
    ],
    admin: [
      ['Dashboard', '/dashboard'],
      ['Pending donations', '/donations/pending'],
      ['Previous donations', '/donations/previous'],
      ['Agents', '/agents'],
      ['Profile', '/profile']
    ]
  };

  return (
    <aside className="app-sidebar">
      <div className="sidebar-user">Welcome {user.firstName}</div>
      <ul>
        {nav[user.role].map(([label, path]) => (
          <li key={path}>
            <Link to={`${base}${path}`}>{label}</Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default Layout;

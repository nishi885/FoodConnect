import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from './api.js';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import AuthLogin from './pages/AuthLogin.jsx';
import AuthSignup from './pages/AuthSignup.jsx';
import AuthVerify from './pages/AuthVerify.jsx';
import AuthForgot from './pages/AuthForgot.jsx';
import AuthReset from './pages/AuthReset.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Donate from './pages/Donate.jsx';
import Donations from './pages/Donations.jsx';
import Profile from './pages/Profile.jsx';
import MapPlanner from './pages/MapPlanner.jsx';
import Agents from './pages/Agents.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/api/session')
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="app-loading">Loading...</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<Layout user={user} setUser={setUser} />}>
          <Route index element={<Home />} />
          <Route path="home/about-us" element={<Home page="about" />} />
          <Route path="home/mission" element={<Home page="mission" />} />
          <Route path="home/contact-us" element={<Home page="contact" />} />

          <Route path="auth/login" element={<AuthLogin />} />
          <Route path="auth/signup" element={<AuthSignup />} />
          <Route path="auth/verify" element={<AuthVerify />} />
          <Route path="auth/forgot" element={<AuthForgot />} />
          <Route path="auth/reset" element={<AuthReset />} />

          <Route path="admin/dashboard" element={<Protected user={user} role="admin"><Dashboard /></Protected>} />
          <Route path="donor/dashboard" element={<Protected user={user} role="donor"><Dashboard /></Protected>} />
          <Route path="agent/dashboard" element={<Protected user={user} role="agent"><Dashboard /></Protected>} />

          <Route path="donor/donate" element={<Protected user={user} role="donor"><Donate /></Protected>} />
          <Route path="donor/donations/pending" element={<Protected user={user} role="donor"><Donations history={false} /></Protected>} />
          <Route path="donor/donations/previous" element={<Protected user={user} role="donor"><Donations history /></Protected>} />

          <Route path="agent/collections/pending" element={<Protected user={user} role="agent"><Donations history={false} /></Protected>} />
          <Route path="agent/collections/previous" element={<Protected user={user} role="agent"><Donations history /></Protected>} />
          <Route path="agent/profile/google-maps" element={<Protected user={user} role="agent"><MapPlanner /></Protected>} />

          <Route path="admin/agents" element={<Protected user={user} role="admin"><Agents /></Protected>} />

          <Route path="admin/profile" element={<Protected user={user} role="admin"><Profile /></Protected>} />
          <Route path="donor/profile" element={<Protected user={user} role="donor"><Profile /></Protected>} />
          <Route path="agent/profile" element={<Protected user={user} role="agent"><Profile /></Protected>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function Protected({ user, role, children }) {
  if (!user) return <Navigate to="/auth/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default App;

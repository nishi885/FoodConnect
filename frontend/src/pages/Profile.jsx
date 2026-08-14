import { useState } from 'react';
import api from '../api.js';
import { useOutletContext } from 'react-router-dom';

export default function Profile() {
  const { user, setUser } = useOutletContext();
  const [status, setStatus] = useState('');

  const handleSubmit = async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());

    try {
      const result = await api('/api/profile', { method: 'PATCH', body: JSON.stringify(body) });
      setUser(result.user);
      setStatus('Profile updated successfully.');
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <div className="page-card">
      <h1>Profile</h1>
      {status && <div className="form-message">{status}</div>}
      <form onSubmit={handleSubmit} className="profile-form">
        <label>
          First name
          <input name="firstName" defaultValue={user?.firstName || ''} required />
        </label>
        <label>
          Last name
          <input name="lastName" defaultValue={user?.lastName || ''} required />
        </label>
        <label>
          Email
          <input name="email" defaultValue={user?.email || ''} disabled />
        </label>
        <label>
          Address
          <input name="address" defaultValue={user?.address || ''} />
        </label>
        <label>
          Phone
          <input name="phone" defaultValue={user?.phone || ''} />
        </label>
        <button type="submit">Save profile</button>
      </form>
    </div>
  );
}

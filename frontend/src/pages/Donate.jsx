import { useState } from 'react';
import api from '../api.js';

export default function Donate() {
  const [status, setStatus] = useState('');

  const handleSubmit = async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());

    try {
      await api('/api/donations', { method: 'POST', body: JSON.stringify(body) });
      window.location.href = '/donor/donations/pending';
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <div className="page-card">
      <h1>Donate</h1>
      {status && <div className="form-error">{status}</div>}
      <form onSubmit={handleSubmit} className="donation-form">
        <label>
          Food type
          <input name="foodType" required />
        </label>
        <label>
          Quantity
          <input name="quantity" required />
        </label>
        <label>
          Cooking time
          <input name="cookingTime" type="datetime-local" required />
        </label>
        <label>
          Pickup address
          <input name="address" required />
        </label>
        <label>
          Phone
          <input name="phone" required />
        </label>
        <label>
          Message to admin
          <textarea name="donorToAdminMsg" rows="4" />
        </label>
        <button type="submit">Submit donation</button>
      </form>
    </div>
  );
}

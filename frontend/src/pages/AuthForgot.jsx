import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthForgot() {
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);

    const payload = new URLSearchParams();
    payload.append('email', form.get('email'));

    const response = await fetch('/auth/forgot', {
      method: 'POST',
      body: payload,
      credentials: 'include'
    });

    const data = await response.json().catch(() => ({ error: 'Unexpected error' }));
    if (response.ok) {
      return navigate(data.redirect || '/auth/reset');
    }
    setError(data.error || 'Could not send reset code. Please try again.');
  };

  return (
    <div className="page-card auth-card">
      <h1>Forgot Password</h1>
      <form onSubmit={handleSubmit} className="auth-form">
        {error && <div className="form-error">{error}</div>}
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <button type="submit">Send reset code</button>
      </form>
    </div>
  );
}

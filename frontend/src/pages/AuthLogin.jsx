import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';

export default function AuthLogin() {
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setUser } = useOutletContext();

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);

    const payload = new URLSearchParams();
    payload.append('email', form.get('email'));
    payload.append('password', form.get('password'));

    const response = await fetch('/auth/login', {
      method: 'POST',
      body: payload,
      credentials: 'include'
    });

    const data = await response.json().catch(() => ({ error: 'Unexpected error' }));
    if (response.ok) {
      try {
        const sessionResponse = await fetch('/api/session', { credentials: 'include' });
        const sessionData = await sessionResponse.json().catch(() => null);
        if (sessionResponse.ok && sessionData?.user) {
          setUser(sessionData.user);
        }
      } catch (err) {
        console.error('Failed to refresh session after login', err);
      }
      return navigate(data.redirect || '/');
    }
    setError(data.error || 'Login failed. Please verify your email and password.');
  };

  return (
    <div className="page-card auth-card">
      <h1>Login</h1>
      <form onSubmit={handleSubmit} className="auth-form">
        {error && <div className="form-error">{error}</div>}
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" required />
        </label>
        <button type="submit">Submit</button>
      </form>
      <div className="auth-footer">
        <span>Don't have an account?</span>
        <button type="button" className="link-button" onClick={() => navigate('/auth/signup')}>Signup here</button>
        <span className="divider">|</span>
        <button type="button" className="link-button" onClick={() => navigate('/auth/forgot')}>Forgot password?</button>
      </div>
    </div>
  );
}

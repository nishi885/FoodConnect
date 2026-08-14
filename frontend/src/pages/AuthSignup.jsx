import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthSignup() {
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);

    const payload = new URLSearchParams();
    payload.append('firstName', form.get('firstName'));
    payload.append('lastName', form.get('lastName'));
    payload.append('email', form.get('email'));
    payload.append('password1', form.get('password1'));
    payload.append('password2', form.get('password2'));
    payload.append('role', form.get('role'));

    const response = await fetch('/auth/signup', {
      method: 'POST',
      body: payload,
      credentials: 'include'
    });

    const data = await response.json().catch(() => ({ error: 'Unexpected error' }));
    if (response.ok) {
      return navigate(data.redirect || '/auth/verify');
    }
    setError(data.error || 'Signup failed. Check input values and try again.');
  };

  return (
    <div className="page-card auth-card">
      <h1>Signup</h1>
      <form onSubmit={handleSubmit} className="auth-form">
        {error && <div className="form-error">{error}</div>}
        <label>
          First name
          <input name="firstName" type="text" required />
        </label>
        <label>
          Last name
          <input name="lastName" type="text" required />
        </label>
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          Password
          <input name="password1" type="password" required />
        </label>
        <label>
          Confirm password
          <input name="password2" type="password" required />
        </label>
        <label>
          Role
          <select name="role" defaultValue="donor">
            <option value="donor">Donor</option>
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button type="submit">Submit</button>
      </form>
      <div className="auth-footer">
        <span>Already have an account?</span>
        <button type="button" className="link-button" onClick={() => navigate('/auth/login')}>Login here</button>
      </div>
    </div>
  );
}

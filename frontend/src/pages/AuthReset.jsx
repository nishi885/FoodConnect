import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AuthReset() {
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const queryEmail = searchParams.get('email');
    if (queryEmail) setEmail(queryEmail);
  }, [searchParams]);

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);

    const payload = new URLSearchParams();
    payload.append('email', email || form.get('email'));
    payload.append('otp', form.get('otp'));
    payload.append('password1', form.get('password1'));
    payload.append('password2', form.get('password2'));

    const response = await fetch('/auth/reset', {
      method: 'POST',
      body: payload,
      credentials: 'include'
    });

    const data = await response.json().catch(() => ({ error: 'Unexpected error' }));
    if (response.ok) {
      return navigate(data.redirect || '/auth/login');
    }
    setError(data.error || 'Reset failed. Verify your code and passwords.');
  };

  return (
    <div className="page-card auth-card">
      <h1>Reset Password</h1>
      <form onSubmit={handleSubmit} className="auth-form">
        {error && <div className="form-error">{error}</div>}
        <label>
          Email
          <input name="email" type="email" value={email} readOnly required />
        </label>
        <label>
          Reset code
          <input name="otp" type="text" required />
        </label>
        <label>
          New password
          <input name="password1" type="password" required />
        </label>
        <label>
          Confirm password
          <input name="password2" type="password" required />
        </label>
        <button type="submit">Reset password</button>
      </form>
    </div>
  );
}

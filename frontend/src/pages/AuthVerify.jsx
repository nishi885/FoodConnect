import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';

export default function AuthVerify() {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { setUser } = useOutletContext();

  useEffect(() => {
    const fetchEmail = async () => {
      try {
        const response = await fetch('/auth/verify', { credentials: 'include' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load verification email');
        setEmail(data.email || '');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEmail();
  }, []);

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    setMessage('');
    const form = new FormData(event.currentTarget);

    const payload = new URLSearchParams();
    payload.append('otp', form.get('otp'));

    const response = await fetch('/auth/verify', {
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
        console.error('Failed to refresh session after verify', err);
      }
      return navigate(data.redirect || '/');
    }
    setError(data.error || 'Verification failed. Check the code and try again.');
  };

  const resendOtp = async () => {
    setError('');
    setMessage('');
    try {
      const response = await fetch('/auth/resend-otp', {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json().catch(() => ({ error: 'Unexpected error' }));
      if (!response.ok) throw new Error(data.error || 'Could not resend code');
      setMessage(data.message || 'A new verification code has been sent to your email.');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="page-card auth-card">Loading verification info...</div>;
  }

  return (
    <div className="page-card auth-card">
      <h1>Verify Your Email</h1>
      {error && <div className="form-error">{error}</div>}
      {message && <div className="form-success">{message}</div>}
      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Email
          <input type="email" value={email} readOnly />
        </label>
        <label>
          Verification code
          <input name="otp" type="text" required />
        </label>
        <button type="submit">Verify</button>
      </form>
      <div className="auth-resend">
        <button type="button" onClick={resendOtp}>Resend code</button>
      </div>
    </div>
  );
}

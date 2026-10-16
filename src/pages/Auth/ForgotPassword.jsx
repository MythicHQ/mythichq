import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Film } from 'lucide-react';
import { useAuth } from '../Admin/AuthContext';

const ForgotPasswordPage = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    const normalizedEmail = email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setSubmitting(true);

    try {
      await resetPassword(normalizedEmail);
      setMessage('If an account exists for that email, a password reset link has been sent.');
      setEmail('');
    } catch (err) {
      setError(err.message || 'Unable to send reset email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page-shell">
      <div className="login-card">
        <aside className="login-visual-panel">
          <div className="login-visual-glow" />
          <div className="login-brand-mark"><Film size={22} strokeWidth={2.5} /></div>
          <div className="login-visual-copy">
            <span>MythicHQ / 03</span>
            <h1>Every story<br />has a way back.</h1>
            <p>Reset your access and return to your personal cinema compass.</p>
          </div>
          <div className="login-film-strip" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        </aside>

        <section className="login-form-panel">
          <div className="auth-header">
          <span className="auth-badge">Reset Access</span>
          <h2>Forgot Password?</h2>
          <p>Enter your email and we’ll send you a link to reset your password.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
          <label>
            <span>Email</span>
            <input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>

          {error && <div className="signin-feedback signin-feedback-error" role="alert">{error}</div>}
          {message && <div className="signin-feedback signin-feedback-success" role="status">{message}</div>}

          <button type="submit" className="btn-primary auth-button" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send Reset Link'}
          </button>
          </form>

          <div className="auth-links login-account-prompt">
            <Link to="/login">Back to Sign In</Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Film } from 'lucide-react';
import { useAuth } from '../Admin/AuthContext';
import googleLogo from '../../assets/google.png';
import authBackdrop from '../../assets/toxicbd.jpg';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { user, signUp, signInWithProvider, loading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/profiles" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');
    setSuccessMessage('');

    try {
      const { data } = await signUp({ email, password, fullName });
      if (data?.session) {
        navigate('/profiles', { replace: true });
        return;
      }
      setSuccessMessage('Account created. Check your email to finish verification, then log in.');
      setFullName('');
      setEmail('');
      setPassword('');
    } catch (error) {
      setFormError(error.message || 'Unable to create your account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProviderSignIn = async (provider) => {
    setSubmitting(true);
    setFormError('');
    try {
      await signInWithProvider(provider);
    } catch (error) {
      setFormError(error.message || `Unable to continue with ${provider}.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page-shell">
      <div className="login-card">
        <aside className="login-visual-panel" style={{ '--auth-backdrop-image': `url(${authBackdrop})` }}>
          <div className="login-visual-glow" />
          <div className="login-brand-mark"><Film size={22} strokeWidth={2.5} /></div>
          <div className="login-visual-copy">
            <span>MythicHQ / 02</span>
            <h1>Find your next<br />favorite story.</h1>
            <p>Build a watchlist that feels as personal as your taste in movies.</p>
          </div>
          <div className="login-film-strip" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        </aside>

        <section className="login-form-panel">
          <div className="auth-header">
            <span className="auth-badge">Create Account</span>
            <h2>Join MythicHQ</h2>
            <p>Create your account and start curating your cinema.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
          <label>
            <span>Full name</span>
            <input type="text" placeholder="Your name" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
          </label>

          <label>
            <span>Email</span>
            <input type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>

          <label>
            <span>Password</span>
            <span className="password-input-wrap">
              <input type={showPassword ? 'text' : 'password'} placeholder="At least 6 characters" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>

          {formError && <div className="auth-error">{formError}</div>}

          <button type="submit" className="btn-primary auth-button" disabled={submitting}>
            {submitting ? 'Creating Account...' : 'Create my account'}
          </button>
          </form>

          {successMessage && <div className="auth-success register-success">{successMessage}</div>}
          <div className="login-divider"><span>or sign up with</span></div>
          <div className="auth-provider-buttons">
            <button type="button" className="google-signin-button auth-provider-button" disabled={submitting} onClick={() => handleProviderSignIn('google')}>
              <img className="google-mark" src={googleLogo} alt="" aria-hidden="true" />
              <span>Google</span>
            </button>
            <button type="button" className="google-signin-button auth-provider-button" disabled={submitting} onClick={() => handleProviderSignIn('facebook')}>
              <span className="facebook-mark" aria-hidden="true">f</span>
              <span>Facebook</span>
            </button>
          </div>
          <div className="auth-links login-account-prompt">
            <span>Already have an account?</span><Link to="/login">Sign in</Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default RegisterPage;

import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Film } from 'lucide-react';
import { useAuth } from '../Admin/AuthContext';
import googleLogo from '../../assets/google.png';
import authBackdrop from '../../assets/toxicbd.jpg';

const LoginPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signIn, signInWithProvider, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [formMessage, setFormMessage] = useState(location.state?.message || '');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');
    setFormMessage('');

    try {
      await signIn({ email, password });
      navigate('/', { replace: true });
    } catch (error) {
      setFormError(error.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProviderSignIn = async (provider) => {
    setFormError('');
    setSubmitting(true);
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
            <span>MythicHQ / 01</span>
            <h1>Stories worth<br />staying for.</h1>
            <p>Your personal cinema compass for the next unforgettable watch.</p>
          </div>
          <div className="login-film-strip" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        </aside>

        <section className="login-form-panel">
          <div className="auth-header">
            <span className="auth-badge">Member Login</span>
            <h2>Welcome back</h2>
            <p>Sign in to continue exploring the MythicHQ collection.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              <span>Email</span>
              <input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>

            <label>
              <span className="login-label-row"><span>Password</span><Link to="/forgot-password">Forgot password?</Link></span>
              <span className="password-input-wrap">
                <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                <button type="button" className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>

            {formError && <div className="signin-feedback signin-feedback-error" role="alert">{formError}</div>}
            {formMessage && <div className="signin-feedback signin-feedback-success" role="status">{formMessage}</div>}

            <button type="submit" className="btn-primary auth-button" disabled={submitting}>
              {submitting ? 'Signing In...' : 'Sign in to MythicHQ'}
            </button>
          </form>

          <div className="login-divider"><span>or continue with</span></div>
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
            <span>New to MythicHQ?</span><Link to="/register">Create an account</Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Film } from 'lucide-react';
import { useAuth } from '../Admin/AuthContext';

const passwordRequirements = [
  { label: 'At least 8 characters', test: (password) => password.length >= 8 },
  { label: 'At least one uppercase letter', test: (password) => /[A-Z]/.test(password) },
  { label: 'At least one lowercase letter', test: (password) => /[a-z]/.test(password) },
  { label: 'At least one number', test: (password) => /\d/.test(password) },
];

const INVALID_LINK_MESSAGE = 'This password reset link is invalid or has expired. Request a new reset link.';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { user, loading, isPasswordRecovery, updatePassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    if (!success || !signedOut) return undefined;

    const redirectTimeout = window.setTimeout(() => {
      navigate('/login', {
        replace: true,
        state: { message: 'Password updated successfully!' },
      });
    }, 1800);

    return () => window.clearTimeout(redirectTimeout);
  }, [navigate, signedOut, success]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!isPasswordRecovery || !user) {
      setError(INVALID_LINK_MESSAGE);
      return;
    }

    const unmetRequirement = passwordRequirements.find(({ test }) => !test(password));
    if (unmetRequirement) {
      setError(`Password must have ${unmetRequirement.label.toLowerCase()}.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(password);
      setSuccess(true);

      try {
        await signOut();
        setSignedOut(true);
      } catch (signOutError) {
        setError(`Your password was updated, but we couldn't end the recovery session. ${signOutError.message || 'Please try signing out before continuing.'}`);
      }
    } catch (updateError) {
      setError(updateError.message || 'Unable to update your password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToSignIn = async () => {
    setError('');
    setSubmitting(true);
    try {
      if (user) await signOut();
      navigate('/login', {
        replace: true,
        state: success ? { message: 'Password updated successfully!' } : undefined,
      });
    } catch (signOutError) {
      setError(signOutError.message || 'Unable to end the recovery session. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <div className="signin-feedback" role="status">Checking your password reset link...</div>;
    }

    if (success) {
      return (
        <>
          <div className="signin-feedback signin-feedback-success" role="status">Password updated successfully!</div>
          {error && <div className="signin-feedback signin-feedback-error" role="alert">{error}</div>}
          <button type="button" className="btn-primary auth-button" disabled={submitting} onClick={handleBackToSignIn}>
            {submitting ? 'Signing Out...' : 'Back to Sign In'}
          </button>
        </>
      );
    }

    if (!isPasswordRecovery || !user) {
      return (
        <>
          <div className="signin-feedback signin-feedback-error" role="alert">{INVALID_LINK_MESSAGE}</div>
          <div className="auth-links login-account-prompt">
            <Link to="/forgot-password">Request a new reset link</Link>
            <Link to="/login">Back to Sign In</Link>
          </div>
        </>
      );
    }

    return (
      <>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            <span>New Password</span>
            <span className="password-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide new password' : 'Show new password'}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>

          <label>
            <span>Confirm Password</span>
            <span className="password-input-wrap">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
              <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword((visible) => !visible)} aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}>
                {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>

          <ul className="password-requirements" aria-label="Password requirements">
            {passwordRequirements.map(({ label, test }) => (
              <li key={label} className={test(password) ? 'password-requirement-met' : ''}>
                {label}
              </li>
            ))}
          </ul>

          {password && confirmPassword && password !== confirmPassword && (
            <div className="signin-feedback signin-feedback-error" role="status">Passwords do not match.</div>
          )}
          {error && <div className="signin-feedback signin-feedback-error" role="alert">{error}</div>}

          <button type="submit" className="btn-primary auth-button" disabled={submitting}>
            {submitting ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>

        <div className="auth-links login-account-prompt">
          <button type="button" disabled={submitting} onClick={handleBackToSignIn}>Back to Sign In</button>
        </div>
      </>
    );
  };

  return (
    <div className="login-page-shell">
      <div className="login-card">
        <aside className="login-visual-panel">
          <div className="login-visual-glow" />
          <div className="login-brand-mark"><Film size={22} strokeWidth={2.5} /></div>
          <div className="login-visual-copy">
            <span>MythicHQ / 04</span>
            <h1>A fresh start<br />for your account.</h1>
            <p>Choose a new password to get back to your personal cinema compass.</p>
          </div>
          <div className="login-film-strip" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        </aside>

        <section className="login-form-panel">
          <div className="auth-header">
            <span className="auth-badge">Reset Access</span>
            <h2>Create New Password</h2>
            <p>Choose a strong password you haven’t used before.</p>
          </div>
          {renderContent()}
        </section>
      </div>
    </div>
  );
};

export default ResetPasswordPage;

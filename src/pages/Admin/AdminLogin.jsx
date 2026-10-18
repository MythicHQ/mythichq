import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Film } from 'lucide-react';
import { useAuth } from './AuthContext';
import { supabase } from '../../lib/supabase';
import googleLogo from '../../assets/google.png';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { user, profile, signIn, signInWithProvider, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user && profile?.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const { user: signedInUser } = await signIn({ email, password });
      if (!signedInUser) {
        throw new Error('Invalid credentials.');
      }

      if (!supabase) {
        throw new Error('Supabase is not configured.');
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', signedInUser.id)
        .maybeSingle();

      if (profileError) {
        throw new Error(profileError.message || 'Unable to verify admin access.');
      }

      if (!profileData || profileData.role !== 'admin') {
        throw new Error('This account is not authorized for the admin panel.');
      }

      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Admin login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      await signInWithProvider('google');
    } catch (err) {
      setError(err.message || 'Unable to continue with Google.');
    }
  };

  return (
    <div className="login-page-shell">
      <div className="login-card">
        <aside className="login-visual-panel">
          <div className="login-visual-glow" />
          <div className="login-brand-mark"><Film size={22} strokeWidth={2.5} /></div>
          <div className="login-visual-copy">
            <span>MythicHQ / Admin</span>
            <h1>Keep the<br />story moving.</h1>
            <p>Manage the MythicHQ collection from one secure control room.</p>
          </div>
          <div className="login-film-strip" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        </aside>

        <section className="login-form-panel">
          <div className="auth-header">
          <span className="auth-badge">Admin Access</span>
          <h2>Authorized admin login</h2>
          <p>Use the authorized MythicHQ admin account only.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>

          <label>
            <span>Password</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn-primary auth-button" disabled={submitting}>
            {submitting ? 'Verifying...' : 'Admin Login'}
          </button>
          </form>

          <div className="login-divider"><span>or continue with</span></div>
          <button type="button" className="google-signin-button" onClick={handleGoogleSignIn}>
            <img className="google-mark" src={googleLogo} alt="" aria-hidden="true" />
            <span>Sign in with Google</span>
          </button>
        </section>
      </div>
    </div>
  );
};

export default AdminLoginPage;

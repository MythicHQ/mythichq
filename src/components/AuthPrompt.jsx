import React from 'react';
import { ArrowRight, Film, LogIn, UserPlus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../pages/Admin/AuthContext';

const AuthPrompt = () => {
  const navigate = useNavigate();
  const { authPromptOpen, closeAuthPrompt } = useAuth();

  if (!authPromptOpen) return null;

  const openAuthPage = (path) => {
    closeAuthPrompt();
    navigate(path);
  };

  return (
    <div className="auth-prompt-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) closeAuthPrompt();
    }}>
      <section className="auth-prompt-card" role="dialog" aria-modal="true" aria-labelledby="auth-prompt-title">
        <button type="button" className="auth-prompt-close" onClick={closeAuthPrompt} aria-label="Close sign in prompt">
          <X size={18} />
        </button>
        <div className="auth-prompt-icon"><Film size={22} /></div>
        <span className="auth-badge">MythicHQ account</span>
        <h2 id="auth-prompt-title">Sign in to continue</h2>
        <p>Log in or create an account to save your watchlist and use this feature.</p>
        <div className="auth-prompt-actions">
          <button type="button" className="btn-primary" onClick={() => openAuthPage('/login')}><LogIn size={16} /> Log In</button>
          <button type="button" className="btn-secondary" onClick={() => openAuthPage('/register')}><UserPlus size={16} /> Create Account</button>
        </div>
        <button type="button" className="auth-prompt-continue" onClick={closeAuthPrompt}>Continue Browsing <ArrowRight size={15} /></button>
      </section>
    </div>
  );
};

export default AuthPrompt;
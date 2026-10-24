import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import BrandMark from './BrandMark';

const pageTitles = {
  '/help': 'Help Center',
  '/contact': 'Contact Us',
  '/privacy-policy': 'Privacy Policy',
  '/terms-of-service': 'Terms of Service',
};

const PublicInfoLayout = () => {
  const { pathname } = useLocation();
  const title = pageTitles[pathname] || 'Information';

  return (
    <div className="public-info-layout">
      <header className="public-info-header">
        <Link to="/" className="public-info-brand" aria-label="MythicHQ home">
          <BrandMark className="public-info-brand-icon" />
          <span>Mythic<span>HQ</span></span>
        </Link>
        <nav aria-label="Account">
          <Link className="public-info-register" to="/register">Create Account</Link>
          <Link className="public-info-signin" to="/login">Sign In</Link>
        </nav>
      </header>

      <main className="public-info-main">
        <div className="public-info-breadcrumb"><Link to="/">Home</Link><span>/</span><span>{title}</span></div>
        <Outlet />
      </main>

      <footer className="public-info-footer">
        <Link to="/help">Help Center</Link>
        <Link to="/contact">Contact Us</Link>
        <Link to="/privacy-policy">Privacy Policy</Link>
        <Link to="/terms-of-service">Terms of Service</Link>
        <span>© {new Date().getFullYear()} MythicHQ</span>
      </footer>
    </div>
  );
};

export default PublicInfoLayout;

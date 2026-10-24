import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Shield } from 'lucide-react';
import BrandMark from './BrandMark';
import { getAvailableSocialLinks } from '../config/socialLinks';

const socialOrder = ['facebook', 'instagram', 'x', 'youtube'];

const SocialIcon = ({ platform }) => {
  if (platform === 'facebook') return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.35 21v-8.2h2.76l.41-3.2h-3.17V7.56c0-.93.26-1.56 1.59-1.56h1.7V3.14C16.35 3.05 15.32 3 14.12 3c-2.82 0-4.75 1.72-4.75 4.88V9.6H6.2v3.2h3.17V21h3.98Z" /></svg>;
  if (platform === 'instagram') return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5" fill="none" stroke="currentColor" strokeWidth="1.9" /><circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" strokeWidth="1.9" /><circle cx="17.75" cy="6.45" r="1.15" fill="currentColor" /></svg>;
  if (platform === 'x') return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.9 2H22l-6.78 7.75L23.2 22h-6.24l-4.89-7.52L5.5 22H2.37l7.25-8.29L1.8 2h6.4l4.42 6.94L18.9 2Zm-1.1 18h1.73L7.28 3.9H5.43L17.8 20Z" /></svg>;
  if (platform === 'youtube') return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M23.5 6.2a3 3 0 0 0-2.1-2.12C19.55 3.56 12 3.56 12 3.56s-7.55 0-9.4.52A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.12c1.85.52 9.4.52 9.4.52s7.55 0 9.4-.52a3 3 0 0 0 2.1-2.12A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.55 15.6V8.4L15.8 12l-6.25 3.6Z" /></svg>;
  return null;
};

const Footer = () => {
  const socialLinks = getAvailableSocialLinks();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <BrandMark className="footer-brand-mark" />
              <span className="logo-text">
                Mythic<span className="logo-accent">HQ</span>
              </span>
            </Link>
            <p className="footer-tagline">
              MythicHQ is an entertainment-focused platform built to make discovering movies, stories, and entertainment
              content simple and enjoyable.
            </p>
          </div>

          <div className="footer-links-grid">
            <div className="footer-col">
              <h4>MythicHQ</h4>
              <ul>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/movies">Movies</Link></li>
                <li><Link to="/tv-shows">TV Shows</Link></li>
                <li><Link to="/studios">Studios</Link></li>
                <li><Link to="/trending">Trending</Link></li>
              </ul>
            </div>

            <div className="footer-col footer-discover-col">
              <h4>Discover</h4>
              <ul className="footer-discover-list">
                <li><Link to="/languages">Languages</Link></li>
                <li><Link to="/discovery">Hidden Gems</Link></li>
                <li><Link to="/new-releases">New Releases</Link></li>
                <li><Link to="/genres">All Genres</Link></li>
                <li><Link to="/top-rated">Top Rated</Link></li>
                <li><Link to="/upcoming">Coming Soon</Link></li>
                <li><Link to="/search">Power Search</Link></li>
                <li><Link to="/watchlist">My Watchlist</Link></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>About</h4>
              <ul>
                <li><Link to="/about">About Us</Link></li>
                <li><Link to="/entertainment">Entertainment</Link></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Help &amp; Support</h4>
              <ul>
                <li><Link to="/help">Help Center</Link></li>
                <li><Link to="/contact">Contact Us</Link></li>
                <li><Link to="/privacy-policy">Privacy Policy</Link></li>
                <li><Link to="/terms-of-service">Terms of Service</Link></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Social Media</h4>
              <ul className="footer-social-list">
                {socialLinks.length === 0 ? (
                  <li>No official social links yet.</li>
                ) : (
                  socialLinks
                    .filter(({ platform }) => socialOrder.includes(platform))
                    .sort((first, second) => socialOrder.indexOf(first.platform) - socialOrder.indexOf(second.platform))
                    .map(({ platform, url, label }) => (
                      <li key={platform}>
                        <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Follow MythicHQ on ${label}`}>
                          <SocialIcon platform={platform} />
                        </a>
                      </li>
                    ))
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-divider" />

        <div className="footer-bottom">
          <div className="footer-tmdb-attribution">
            <Shield size={16} color="#FF2E4D" />
            <span>Curated locally for movie lovers.</span>
          </div>

          <p className="footer-copy">
            © {new Date().getFullYear()} MythicHQ. Crafted with <Heart size={14} color="#FF2E4D" /> for movie lovers.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

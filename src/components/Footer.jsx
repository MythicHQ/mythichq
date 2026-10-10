import React from 'react';
import { Link } from 'react-router-dom';
import { Film, Heart, Camera, MessageSquareText, Music2, Play, Send, Shield, Users } from 'lucide-react';
import { getAvailableSocialLinks } from '../config/socialLinks';

const socialIconMap = {
  youtube: Play,
  instagram: Camera,
  facebook: Users,
  x: Send,
  tiktok: Music2,
  discord: MessageSquareText,
};

const Footer = () => {
  const socialLinks = getAvailableSocialLinks();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-top">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <div className="logo-icon-box">
                <Film size={20} color="#FFFFFF" />
              </div>
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
              <h4>Navigation</h4>
              <ul>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/about">About Us</Link></li>
                <li><Link to="/movies">Movies</Link></li>
                <li><Link to="/entertainment">Entertainment</Link></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Explore</h4>
              <ul>
                <li><Link to="/genres">All Genres</Link></li>
                <li><Link to="/upcoming">Coming Soon</Link></li>
                <li><Link to="/search">Power Search</Link></li>
                <li><Link to="/watchlist">My Watchlist</Link></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Help & Support</h4>
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
                  socialLinks.map(({ platform, url, label }) => {
                    const Icon = socialIconMap[platform] || Play;

                    return (
                      <li key={platform}>
                        <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Follow MythicHQ on ${label}`}>
                          <Icon size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                          {label}
                        </a>
                      </li>
                    );
                  })
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
            © {new Date().getFullYear()} MythicHQ. Crafted with <Heart size={14} color="#FF2E4D" inline="true" /> for movie lovers.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

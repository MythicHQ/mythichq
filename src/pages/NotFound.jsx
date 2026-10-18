import React from 'react';
import { Home, MoveLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const NotFound = () => (
  <section className="not-found-page" aria-labelledby="not-found-title">
    <div className="not-found-orbit not-found-orbit--one" aria-hidden="true" />
    <div className="not-found-orbit not-found-orbit--two" aria-hidden="true" />
    <div className="not-found-content">
      <div className="not-found-code" aria-label="404">404</div>
      <p className="not-found-eyebrow"><span /> SIGNAL LOST <span /></p>
      <h1 id="not-found-title">Oops! You Have Lost Your Way</h1>
      <p className="not-found-message">
        The page you're looking for doesn't exist or may have been moved. Don't worry, let's get you back on track.
      </p>
      <p className="not-found-status">404 <span aria-hidden="true">—</span> Page Not Found</p>
      <Link className="not-found-home-button" to="/">
        <Home size={19} aria-hidden="true" />
        <span>Back to Home</span>
        <MoveLeft className="not-found-home-arrow" size={17} aria-hidden="true" />
      </Link>
    </div>
    <span className="not-found-frame not-found-frame--top" aria-hidden="true" />
    <span className="not-found-frame not-found-frame--bottom" aria-hidden="true" />
  </section>
);

export default NotFound;

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Bookmark,
  ExternalLink,
  Film,
  Mail,
  Search,
  Shield,
  Sparkles,
  Star,
  UserCircle2,
} from 'lucide-react';

const featureSections = [
  {
    title: 'What is MythicHQ?',
    text: 'MythicHQ is a movie discovery and entertainment platform built to help you explore titles, open movie details, save favorites to your Watchlist, rate and review films, and keep up with updates from the community.',
    icon: <Film size={18} />,
    items: [
      'Discover movies and TV shows from the Home, Movies, TV Shows, Trending, Top Rated, and Upcoming pages.',
      'Open any movie card to explore the full movie details page.',
      'Use your account to manage personal features such as Watchlist, ratings, and reviews.',
    ],
  },
  {
    title: 'Find Movies Using Search',
    text: 'Search helps you jump directly to the movie you want instead of manually browsing the full catalog.',
    icon: <Search size={18} />,
    items: [
      'Open the Search feature from the navigation bar.',
      'Enter a movie title, actor, or relevant keyword.',
      'Select a result to open its details page and learn more.',
    ],
  },
  {
    title: 'Explore by Genre & Category',
    text: 'Browse the existing Genre and category pages to explore curated movie collections based on the titles available in MythicHQ.',
    icon: <Sparkles size={18} />,
    items: [
      'Visit Genres or the category pages available in the app.',
      'Browse movies grouped by genre or collection.',
      'Choose a title to open its details page and watch the trailer when it is available.',
    ],
  },
  {
    title: 'Explore Movie Details',
    text: 'Each movie details page brings together the information that matters most, so you can learn about the film before you watch it.',
    icon: <Shield size={18} />,
    items: [
      'See the title, poster, backdrop, summary, release date, rating, and runtime.',
      'Review the existing genre, language, cast, and director details.',
      'Use the trailer, Watchlist, and review tools from the same page.',
    ],
  },
  {
    title: 'Watch Movie Trailers',
    text: 'When a trailer is available, you can open it directly from the movie details page.',
    icon: <Film size={18} />,
    items: [
      'Open a movie details page.',
      'Choose the trailer option to preview the movie.',
      'If a trailer is not available for a title, the page still provides the available details and watchlist actions.',
    ],
  },
  {
    title: 'Rate & Review Movies',
    text: 'MythicHQ supports both ratings and written reviews so you can share your opinion and discover what others think.',
    icon: <Star size={18} />,
    items: [
      'Use the star rating system to give a score from 0 to 5.',
      'Write a review comment to explain what worked for you.',
      'View existing reviews and remove your own review if needed.',
      'Log in before using personalized rating and review features when authentication is required.',
    ],
  },
  {
    title: 'Save Movies to Your Watchlist',
    text: 'The Watchlist is your personal movie list for titles you want to keep track of.',
    icon: <Bookmark size={18} />,
    items: [
      'Open a movie details page.',
      'Use the Watchlist button to save the film.',
      'Visit the Watchlist page to view and remove saved movies anytime.',
    ],
  },
  {
    title: 'Your MythicHQ Account',
    text: 'MythicHQ supports account sign up, login, logout, profile management, and personalized features where applicable.',
    icon: <UserCircle2 size={18} />,
    items: [
      'Create an account or sign in to access personalized features.',
      'Open your profile to manage account details.',
      'Use the authenticated parts of the app such as Watchlist, reviews, and saved preferences.',
    ],
  },
  {
    title: 'Stay Updated with Notifications',
    text: 'Notifications are available in the MythicHQ experience to help keep you informed about updates and account-related activity.',
    icon: <Bell size={18} />,
    items: [
      'Open the notification area from the top navigation.',
      'Check for updates that are relevant to your account or the current movie experience.',
      'Use the notification area as part of the existing MythicHQ user experience.',
    ],
  },
];

const quickStartSteps = [
  'Explore the Home page and discover something new.',
  'Use Search to find a movie directly.',
  'Open a movie details page for more information.',
  'Watch the trailer when it is available.',
  'Save interesting titles to your Watchlist.',
  'Rate and review movies to share your opinion.',
  'Check notifications regularly for updates.',
];

const HelpPage = () => {
  return (
    <div className="page-shell help-page">
      <section className="page-hero">
        <div className="page-kicker">Help Center</div>
        <h1 className="page-title">How MythicHQ Works</h1>
        <p className="page-copy">
          Everything you need to know about discovering movies, exploring movie details,
          saving your favorites, rating and reviewing films, and using MythicHQ.
        </p>

        <div className="page-cta-row">
          <Link to="/movies" className="btn-primary">
            Browse Movies
          </Link>
          <Link to="/contact" className="btn-outline">
            Contact Us
          </Link>
        </div>
      </section>

      <section className="page-section">
        <div className="section-header">
          <span className="section-badge">01</span>
          <div>
            <p className="section-eyebrow">Overview</p>
            <h2>What is MythicHQ?</h2>
          </div>
        </div>

        <div className="help-grid">
          {featureSections.map((section) => (
            <article key={section.title} className="help-card">
              <div className="help-card-icon">{section.icon}</div>
              <h3>{section.title}</h3>
              <p>{section.text}</p>

              <ul className="feature-list">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section">
        <div className="section-header">
          <span className="section-badge">02</span>
          <div>
            <p className="section-eyebrow">Quick Start</p>
            <h2>New to MythicHQ?</h2>
          </div>
        </div>

        <div className="quick-start-grid">
          {quickStartSteps.map((step, index) => (
            <div key={step} className="help-step">
              <span className="step-number">{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="page-section support-panel">
        <div className="section-header">
          <span className="section-badge">03</span>
          <div>
            <p className="section-eyebrow">Need help?</p>
            <h2>Still Need Help?</h2>
          </div>
        </div>

        <div className="support-box">
          <p>
            If you could not find the answer you were looking for, contact the MythicHQ team and we will be happy to hear from you.
          </p>

          <div className="page-cta-row">
            <Link to="/contact" className="btn-primary">
              Contact Us
            </Link>
            <a href="mailto:mythichq.official@gmail.com" className="btn-outline">
              <Mail size={18} />
              Email MythicHQ
            </a>
            <a
              href="https://www.instagram.com/themythichq/?__pwa=1"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline"
            >
              <ExternalLink size={18} />
              Follow MythicHQ on Instagram
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HelpPage;

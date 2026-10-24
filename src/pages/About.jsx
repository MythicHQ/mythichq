import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  Clapperboard,
  Compass,
  Film,
  Sparkles,
  Star,
  Users,
  Camera,
  Play,
  Send,
  Music2,
  MessageSquareText,
  Newspaper,
  ShieldCheck,
} from 'lucide-react';
import { getAvailableSocialLinks } from '../config/socialLinks';

const missionCards = [
  {
    title: 'Discover',
    text: 'Find movies, entertainment content, and interesting stories in one place.',
    icon: Compass,
  },
  {
    title: 'Explore',
    text: 'Explore new content through a clean and intuitive browsing experience.',
    icon: Sparkles,
  },
  {
    title: 'Enjoy',
    text: 'Enjoy a modern platform designed around entertainment and discovery.',
    icon: Play,
  },
];

const reasons = [
  {
    title: 'Modern Experience',
    text: 'A clean and modern interface designed for effortless browsing.',
    icon: Star,
  },
  {
    title: 'Entertainment Focused',
    text: 'A platform centered around movies, entertainment, and discovery.',
    icon: Clapperboard,
  },
  {
    title: 'Easy to Explore',
    text: 'Simple navigation makes it easy to find the content you are looking for.',
    icon: Compass,
  },
  {
    title: 'Community & Content',
    text: 'Build an engaging destination where entertainment lovers can discover and explore.',
    icon: Users,
  },
];

const offers = [
  { label: 'Movies', href: '/movies', icon: Film },
  { label: 'Entertainment', href: '/entertainment', icon: Sparkles },
  { label: 'Trending Content', href: '/trending', icon: Bell },
  { label: 'Stories & Information', href: '/help', icon: Newspaper },
  { label: 'Featured Content', href: '/top-rated', icon: Star },
  { label: 'Updates', href: '/contact', icon: MessageSquareText },
];

const getSocialIcon = (platform) => {
  switch (platform) {
    case 'youtube':
      return Play;
    case 'instagram':
      return Camera;
    case 'facebook':
      return Users;
    case 'x':
      return Send;
    case 'tiktok':
      return Music2;
    case 'discord':
      return MessageSquareText;
    default:
      return ShieldCheck;
  }
};

const AboutPage = () => {
  useEffect(() => {
    document.title = 'About MythicHQ | Discover. Explore. Experience.';

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        'content',
        'Learn more about MythicHQ, an entertainment-focused platform built to help you discover movies, stories, entertainment content, and more.'
      );
    }
  }, []);

  const socialLinks = getAvailableSocialLinks();

  return (
    <div className="page-shell about-page-shell">
      <section className="about-hero">
        <div className="about-hero__content">
          <span className="section-kicker">About MythicHQ</span>
          <h1>About MythicHQ</h1>
          <h2>Discover. Explore. Experience.</h2>
          <p>
            MythicHQ is a modern entertainment-focused platform built for people who love discovering movies,
            stories, characters, and everything that makes entertainment exciting. Our goal is to bring useful
            information, engaging content, and a clean browsing experience together in one place.
          </p>

          <div className="about-hero__actions">
            <Link to="/movies" className="btn-primary">
              Explore Movies
              <ArrowRight size={18} />
            </Link>
            <Link to="/contact" className="btn-outline">
              Contact Us
            </Link>
          </div>
        </div>

        <div className="about-hero__visual" aria-label="Cinematic entertainment collage">
          <div className="about-hero__image about-hero__image--large" />
          <div className="about-hero__image about-hero__image--small" />
          <div className="about-hero__badge">
            <Film size={18} />
            <span>Entertainment discovery</span>
          </div>
        </div>
      </section>

      <section className="about-section about-section--split">
        <div className="about-visual-card">
          <div className="about-visual-card__image" aria-label="Movie lovers and cinematic storytelling" />
        </div>

        <div className="about-copy-block">
          <span className="section-kicker">Who We Are</span>
          <h2>Who We Are</h2>
          <p>
            MythicHQ is built around a simple idea — entertainment should be easy to discover and enjoyable to
            explore. We create a platform where visitors can discover entertainment-related content through a clean,
            organized, and user-friendly experience.
          </p>
          <p>
            From movies and upcoming releases to interesting stories and entertainment updates, MythicHQ aims to make
            discovering something new simple and engaging.
          </p>
          <p>
            Signed-in members can create up to five viewing profiles, each with its own name and avatar. Families can
            also set a profile as Kids, then choose the right profile before browsing. Viewing profiles are kept
            separate from account sign-in details and protected so members only manage profiles on their own account.
          </p>
          <Link to="/profiles" className="btn-outline">
            <Users size={17} />
            Choose or Manage Profiles
          </Link>
        </div>
      </section>

      <section className="about-section about-mission">
        <div className="section-heading">
          <span className="section-kicker">Our Mission</span>
          <h2>Our Mission</h2>
        </div>

        <p className="section-intro">
          Our mission is to create a simple, engaging, and reliable destination for entertainment discovery. We want
          to make it easier for people to find interesting content while providing an experience that feels modern,
          fast, and enjoyable.
        </p>

        <div className="feature-grid mission-grid">
          {missionCards.map(({ title, text, icon: Icon }) => (
            <article key={title} className="feature-card">
              <div className="feature-icon">
                <Icon size={22} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-section">
        <div className="section-heading">
          <span className="section-kicker">Why MythicHQ</span>
          <h2>Why MythicHQ?</h2>
        </div>

        <div className="feature-grid reasons-grid">
          {reasons.map(({ title, text, icon: Icon }) => (
            <article key={title} className="feature-card hover-lift">
              <div className="feature-icon">
                <Icon size={22} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-section">
        <div className="section-heading">
          <span className="section-kicker">What You’ll Find</span>
          <h2>What You'll Find on MythicHQ</h2>
        </div>

        <div className="offer-grid">
          {offers.map(({ label, href, icon: Icon }) => {
            const content = (
              <>
                <div className="offer-icon">
                  <Icon size={22} />
                </div>
                <span>{label}</span>
              </>
            );

            if (href) {
              return (
                <Link key={label} to={href} className="offer-card">
                  {content}
                </Link>
              );
            }

            return (
              <div key={label} className="offer-card offer-card--inactive" aria-disabled="true">
                {content}
              </div>
            );
          })}
        </div>
      </section>

      <section className="about-section social-section">
        <div className="section-heading section-heading--stacked">
          <span className="section-kicker">Follow MythicHQ</span>
          <h2>Follow MythicHQ</h2>
        </div>

        <p className="section-intro section-intro--centered">
          Stay connected with MythicHQ and follow us for the latest entertainment content, updates, and new releases.
        </p>

        <div className="social-grid">
          {socialLinks.length === 0 ? (
            <p className="social-empty">No official social channels have been published yet.</p>
          ) : (
            socialLinks.map(({ platform, url, label }) => {
              const Icon = getSocialIcon(platform);

              return (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Follow MythicHQ on ${label}`}
                  className="social-card"
                >
                  <div className="social-card__icon">
                    <Icon size={20} />
                  </div>
                  <div className="social-card__body">
                    <span className="social-card__label">{label}</span>
                    <strong>{platform === 'youtube' ? 'Subscribe on YouTube' : `Follow on ${label}`}</strong>
                  </div>
                  <ArrowRight size={18} />
                </a>
              );
            })
          )}
        </div>
      </section>

      <section className="about-cta">
        <div>
          <span className="section-kicker">Get In Touch</span>
          <h2>Have Something to Share?</h2>
        </div>
        <p>
          We're always interested in connecting with entertainment lovers, creators, and people who have something
          interesting to share.
        </p>
        <Link to="/contact" className="btn-primary">
          Contact Us
          <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
};

export default AboutPage;

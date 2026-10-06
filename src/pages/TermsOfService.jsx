import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BookOpen, CircleUserRound, Clapperboard, FileText,
  Mail, RefreshCw, ShieldCheck,
} from 'lucide-react';

const termsSections = [
  {
    id: 'using-mythichq',
    number: '01',
    title: 'Using MythicHQ',
    icon: BookOpen,
    content: (
      <p>
        MythicHQ is a platform for discovering and browsing movies and entertainment. By using the site, you agree
        to use it lawfully, respect other users, and avoid disrupting or misusing the service.
      </p>
    ),
  },
  {
    id: 'entertainment-content',
    number: '02',
    title: 'Entertainment content',
    icon: Clapperboard,
    content: (
      <p>
        Movie details, availability, and recommendations are provided for discovery purposes. Information may come
        from third-party sources and can change or become unavailable; MythicHQ does not guarantee that every
        listing is complete or current.
      </p>
    ),
  },
  {
    id: 'your-account',
    number: '03',
    title: 'Your account',
    icon: CircleUserRound,
    content: (
      <>
        <p>
          If you create an account, profiles, or a watchlist, you are responsible for keeping your sign-in
          credentials secure and for the activity carried out through your account.
        </p>
        <Link to="/profiles" className="privacy-inline-link">
          Manage viewing profiles <ArrowRight size={15} />
        </Link>
      </>
    ),
  },
  {
    id: 'service-changes',
    number: '04',
    title: 'Service changes',
    icon: RefreshCw,
    content: (
      <p>
        Features and content may change as MythicHQ is improved. We may also update these terms to reflect product
        changes or applicable requirements. Continued use of the platform after an update means you accept the
        revised terms.
      </p>
    ),
  },
  {
    id: 'contact',
    number: '05',
    title: 'Questions about these terms?',
    icon: Mail,
    content: (
      <>
        <p>If you have a question about using MythicHQ, get in touch with our team.</p>
        <Link to="/contact" className="privacy-inline-link">
          Contact MythicHQ <ArrowRight size={15} />
        </Link>
      </>
    ),
  },
];

const TermsOfServicePage = () => (
  <div className="page-shell legal-page privacy-page terms-page">
    <section className="privacy-hero">
      <div className="privacy-hero__glow" aria-hidden="true" />
      <div className="privacy-hero__content">
        <div className="privacy-eyebrow"><ShieldCheck size={15} /> MythicHQ · Guidelines</div>
        <h1>Clear terms.<br />Better discoveries.</h1>
        <p>
          A straightforward guide to using MythicHQ, managing your account, and exploring entertainment content.
        </p>
        <div className="privacy-hero__meta">
          <span><span className="privacy-status-dot" /> Made for movie discovery</span>
          <span>Terms of Service</span>
        </div>
      </div>
      <div className="privacy-hero__art" aria-hidden="true">
        <div className="privacy-shield-orbit privacy-shield-orbit--outer" />
        <div className="privacy-shield-orbit privacy-shield-orbit--inner" />
        <div className="privacy-shield-core"><FileText size={50} strokeWidth={1.35} /></div>
      </div>
    </section>

    <section className="privacy-layout" aria-label="Terms of Service">
      <aside className="privacy-toc">
        <span className="privacy-toc__label">On this page</span>
        <nav aria-label="Terms of Service sections">
          {termsSections.map(({ id, number, title }) => (
            <a key={id} href={`#${id}`}><span>{number}</span>{title}</a>
          ))}
        </nav>
        <div className="privacy-toc__note">
          <ShieldCheck size={18} />
          <span>Use MythicHQ respectfully and enjoy discovering what to watch.</span>
        </div>
      </aside>

      <div className="privacy-sections">
        {termsSections.map(({ id, number, title, icon: Icon, content }) => (
          <article className="privacy-section-card" id={id} key={id}>
            <div className="privacy-section-card__top">
              <span className="privacy-section-card__icon"><Icon size={19} /></span>
              <span className="privacy-section-card__number">{number}</span>
            </div>
            <h2>{title}</h2>
            <div className="privacy-section-card__copy">{content}</div>
          </article>
        ))}
      </div>
    </section>
  </div>
);

export default TermsOfServicePage;

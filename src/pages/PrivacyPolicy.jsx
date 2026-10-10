import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Database, Fingerprint, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react';

const policySections = [
  {
    id: 'information',
    number: '01',
    title: 'Information We Collect',
    icon: Database,
    content: (
      <p>
        We collect information needed to provide a better experience on MythicHQ, including account details,
        viewing-profile details, watchlist activity, and contact information when you choose to reach out to us.
      </p>
    ),
  },
  {
    id: 'viewing-profiles',
    number: '02',
    title: 'Viewing Profiles',
    icon: UserRound,
    content: (
      <>
        <p>
          If you use viewing profiles, we store each profile&apos;s name, avatar choice, and whether it is marked as a
          Kids profile, along with the account it belongs to. Viewing profiles are separate from your MythicHQ
          sign-in account.
        </p>
        <p>
          The currently selected viewing profile is kept in this browser session to support navigation and is
          cleared when the session ends.
        </p>
        <Link to="/profiles" className="privacy-inline-link">
          Manage viewing profiles <ArrowRight size={15} />
        </Link>
      </>
    ),
  },
  {
    id: 'use',
    number: '03',
    title: 'How We Use Information',
    icon: Fingerprint,
    content: (
      <p>
        We use this information to personalize the experience, manage accounts and viewing profiles, improve
        product quality, and respond to your questions and feedback.
      </p>
    ),
  },
  {
    id: 'security',
    number: '04',
    title: 'Security',
    icon: LockKeyhole,
    content: (
      <p>
        Viewing-profile data is associated with the account that created it, and database access controls are used
        to restrict profile management to that account. We use reasonable safeguards to help protect the data we
        collect and handle it in a responsible manner.
      </p>
    ),
  },
  {
    id: 'contact',
    number: '05',
    title: 'Questions?',
    icon: Mail,
    content: (
      <>
        <p>If you have questions about this policy, our team is here to help.</p>
        <Link to="/contact" className="privacy-inline-link">
          Contact MythicHQ <ArrowRight size={15} />
        </Link>
      </>
    ),
  },
];

const PrivacyPolicyPage = () => (
  <div className="page-shell legal-page privacy-page">
    <section className="privacy-hero">
      <div className="privacy-hero__glow" aria-hidden="true" />
      <div className="privacy-hero__content">
        <div className="privacy-eyebrow"><ShieldCheck size={15} /> MythicHQ · Trust Center</div>
        <h1>Privacy, made clear.</h1>
        <p>
          Your experience matters. Here&apos;s a straightforward guide to the information used to make MythicHQ work
          for you.
        </p>
        <div className="privacy-hero__meta">
          <span><span className="privacy-status-dot" /> Your data. Your account.</span>
          <span>Privacy Policy</span>
        </div>
      </div>
      <div className="privacy-hero__art" aria-hidden="true">
        <div className="privacy-shield-orbit privacy-shield-orbit--outer" />
        <div className="privacy-shield-orbit privacy-shield-orbit--inner" />
        <div className="privacy-shield-core"><ShieldCheck size={54} strokeWidth={1.35} /></div>
      </div>
    </section>

    <section className="privacy-layout" aria-label="Privacy policy">
      <aside className="privacy-toc">
        <span className="privacy-toc__label">On this page</span>
        <nav aria-label="Privacy policy sections">
          {policySections.map(({ id, number, title }) => (
            <a key={id} href={`#${id}`}><span>{number}</span>{title}</a>
          ))}
        </nav>
        <div className="privacy-toc__note">
          <ShieldCheck size={18} />
          <span>We believe trust starts with transparency.</span>
        </div>
      </aside>

      <div className="privacy-sections">
        {policySections.map(({ id, number, title, icon: Icon, content }) => (
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

export default PrivacyPolicyPage;

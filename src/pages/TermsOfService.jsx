import React from 'react';

const TermsOfServicePage = () => (
  <div className="page-shell legal-page">
    <section className="page-hero narrow">
      <div className="page-kicker">Terms of Service</div>
      <h1 className="page-title">Terms of Service</h1>
      <p className="page-copy">
        By using MythicHQ, you agree to use the platform in a lawful and respectful manner.
      </p>
    </section>

    <section className="page-section legal-content">
      <div className="content-panel">
        <h2>Use of the Platform</h2>
        <p>
          MythicHQ is intended for entertainment discovery and browsing. You agree not to misuse the platform,
          interfere with other users, or violate applicable laws or policies.
        </p>

        <h2>Content</h2>
        <p>
          We provide access to entertainment-related information and recommendations. Some content may reflect third-party
          sources and may be updated over time.
        </p>

        <h2>Account Responsibility</h2>
        <p>
          If you create an account or watchlist, you are responsible for maintaining the security of your account and
          the accuracy of the information you provide.
        </p>

        <h2>Changes</h2>
        <p>
          MythicHQ may update these terms from time to time to reflect improvements, legal requirements, or product
          changes.
        </p>
      </div>
    </section>
  </div>
);

export default TermsOfServicePage;

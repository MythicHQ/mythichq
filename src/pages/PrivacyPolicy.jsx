import React from 'react';

const PrivacyPolicyPage = () => (
  <div className="page-shell legal-page">
    <section className="page-hero narrow">
      <div className="page-kicker">Privacy Policy</div>
      <h1 className="page-title">Privacy Policy</h1>
      <p className="page-copy">
        MythicHQ respects your privacy and aims to keep your information secure and used responsibly.
      </p>
    </section>

    <section className="page-section legal-content">
      <div className="content-panel">
        <h2>Information We Collect</h2>
        <p>
          We collect information needed to provide a better experience on MythicHQ, including account details,
          watchlist activity, and contact information when you choose to reach out to us.
        </p>

        <h2>How We Use Information</h2>
        <p>
          We use this information to personalize the experience, manage accounts, improve product quality, and
          respond to your questions and feedback.
        </p>

        <h2>Security</h2>
        <p>
          We use reasonable safeguards to help protect the data we collect and handle it in a responsible manner.
        </p>

        <h2>Contact</h2>
        <p>
          If you have questions about this policy, contact us through the Contact page on MythicHQ.
        </p>
      </div>
    </section>
  </div>
);

export default PrivacyPolicyPage;

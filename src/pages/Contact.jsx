import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle2, ArrowLeft, ExternalLink } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const initialForm = {
  name: '',
  email: '',
  subject: '',
  message: '',
};

const ContactPage = () => {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const emailValid = useMemo(() => /\S+@\S+\.\S+/.test(form.email.trim()), [form.email]);

  const validateForm = () => {
    const nextErrors = {};

    if (!form.name.trim()) nextErrors.name = 'Full Name is required.';
    if (!form.email.trim()) {
      nextErrors.email = 'Email Address is required.';
    } else if (!emailValid) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!form.subject.trim()) nextErrors.subject = 'Subject is required.';
    if (!form.message.trim()) {
      nextErrors.message = 'Message is required.';
    } else if (form.message.trim().length < 10) {
      nextErrors.message = 'Message should be at least 10 characters long.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: '',
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (!supabase || !isSupabaseConfigured) {
        setSubmitted(true);
        return;
      }

      const { error } = await supabase.from('contact_messages').insert([
        {
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
          status: 'new',
        },
      ]);

      if (error) {
        throw error;
      }

      setSubmitted(true);
      setForm(initialForm);
    } catch (error) {
      console.error('Contact form submission failed:', error);
      setSubmitError(error.message || 'Unable to send your message right now. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="page-shell contact-page">
        <section className="page-hero narrow">
          <div className="success-icon"><CheckCircle2 size={42} /></div>
          <div className="page-kicker">Message sent</div>
          <h1 className="page-title">Thank you for contacting MythicHQ</h1>
          <p className="page-copy">
            Your message has been received. We will get back to you as soon as possible.
          </p>

          <div className="page-cta-row centered">
            <Link to="/help" className="btn-primary">
              <ArrowLeft size={18} />
              Back to Help
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell contact-page">
      <section className="page-hero narrow">
        <div className="page-kicker">Support</div>
        <h1 className="page-title">Contact MythicHQ</h1>
        <p className="page-copy">
          Have a question, feedback, suggestion, or need help with MythicHQ? Send us a message.
        </p>
      </section>

      <section className="page-section contact-layout">
        <div className="contact-card">
          <div className="contact-info">
            <h2>Get in Touch</h2>
            <p>
              We are here to help with questions, feedback, and support requests related to your MythicHQ experience.
            </p>

            <a href="mailto:mythichq.official@gmail.com" className="contact-email">
              <Mail size={18} />
              mythichq.official@gmail.com
            </a>

            <div className="contact-social-box">
              <h3>Follow MythicHQ</h3>
              <p>
                Follow the official MythicHQ Instagram account for updates, announcements, movie-related content, and project news.
              </p>
              <a
                href="https://www.instagram.com/themythichq/?__pwa=1"
                target="_blank"
                rel="noopener noreferrer"
                className="contact-email"
              >
                <ExternalLink size={18} />
                Instagram
              </a>
            </div>
          </div>

          <form className="contact-form" onSubmit={handleSubmit} noValidate>
            <label>
              <span>Full Name</span>
              <input name="name" value={form.name} onChange={handleChange} placeholder="Your name" />
              {errors.name && <small className="field-error">{errors.name}</small>}
            </label>

            <label>
              <span>Email Address</span>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" />
              {errors.email && <small className="field-error">{errors.email}</small>}
            </label>

            <label>
              <span>Subject</span>
              <input name="subject" value={form.subject} onChange={handleChange} placeholder="How can we help?" />
              {errors.subject && <small className="field-error">{errors.subject}</small>}
            </label>

            <label>
              <span>Message</span>
              <textarea name="message" rows={6} value={form.message} onChange={handleChange} placeholder="Tell us more about your question or feedback." />
              {errors.message && <small className="field-error">{errors.message}</small>}
            </label>

            {submitError && <p className="submit-error">{submitError}</p>}

            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;

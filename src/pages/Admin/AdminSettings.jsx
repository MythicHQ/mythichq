import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';

const AdminSettingsPage = () => {
  const { profile } = useAuth();
  const { sendNotification } = useNotifications();

  const [form, setForm] = useState({ title: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setFeedback(null);
      await sendNotification(form);
      setForm({ title: '', message: '' });
      setFeedback({ type: 'success', message: 'Notification sent to all registered users.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to send the notification right now.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page-shell">
      <div className="admin-header-row">
        <div>
          <p className="eyebrow">Configuration</p>
          <h1>Settings</h1>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-header">
          <h3>Supabase setup</h3>
        </div>
        <div className="admin-settings-list">
          <div>
            <strong>Environment variables</strong>
            <p>VITE_SUPABASE_URL</p>
            <p>VITE_SUPABASE_ANON_KEY</p>
          </div>
          <div>
            <strong>Database security</strong>
            <p>Admin access is enforced by the profiles.role field and database-level RLS policies.</p>
          </div>
          <div>
            <strong>Protected admin routes</strong>
            <p>Normal users are redirected away from the admin panel and cannot access the dashboard.</p>
          </div>
        </div>
      </div>

      <div className="admin-panel" style={{ marginTop: '24px' }}>
        <div className="admin-panel-header">
          <h3>Broadcast notification</h3>
        </div>

        <form onSubmit={handleSubmit} className="admin-form" style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label htmlFor="notification-title" style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}>Title</label>
            <input
              id="notification-title"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Platform update"
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(17,24,39,0.8)', color: '#fff' }}
            />
          </div>

          <div>
            <label htmlFor="notification-body" style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}>Message</label>
            <textarea
              id="notification-body"
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="Share a message for all registered users..."
              rows="4"
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(17,24,39,0.8)', color: '#fff', resize: 'vertical' }}
            />
          </div>

          {feedback && (
            <p style={{ margin: 0, color: feedback.type === 'success' ? '#34d399' : '#fca5a5' }}>{feedback.message}</p>
          )}

          <div>
            <button type="submit" className="admin-button admin-button-primary" disabled={saving || profile?.role !== 'admin'}>
              {saving ? 'Sending...' : 'Send notification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSettingsPage;

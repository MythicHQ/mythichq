import React, { useEffect, useState } from 'react';
import { Mail, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const AdminContactMessagesPage = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadMessages = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      if (!supabase) {
        setMessages([]);
        return;
      }

      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Failed to load contact messages:', error);
      setErrorMessage(error.message || 'Unable to load contact messages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMessages();
  }, []);

  const updateStatus = async (messageId, status) => {
    if (!supabase) return;

    const { error } = await supabase
      .from('contact_messages')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) {
      window.alert(error.message || 'Unable to update message status.');
      return;
    }

    setMessages((current) => current.map((message) => (
      message.id === messageId ? { ...message, status } : message
    )));
  };

  const handleDelete = async (messageId) => {
    if (!window.confirm('Delete this contact message?') || !supabase) return;

    const { error } = await supabase.from('contact_messages').delete().eq('id', messageId);
    if (error) {
      window.alert(error.message || 'Unable to delete message.');
      return;
    }

    setMessages((current) => current.filter((message) => message.id !== messageId));
  };

  return (
    <div className="admin-page-shell contact-inbox-page">
      <div className="admin-header-row">
        <div>
          <p className="eyebrow">User communications</p>
          <h1>Contact inbox</h1>
          <p className="admin-header-copy">Messages sent from the public contact form.</p>
        </div>
        <button type="button" className="admin-button admin-button-secondary" onClick={() => void loadMessages()}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {loading && <div className="empty-state"><h3>Loading messages...</h3></div>}
      {!loading && errorMessage && <div className="empty-state"><h3>{errorMessage}</h3></div>}
      {!loading && !errorMessage && (
        <section className="contact-inbox-panel">
        <div className="contact-inbox-toolbar"><div><strong>Messages</strong><span>{messages.length} total</span></div></div>
        <div className="admin-table-wrap">
          <table className="admin-table admin-contact-table">
            <thead>
              <tr>
                <th>Sender</th>
                <th>Subject</th>
                <th>Message</th>
                <th>Received</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {messages.length > 0 ? messages.map((message) => (
                <tr key={message.id}>
                  <td>
                    <strong>{message.name || 'Unknown sender'}</strong>
                    <a href={`mailto:${message.email}`} className="admin-contact-email">{message.email}</a>
                  </td>
                  <td>{message.subject || '—'}</td>
                  <td className="admin-contact-message">{message.message || '—'}</td>
                  <td>{message.created_at ? new Date(message.created_at).toLocaleString() : '—'}</td>
                  <td>
                    <select
                      className={`admin-contact-status status-${message.status || 'new'}`}
                      value={message.status || 'new'}
                      onChange={(event) => void updateStatus(message.id, event.target.value)}
                    >
                      <option value="new">New</option>
                      <option value="read">Read</option>
                      <option value="replied">Replied</option>
                    </select>
                  </td>
                  <td>
                    <button type="button" className="admin-icon-btn danger" onClick={() => void handleDelete(message.id)} title="Delete message" aria-label="Delete message">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="empty-subtle"><Mail size={18} /> No contact messages yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </section>
      )}
    </div>
  );
};

export default AdminContactMessagesPage;

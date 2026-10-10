import React, { useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  Copy,
  Eye,
  PencilLine,
  RefreshCcw,
  Search,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNotifications } from './NotificationContext';
import CropImage from '../../components/CropImage';
import ImageCropButton from '../../components/ImageCropButton';
import SearchClearButton from '../../components/SearchClearButton';

const notificationTypes = ['general', 'announcement', 'new_movie', 'update', 'important', 'maintenance'];
const notificationPriorities = ['low', 'normal', 'high', 'urgent'];
const recipientScopes = [
  { value: 'all_users', label: 'All users' },
  { value: 'all_admins', label: 'All admins' },
  { value: 'specific_users', label: 'Specific user' },
  { value: 'multiple_users', label: 'Multiple selected users' },
];

const emptyNotificationForm = {
  title: '',
  body: '',
  type: 'general',
  priority: 'normal',
  recipientScope: 'all_users',
  recipientIds: [],
  movieId: '',
  imageUrl: '',
  scheduledFor: '',
  expiresInDays: '3',
  status: 'sent',
};

const AdminNotificationsPage = () => {
  const { notifications, unreadCount, sendNotification } = useNotifications();

  const [notificationRows, setNotificationRows] = useState([]);
  const [notificationUsers, setNotificationUsers] = useState([]);
  const [notificationMovies, setNotificationMovies] = useState([]);
  const [notificationForm, setNotificationForm] = useState(emptyNotificationForm);
  const [notificationPreview, setNotificationPreview] = useState(null);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [notificationFeedback, setNotificationFeedback] = useState(null);
  const [notificationFilters, setNotificationFilters] = useState({
    search: '',
    status: 'all',
    type: 'all',
    priority: 'all',
  });
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  useEffect(() => {
    const loadNotificationData = async () => {
      if (!supabase) {
        setNotificationRows([]);
        setNotificationUsers([]);
        setNotificationMovies([]);
        setLoadingNotifications(false);
        return;
      }

      setLoadingNotifications(true);

      try {
        const [notificationsResponse, usersResponse, moviesResponse] = await Promise.all([
          supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('profiles')
            .select('id, full_name, email, role')
            .order('full_name', { ascending: true }),
          supabase
            .from('movies')
            .select('id, title, release_date')
            .order('created_at', { ascending: false }),
        ]);

        if (notificationsResponse.error) {
          console.error('Failed to load notifications for admin:', notificationsResponse.error);
        }

        if (usersResponse.error) {
          console.error('Failed to load users for admin:', usersResponse.error);
        }

        if (moviesResponse.error) {
          console.error('Failed to load movies for admin:', moviesResponse.error);
        }

        setNotificationRows(notificationsResponse.data || []);
        setNotificationUsers(usersResponse.data || []);
        setNotificationMovies(moviesResponse.data || []);
      } finally {
        setLoadingNotifications(false);
      }
    };

    void loadNotificationData();
  }, []);

  const filteredNotifications = useMemo(() => {
    const searchTerm = notificationFilters.search.trim().toLowerCase();

    return notificationRows.filter((notification) => {
      const matchesSearch = !searchTerm
        || [notification.title, notification.body, notification.type, notification.priority]
          .join(' ')
          .toLowerCase()
          .includes(searchTerm);

      const matchesStatus = notificationFilters.status === 'all'
        || notification.status === notificationFilters.status;

      const matchesType = notificationFilters.type === 'all'
        || notification.type === notificationFilters.type;

      const matchesPriority = notificationFilters.priority === 'all'
        || notification.priority === notificationFilters.priority;

      return matchesSearch && matchesStatus && matchesType && matchesPriority;
    });
  }, [notificationFilters, notificationRows]);

  const recipientOptions = notificationUsers.filter(
    (userProfile) => userProfile.role !== 'admin' || notificationForm.recipientScope === 'all_admins'
  );

  const handleNotificationChange = (event) => {
    const { name, value } = event.target;

    setNotificationForm((current) => {
      const nextForm = { ...current, [name]: value };

      if (name === 'recipientScope' && (value === 'all_users' || value === 'all_admins')) {
        nextForm.recipientIds = [];
      }

      return nextForm;
    });

    if (notificationFeedback) {
      setNotificationFeedback(null);
    }
  };

  const handleRecipientSelection = (event) => {
    const selectedValues = Array.from(event.target.selectedOptions, (option) => option.value);
    setNotificationForm((current) => ({ ...current, recipientIds: selectedValues }));
  };

  const handlePreviewNotification = () => {
    const recipientLabel = notificationForm.recipientScope === 'all_users'
      ? 'All users'
      : notificationForm.recipientScope === 'all_admins'
        ? 'All admins'
        : notificationForm.recipientScope === 'specific_users'
          ? 'Specific user'
          : 'Multiple selected users';

    setNotificationPreview({
      ...notificationForm,
      recipientLabel,
      scheduledLabel: notificationForm.scheduledFor
        ? new Date(notificationForm.scheduledFor).toLocaleString([], {
            dateStyle: 'medium',
            timeStyle: 'short',
          })
        : 'Send immediately',
      expiryLabel: notificationForm.expiresInDays === 'never' ? 'Never' : `${notificationForm.expiresInDays} days after delivery`,
    });
  };

  const handleNotificationSubmit = async (event) => {
    event.preventDefault();

    try {
      setNotificationSaving(true);
      setNotificationFeedback(null);

      await sendNotification({
        ...notificationForm,
        message: notificationForm.body,
      });

      setNotificationForm(emptyNotificationForm);
      setNotificationPreview(null);
      setNotificationFeedback({
        type: 'success',
        message: notificationForm.status === 'draft'
          ? 'Notification saved as a draft. It is hidden from users.'
          : notificationForm.scheduledFor
          ? 'Notification scheduled successfully.'
          : 'Notification sent to the selected recipients.',
      });

      if (supabase) {
        const { data: refreshedNotifications = [] } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });

        setNotificationRows(refreshedNotifications);
      }
    } catch (error) {
      setNotificationFeedback({
        type: 'error',
        message: error.message || 'Unable to send the notification right now.',
      });
    } finally {
      setNotificationSaving(false);
    }
  };

  const handleEditNotification = (notification) => {
    setNotificationForm({
      title: notification.title || '',
      body: notification.body || notification.message || '',
      type: notification.type || 'general',
      priority: notification.priority || 'normal',
      recipientScope: notification.recipient_scope || 'all_users',
      recipientIds: Array.isArray(notification.recipient_ids) ? notification.recipient_ids : [],
      movieId: notification.movie_id || '',
      imageUrl: notification.image_url || '',
      scheduledFor: notification.scheduled_for ? notification.scheduled_for.slice(0, 16) : '',
      expiresInDays: notification.expires_at ? String(Math.max(1, Math.ceil((new Date(notification.expires_at) - new Date(notification.sent_at || notification.created_at || Date.now())) / 86400000))) : '3',
      status: notification.status || 'sent',
    });
    setNotificationPreview(null);
    setNotificationFeedback({ type: 'info', message: 'Notification loaded into the composer for editing.' });
  };

  const handleDuplicateNotification = (notification) => {
    setNotificationForm({
      title: `${notification.title || 'Copy'} (copy)`,
      body: notification.body || notification.message || '',
      type: notification.type || 'general',
      priority: notification.priority || 'normal',
      recipientScope: notification.recipient_scope || 'all_users',
      recipientIds: Array.isArray(notification.recipient_ids) ? notification.recipient_ids : [],
      movieId: notification.movie_id || '',
      imageUrl: notification.image_url || '',
      scheduledFor: '',
      expiresInDays: '3',
      status: 'draft',
    });
    setNotificationPreview(null);
    setNotificationFeedback({ type: 'success', message: 'Notification duplicated into the composer.' });
  };

  const handleResendNotification = async (notification) => {
    if (!supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          status: 'sent',
          delivery_status: 'sent',
          sent_at: new Date().toISOString(),
          scheduled_for: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', notification.id);

      if (error) {
        throw error;
      }

      const { data: refreshedNotifications = [] } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      setNotificationRows(refreshedNotifications);
      setNotificationFeedback({ type: 'success', message: 'Notification has been resent.' });
    } catch (error) {
      setNotificationFeedback({ type: 'error', message: error.message || 'Unable to resend this notification.' });
    }
  };

  const handleCancelScheduledNotification = async (notification) => {
    if (!supabase) {
      return;
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .update({
          status: 'draft',
          scheduled_for: null,
          delivery_status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', notification.id);

      if (error) {
        throw error;
      }

      const { data: refreshedNotifications = [] } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      setNotificationRows(refreshedNotifications);
      setNotificationFeedback({ type: 'success', message: 'Scheduled notification cancelled.' });
    } catch (error) {
      setNotificationFeedback({ type: 'error', message: error.message || 'Unable to cancel the scheduled notification.' });
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!supabase || !window.confirm('Delete this notification? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        throw error;
      }

      setNotificationRows((currentRows) => currentRows.filter((notification) => notification.id !== notificationId));
      setNotificationFeedback({ type: 'success', message: 'Notification deleted successfully.' });
    } catch (error) {
      setNotificationFeedback({ type: 'error', message: error.message || 'Unable to delete this notification.' });
    }
  };

  return (
    <div className="admin-page-shell">
      <div className="admin-header-row">
        <div>
          <p className="admin-kicker">Communication</p>
          <h1>Notification Sender</h1>
        </div>
        <div className="admin-header-actions">
          <span className="admin-notification-pill">{unreadCount} unread</span>
        </div>
      </div>

      <div className="admin-panel admin-notifications-panel">
        <div className="admin-notifications-layout">
          <form onSubmit={handleNotificationSubmit} className="admin-notification-form">
            <div className="admin-notification-field">
              <label htmlFor="dashboard-notification-title">Notification title</label>
              <input
                id="dashboard-notification-title"
                name="title"
                value={notificationForm.title}
                onChange={handleNotificationChange}
                placeholder="Platform update"
                required
              />
            </div>

            <div className="admin-notification-field">
              <label htmlFor="dashboard-notification-message">Notification message</label>
              <textarea
                id="dashboard-notification-message"
                name="body"
                value={notificationForm.body}
                onChange={handleNotificationChange}
                placeholder="Share an announcement with your users..."
                rows="5"
                required
              />
            </div>

            <div className="admin-notification-form-grid">
              <div className="admin-notification-field">
                <label htmlFor="dashboard-notification-type">Notification type</label>
                <select id="dashboard-notification-type" name="type" value={notificationForm.type} onChange={handleNotificationChange}>
                  {notificationTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="admin-notification-field">
                <label htmlFor="dashboard-notification-priority">Priority</label>
                <select id="dashboard-notification-priority" name="priority" value={notificationForm.priority} onChange={handleNotificationChange}>
                  {notificationPriorities.map((priority) => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="admin-notification-form-grid">
              <div className="admin-notification-field">
                <label htmlFor="dashboard-notification-recipient-scope">Recipient selection</label>
                <select
                  id="dashboard-notification-recipient-scope"
                  name="recipientScope"
                  value={notificationForm.recipientScope}
                  onChange={handleNotificationChange}
                >
                  {recipientScopes.map((scope) => (
                    <option key={scope.value} value={scope.value}>{scope.label}</option>
                  ))}
                </select>
              </div>

              <div className="admin-notification-field">
                <label htmlFor="dashboard-notification-movie">Optional movie/content</label>
                <select id="dashboard-notification-movie" name="movieId" value={notificationForm.movieId} onChange={handleNotificationChange}>
                  <option value="">No movie linked</option>
                  {notificationMovies.map((movie) => (
                    <option key={movie.id} value={movie.id}>{movie.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {(notificationForm.recipientScope === 'specific_users' || notificationForm.recipientScope === 'multiple_users') && (
              <div className="admin-notification-field">
                <label htmlFor="dashboard-notification-recipients">Selected users</label>
                <select
                  id="dashboard-notification-recipients"
                  multiple
                  value={notificationForm.recipientIds}
                  onChange={handleRecipientSelection}
                  className="admin-recipient-select"
                >
                  {recipientOptions.map((userProfile) => (
                    <option key={userProfile.id} value={userProfile.id}>
                      {userProfile.full_name || userProfile.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="admin-notification-form-grid">
              <div className="admin-notification-field">
                <label htmlFor="dashboard-notification-image">Optional image/icon URL</label>
                <input
                  id="dashboard-notification-image"
                  name="imageUrl"
                  value={notificationForm.imageUrl}
                  onChange={handleNotificationChange}
                  placeholder="https://..."
                />
                {notificationForm.imageUrl && <ImageCropButton source={notificationForm.imageUrl} label="notification image" aspectRatio="16:9" />}
              </div>

              <div className="admin-notification-field">
                <label htmlFor="dashboard-notification-status">Delivery</label>
                <select id="dashboard-notification-status" name="status" value={notificationForm.status} onChange={handleNotificationChange}>
                  <option value="draft">Save as draft (hidden from users)</option>
                  <option value="sent">Send / schedule</option>
                </select>
              </div>

              <div className="admin-notification-field">
                <label htmlFor="dashboard-notification-schedule">Schedule notification</label>
                <input
                  id="dashboard-notification-schedule"
                  name="scheduledFor"
                  value={notificationForm.scheduledFor}
                  onChange={handleNotificationChange}
                  type="datetime-local"
                />
              </div>
            </div>

            <div className="admin-notification-field">
              <label htmlFor="dashboard-notification-expiry">Notification expiry</label>
              <select id="dashboard-notification-expiry" name="expiresInDays" value={notificationForm.expiresInDays} onChange={handleNotificationChange}>
                <option value="1">Expire after 1 day</option>
                <option value="3">Expire after 3 days</option>
                <option value="7">Expire after 7 days</option>
                <option value="never">Never expire</option>
              </select>
            </div>

            {notificationFeedback && (
              <p className={`admin-notification-feedback ${notificationFeedback.type}`}>
                {notificationFeedback.message}
              </p>
            )}

            <div className="admin-notification-actions">
              <button type="button" className="admin-button admin-button-secondary" onClick={handlePreviewNotification}>
                <Eye size={15} /> Preview
              </button>
              <button type="submit" className="admin-button admin-button-primary" disabled={notificationSaving}>
                {notificationSaving
                  ? notificationForm.status === 'draft' ? 'Saving draft...' : 'Sending...'
                  : notificationForm.status === 'draft' ? 'Save Draft' : notificationForm.scheduledFor ? 'Schedule Notification' : 'Send Notification'}
              </button>
            </div>
          </form>

          <div className="admin-notification-preview">
            <div className="admin-notification-preview-header">
              <strong>Live preview</strong>
              <span>{notificationPreview ? 'Ready to send' : 'No preview yet'}</span>
            </div>

            {notificationPreview ? (
              <div className="admin-notification-preview-card">
                <div className="admin-notification-preview-meta">
                  <span className="admin-notification-badge admin-notification-badge-type">{notificationPreview.type}</span>
                  <span className="admin-notification-badge admin-notification-badge-priority">{notificationPreview.priority}</span>
                </div>

                <h4>{notificationPreview.title || 'Untitled notification'}</h4>
                {notificationPreview.imageUrl && <CropImage className="admin-notification-preview-image" src={notificationPreview.imageUrl} alt="Notification preview" />}
                <p>{notificationPreview.body || 'Your message will appear here.'}</p>

                <div className="admin-notification-preview-summary">
                  <div><small>Recipients</small><strong>{notificationPreview.recipientLabel}</strong></div>
                  <div><small>Schedule</small><strong>{notificationPreview.scheduledLabel}</strong></div>
                  <div><small>Expires</small><strong>{notificationPreview.expiryLabel}</strong></div>
                </div>
              </div>
            ) : (
              <div className="admin-empty-state admin-empty-preview">
                <BellRing size={32} />
                <strong>Preview your notification</strong>
                <span>Fill out the form and click preview to review the final message.</span>
              </div>
            )}
          </div>
        </div>

        <div className="admin-notification-management">
          <div className="admin-panel-header admin-notification-table-header">
            <div>
              <span className="admin-panel-eyebrow">Activity</span>
              <h3>Notification management</h3>
            </div>
            <span className="admin-notification-pill admin-notification-pill-secondary">{filteredNotifications.length} shown</span>
          </div>

          <div className="admin-filter-bar">
            <div className="admin-search-field">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search notifications"
                value={notificationFilters.search}
                onChange={(event) => setNotificationFilters((current) => ({ ...current, search: event.target.value }))}
              />
              <SearchClearButton value={notificationFilters.search} onClear={() => setNotificationFilters((current) => ({ ...current, search: '' }))} label="notification search" />
            </div>

            <label>
              Status
              <select
                value={notificationFilters.status}
                onChange={(event) => setNotificationFilters((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
              </select>
            </label>

            <label>
              Type
              <select
                value={notificationFilters.type}
                onChange={(event) => setNotificationFilters((current) => ({ ...current, type: event.target.value }))}
              >
                <option value="all">All</option>
                {notificationTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>

            <label>
              Priority
              <select
                value={notificationFilters.priority}
                onChange={(event) => setNotificationFilters((current) => ({ ...current, priority: event.target.value }))}
              >
                <option value="all">All</option>
                {notificationPriorities.map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </label>
          </div>

          {loadingNotifications ? (
            <div className="admin-empty-state">
              <Sparkles size={28} />
              <strong>Loading notifications...</strong>
            </div>
          ) : filteredNotifications.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Priority</th>
                    <th>Recipients</th>
                    <th>Sent by</th>
                    <th>Created</th>
                    <th>Scheduled</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredNotifications.map((notification) => (
                    <tr key={notification.id}>
                      <td>
                        <strong>{notification.title}</strong>
                      </td>
                      <td>{notification.type || 'general'}</td>
                      <td>{notification.priority || 'normal'}</td>
                      <td>{(notification.recipient_ids || []).length || (notification.recipient_scope === 'all_users' ? notificationRows.length : 0)}</td>
                      <td>{notification.created_by ? 'Admin' : 'System'}</td>
                      <td>
                        {notification.created_at
                          ? new Date(notification.created_at).toLocaleString([], {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '—'}
                      </td>
                      <td>
                        {notification.scheduled_for
                          ? new Date(notification.scheduled_for).toLocaleString([], {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '—'}
                      </td>
                      <td>
                        <span className={`admin-notification-status-badge admin-notification-status-${notification.status || 'sent'}`}>
                          {notification.status || 'sent'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-notification-action-stack">
                          <button type="button" className="admin-icon-btn" title="View" onClick={() => handleEditNotification(notification)}>
                            <Eye size={14} />
                          </button>
                          <button type="button" className="admin-icon-btn" title="Edit" onClick={() => handleEditNotification(notification)}>
                            <PencilLine size={14} />
                          </button>
                          <button type="button" className="admin-icon-btn" title="Duplicate" onClick={() => handleDuplicateNotification(notification)}>
                            <Copy size={14} />
                          </button>
                          <button type="button" className="admin-icon-btn" title="Resend" onClick={() => handleResendNotification(notification)}>
                            <RefreshCcw size={14} />
                          </button>
                          <button type="button" className="admin-icon-btn" title="Cancel scheduled" onClick={() => handleCancelScheduledNotification(notification)}>
                            <XCircle size={14} />
                          </button>
                          <button type="button" className="admin-icon-btn danger" title="Delete" onClick={() => handleDeleteNotification(notification.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty-state">
              <BellRing size={30} />
              <strong>No notifications match these filters.</strong>
              <span>Try widening your search or create a new announcement.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationsPage;

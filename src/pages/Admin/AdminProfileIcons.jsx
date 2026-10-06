import React, { useCallback, useEffect, useState } from 'react';
import { ImagePlus, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import { useAuth } from './AuthContext';
import { supabase } from '../../lib/supabase';
import { deleteProfileIcon, loadProfileIcons, uploadProfileIcon } from '../../services/profileIcons';

const AdminProfileIconsPage = () => {
  const { user } = useAuth();
  const [icons, setIcons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [iconName, setIconName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const showingBundledIcons = icons.some((icon) => icon.id.startsWith('bundled-'));

  const refreshIcons = useCallback(async () => {
    try {
      setIcons(await loadProfileIcons({ useBundledFallback: true }));
    } catch (error) {
      console.error('Failed to load profile icons:', error);
      setLoadError(error.message || 'Unable to load profile icons.');
    }
  }, []);

  useEffect(() => {
    let active = true;
    const loadInitialIcons = async () => {
      try {
        setIcons(await loadProfileIcons({ useBundledFallback: true }));
      } catch (error) {
        console.error('Failed to load profile icons:', error);
        setLoadError(error.message || 'Unable to load profile icons.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadInitialIcons();
    const channel = supabase?.channel('admin-profile-icons')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profile_icons' }, () => {
        void refreshIcons();
      })
      .subscribe();
    return () => {
      active = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [refreshIcons]);

  useEffect(() => {
    if (!previewUrl) return undefined;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null;
    event.target.value = '';
    setActionError('');
    setLoadError('');
    setSuccessMessage('');
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : '');
    setSelectedFile(nextFile);
    setIconName(nextFile?.name.replace(/\.[^.]+$/, '').slice(0, 80) || '');
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!selectedFile) return;

    setSaving(true);
    setActionError('');
    setLoadError('');
    setSuccessMessage('');
    try {
      await uploadProfileIcon(user?.id, selectedFile, iconName);
      setSelectedFile(null);
      setPreviewUrl('');
      setIconName('');
      setSuccessMessage('Profile icon added and available to users.');
      setLoading(true);
      await refreshIcons();
      setLoading(false);
    } catch (error) {
      console.error('Failed to add profile icon:', error);
      setActionError(error.message || 'Unable to upload this profile icon.');
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    setLoadError('');
    await refreshIcons();
    setLoading(false);
  };

  const handleDelete = async (icon) => {
    if (!window.confirm(`Delete "${icon.name}" from the available profile icons? Existing profiles using it will keep their image.`)) return;

    setDeletingId(icon.id);
    setActionError('');
    setSuccessMessage('');
    try {
      await deleteProfileIcon(icon.id);
      setIcons((currentIcons) => currentIcons.filter((item) => item.id !== icon.id));
      setSuccessMessage(`${icon.name} was removed from the available icons.`);
    } catch (error) {
      console.error('Failed to delete profile icon:', error);
      setActionError(error.message || 'Unable to delete this profile icon.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="admin-page-shell profile-icons-page">
      <div className="admin-header-row">
        <div>
          <p className="admin-kicker">Appearance</p>
          <h1>Profile Icons</h1>
          <p className="admin-header-copy">Manage the images members can choose for their profile photos.</p>
        </div>
        <button type="button" className="admin-button admin-button-secondary" onClick={() => void handleRefresh()} disabled={loading}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <section className="profile-icons-section">
        <div className="profile-icons-section-header">
          <div>
            <h2>Available profile icons</h2>
            <p>{loading ? 'Loading icons…' : `${icons.length} ${icons.length === 1 ? 'icon' : 'icons'} available`}</p>
          </div>
          <label className="admin-button admin-button-primary profile-icon-add-button">
            <ImagePlus size={16} /> Add Profile Icon
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileChange}
              aria-label="Choose profile icon image"
            />
          </label>
        </div>

        {actionError && <p className="profile-icon-feedback is-error" role="alert">{actionError}</p>}
        {successMessage && <p className="profile-icon-feedback is-success" role="status">{successMessage}</p>}
        {showingBundledIcons && (
          <p className="profile-icon-feedback" role="status">
            Showing built-in icons. Run <code>supabase/profile_icons.sql</code> in Supabase SQL Editor to enable uploads and database-managed icons.
          </p>
        )}

        {selectedFile && (
          <form className="profile-icon-upload-form" onSubmit={handleUpload}>
            <div className="profile-icon-upload-preview">
              <img src={previewUrl} alt="Preview of profile icon to upload" />
              <span>Preview</span>
            </div>
            <label className="profile-icon-name-field">
              <span>Icon name</span>
              <input maxLength={80} value={iconName} onChange={(event) => setIconName(event.target.value)} />
            </label>
            <div className="profile-icon-upload-actions">
              <button type="button" className="admin-button admin-button-secondary" onClick={() => { setPreviewUrl(''); setSelectedFile(null); }} disabled={saving}>
                <X size={15} /> Cancel
              </button>
              <button type="submit" className="admin-button admin-button-primary" disabled={saving}>
                <Upload size={15} /> {saving ? 'Uploading…' : 'Save Icon'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="profile-icons-empty"><span className="accounts-loading-mark" /><strong>Loading profile icons</strong></div>
        ) : loadError ? (
          <div className="profile-icons-empty"><strong>Couldn’t load profile icons</strong><p>{loadError}</p></div>
        ) : icons.length ? (
          <div className="profile-icons-grid">
            {icons.map((icon) => (
              <article key={icon.id} className="profile-icon-admin-card">
                <div className="profile-icon-admin-image"><img src={icon.image_url} alt={icon.name} loading="lazy" /></div>
                <div className="profile-icon-admin-details">
                  <strong title={icon.name}>{icon.name}</strong>
                  <span className="profile-icon-status"><i /> Available</span>
                </div>
                {icon.id.startsWith('bundled-') ? (
                  <span className="profile-icon-status">Built in</span>
                ) : (
                  <button
                    type="button"
                    className="profile-icon-delete-button"
                    onClick={() => void handleDelete(icon)}
                    disabled={deletingId === icon.id}
                  >
                    <Trash2 size={14} /> {deletingId === icon.id ? 'Deleting…' : 'Delete'}
                  </button>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="profile-icons-empty">
            <ImagePlus size={25} />
            <strong>No profile icons yet</strong>
            <p>Add an image to make it available in members’ Profile Photos.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminProfileIconsPage;

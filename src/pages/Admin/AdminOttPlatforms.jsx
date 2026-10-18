import React, { useCallback, useEffect, useState } from 'react';
import { Check, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { deleteOttPlatform, fetchOttPlatforms, saveOttPlatform } from '../../services/ottPlatforms';
import CropImage from '../../components/CropImage';
import ImageCropButton from '../../components/ImageCropButton';

const emptyPlatform = { name: '', logo_url: '', website_url: '', is_active: true };
const OttPlatformLogoPreview = ({ src, name }) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <span className="ott-platform-logo-preview-fallback">{failed ? 'Image could not be loaded' : 'Logo preview'}</span>;
  }

  return <CropImage src={src} alt={`${name || 'Platform'} logo preview`} onError={() => setFailed(true)} />;
};

const validHttpUrl = (value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const AdminOttPlatformsPage = () => {
  const [platforms, setPlatforms] = useState([]);
  const [form, setForm] = useState(emptyPlatform);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadPlatforms = useCallback(async () => {
    try {
      setPlatforms(await fetchOttPlatforms({ includeDisabled: true }));
    } catch (loadError) {
      console.error('Failed to load OTT platforms:', loadError);
      setError(loadError.message || 'Unable to load OTT platforms. Apply the ott_platforms.sql migration if it has not been run.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPlatforms(); }, [loadPlatforms]);

  const resetForm = () => {
    setForm(emptyPlatform);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    const name = form.name.trim();
    if (!name) {
      setError('Platform name is required.');
      return;
    }
    if (!validHttpUrl(form.logo_url.trim()) || !validHttpUrl(form.website_url.trim())) {
      setError('Logo and website URLs must use HTTP or HTTPS.');
      return;
    }
    setSaving(true);
    try {
      const saved = await saveOttPlatform({
        name,
        logo_url: form.logo_url.trim(),
        website_url: form.website_url.trim(),
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      }, editingId);
      setPlatforms((current) => editingId
        ? current.map((platform) => platform.id === saved.id ? saved : platform).sort((a, b) => a.name.localeCompare(b.name))
        : [...current, saved].sort((a, b) => a.name.localeCompare(b.name)));
      setMessage(`${saved.name} ${editingId ? 'updated' : 'added'} successfully.`);
      resetForm();
    } catch (saveError) {
      console.error('Failed to save OTT platform:', saveError);
      setError(saveError.message || 'Unable to save this OTT platform.');
    } finally {
      setSaving(false);
    }
  };

  const editPlatform = (platform) => {
    setEditingId(platform.id);
    setForm({
      name: platform.name,
      logo_url: platform.logo_url || '',
      website_url: platform.website_url || '',
      is_active: platform.is_active,
    });
    setError('');
    setMessage('');
  };

  const togglePlatform = async (platform) => {
    setActionId(platform.id);
    setError('');
    setMessage('');
    try {
      const saved = await saveOttPlatform({ is_active: !platform.is_active, updated_at: new Date().toISOString() }, platform.id);
      setPlatforms((current) => current.map((item) => item.id === saved.id ? saved : item));
      setMessage(`${saved.name} ${saved.is_active ? 'enabled' : 'disabled'}. Existing title availability is unchanged.`);
    } catch (toggleError) {
      console.error('Failed to update OTT platform status:', toggleError);
      setError(toggleError.message || 'Unable to update OTT platform status.');
    } finally {
      setActionId(null);
    }
  };

  const removePlatform = async (platform) => {
    if (!window.confirm(`Delete "${platform.name}" from the available platform list? Existing movie and TV Show details will keep their saved platform information.`)) return;
    setActionId(platform.id);
    setError('');
    setMessage('');
    try {
      await deleteOttPlatform(platform.id);
      setPlatforms((current) => current.filter((item) => item.id !== platform.id));
      if (editingId === platform.id) resetForm();
      setMessage(`${platform.name} deleted. Existing title availability is unchanged.`);
    } catch (deleteError) {
      console.error('Failed to delete OTT platform:', deleteError);
      setError(deleteError.message || 'Unable to delete this OTT platform.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="admin-page-shell ott-platforms-page">
      <div className="admin-header-row">
        <div>
          <p className="admin-kicker">Content settings</p>
          <h1>OTT Platforms</h1>
          <p className="admin-header-copy">Manage the shared platform list used by Movie and TV Show editors.</p>
        </div>
        <button type="button" className="admin-button admin-button-secondary" onClick={() => { setError(''); setLoading(true); void loadPlatforms(); }} disabled={loading}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {error && <p className="ott-platform-feedback is-error" role="alert">{error}</p>}
      {message && <p className="ott-platform-feedback is-success" role="status">{message}</p>}

      <section className="ott-platform-form-card">
        <h2>{editingId ? 'Edit OTT Platform' : 'Add OTT Platform'}</h2>
        <form className="movie-form-grid" onSubmit={handleSubmit}>
          <label><span>Platform Name *</span><input required maxLength={100} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="e.g. Netflix" /></label>
          <label className="ott-platform-logo-url-field">
            <span>Platform Logo URL</span>
            <input type="url" value={form.logo_url} onChange={(event) => setForm((current) => ({ ...current, logo_url: event.target.value }))} placeholder="https://..." />
            <small>Transparent PNG or SVG logos look best. If a checkerboard appears in this preview, it is part of the image.</small>
            <div className="ott-platform-logo-preview" aria-label="Platform logo preview">
              <OttPlatformLogoPreview key={form.logo_url.trim()} src={form.logo_url.trim()} name={form.name.trim()} />
            </div>
            {form.logo_url && <ImageCropButton source={form.logo_url} label="OTT platform logo" aspectRatio="original" />}
            {form.logo_url && <ImageCropButton source={form.logo_url} label="OTT platform logo" aspectRatio="original" />}
          </label>
          <label><span>Platform Website URL</span><input type="url" value={form.website_url} onChange={(event) => setForm((current) => ({ ...current, website_url: event.target.value }))} placeholder="https://..." /></label>
          <label className="ott-platform-active-toggle"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} /><span>Enabled for movie and TV Show forms</span></label>
          <div className="ott-platform-form-actions">
            {editingId && <button type="button" className="admin-button admin-button-secondary" onClick={resetForm}><X size={15} /> Cancel edit</button>}
            <button type="submit" className="admin-button admin-button-primary" disabled={saving}>
              {editingId ? <Check size={15} /> : <Plus size={15} />}{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Platform'}
            </button>
          </div>
        </form>
      </section>

      <section className="ott-platform-list-card">
        <div className="ott-platform-list-heading"><div><h2>Platform directory</h2><p>{platforms.filter((platform) => platform.is_active).length} enabled · {platforms.length} total</p></div></div>
        {loading ? <p className="ott-platform-empty">Loading OTT platforms…</p> : platforms.length === 0 ? (
          <p className="ott-platform-empty">No OTT platforms yet. Add one above to make it available in both title forms.</p>
        ) : (
          <div className="ott-platform-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Platform</th><th>Website</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{platforms.map((platform) => (
                <tr key={platform.id}>
                  <td><div className="ott-platform-table-name">{platform.logo_url ? <CropImage src={platform.logo_url} alt="" /> : <span>{platform.name.slice(0, 1).toUpperCase()}</span>}<strong>{platform.name}</strong></div></td>
                  <td>{platform.website_url ? <a href={platform.website_url} target="_blank" rel="noreferrer">{platform.website_url}</a> : '—'}</td>
                  <td><span className={`ott-platform-status ${platform.is_active ? 'is-active' : 'is-disabled'}`}>{platform.is_active ? 'Enabled' : 'Disabled'}</span></td>
                  <td><div className="ott-platform-actions">
                    <button type="button" className="admin-icon-btn" title="Edit platform" aria-label={`Edit ${platform.name}`} onClick={() => editPlatform(platform)}><Pencil size={15} /></button>
                    <button type="button" className="admin-button admin-button-secondary" onClick={() => void togglePlatform(platform)} disabled={actionId === platform.id}>{platform.is_active ? 'Disable' : 'Enable'}</button>
                    <button type="button" className="admin-icon-btn danger" title="Delete platform" aria-label={`Delete ${platform.name}`} onClick={() => void removePlatform(platform)} disabled={actionId === platform.id}><Trash2 size={15} /></button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminOttPlatformsPage;

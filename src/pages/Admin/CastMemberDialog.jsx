import React, { useEffect, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { saveCastMember, uploadCastMemberImage } from '../../services/castMembers';
import { deleteMovieStorageAsset } from '../../services/movieStorage';
import { useWatchlist } from './WatchlistContext';

const emptyDraft = {
  full_name: '', profession: 'Actor', biography: '', date_of_birth: '', nationality: '',
  instagram_url: '', x_url: '', facebook_url: '', website_url: '', other_social_links: '', profile_image: '',
};

const CastMemberDialog = ({ member, onClose, onSaved }) => {
  const { setToastMessage } = useWatchlist();
  const [draft, setDraft] = useState(emptyDraft);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (member) {
      setDraft({ ...emptyDraft, ...member, date_of_birth: member.date_of_birth || '', profile_image: member.profile_image || '' });
      setPreview(member.profile_image_url || member.profile_image || '');
    }
  }, [member]);

  const change = (field, value) => setDraft((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    let uploadedPath = '';
    let memberSaved = false;
    try {
      const previousImage = member?.profile_image || '';
      const profileImage = imageFile
        ? await uploadCastMemberImage(imageFile)
        : draft.profile_image;
      if (imageFile) uploadedPath = profileImage;
      const saved = await saveCastMember({ ...draft, profile_image: profileImage }, member?.id || null);
      memberSaved = true;
      if (previousImage && previousImage !== profileImage && previousImage.includes('/cast/')) {
        await deleteMovieStorageAsset(previousImage);
      }
      await onSaved(saved);
      setToastMessage({
        id: Date.now(),
        type: 'success',
        text: member ? `${saved.full_name} updated.` : `${saved.full_name} added to the Cast directory.`,
      });
      onClose();
    } catch (saveError) {
      console.error('Failed to save cast member:', saveError);
      const details = [saveError.details, saveError.hint].filter(Boolean).join(' ');
      const errorCode = saveError.code ? ` (code ${saveError.code})` : '';
      setError(`${saveError.message || 'Unable to save this cast member.'}${errorCode}${details ? ` ${details}` : ''}`);
      if (uploadedPath && !memberSaved) await deleteMovieStorageAsset(uploadedPath);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cast-dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section className="cast-dialog" role="dialog" aria-modal="true" aria-labelledby="cast-dialog-title">
        <header className="cast-dialog-header">
          <div><span>CAST DIRECTORY</span><h2 id="cast-dialog-title">{member ? 'Edit cast member' : 'Add new cast member'}</h2></div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close"><X size={19} /></button>
        </header>
        <form onSubmit={submit}>
          <div className="cast-dialog-grid">
            <label className="cast-image-field">
              <span>Profile image</span>
              <div className="cast-image-preview">{preview ? <img src={preview} alt="Cast profile preview" /> : <Camera size={26} />}</div>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setImageFile(file);
                change('profile_image', '');
                setPreview(URL.createObjectURL(file));
              }} />
              <input
                className="cast-image-url"
                type="url"
                value={imageFile ? '' : draft.profile_image}
                onChange={(event) => {
                  const value = event.target.value.trim();
                  setImageFile(null);
                  change('profile_image', value);
                  setPreview(value);
                }}
                placeholder="Or paste an image URL (https://...)"
                aria-label="Cast profile image URL"
              />
              <small>JPG, PNG or WEBP · up to 5 MB</small>
            </label>
            <div className="cast-dialog-fields">
              <label><span>Full name *</span><input required maxLength={120} value={draft.full_name} onChange={(event) => change('full_name', event.target.value)} placeholder="e.g. Raj Kumar" /></label>
              <div className="cast-dialog-row">
                <label><span>Profession</span><input value={draft.profession} onChange={(event) => change('profession', event.target.value)} placeholder="Actor" /></label>
                <label><span>Date of birth</span><input type="date" value={draft.date_of_birth} onChange={(event) => change('date_of_birth', event.target.value)} /></label>
              </div>
              <div className="cast-dialog-row">
                <label><span>Nationality</span><input value={draft.nationality} onChange={(event) => change('nationality', event.target.value)} /></label>
                <label><span>Instagram</span><input type="url" value={draft.instagram_url} onChange={(event) => change('instagram_url', event.target.value)} placeholder="https://..." /></label>
              </div>
            </div>
            <label className="cast-dialog-wide"><span>Biography</span><textarea rows="4" value={draft.biography} onChange={(event) => change('biography', event.target.value)} /></label>
            <div className="cast-dialog-row cast-dialog-wide">
              <label><span>X / Twitter</span><input type="url" value={draft.x_url} onChange={(event) => change('x_url', event.target.value)} placeholder="https://..." /></label>
              <label><span>Facebook</span><input type="url" value={draft.facebook_url} onChange={(event) => change('facebook_url', event.target.value)} placeholder="https://..." /></label>
            </div>
            <div className="cast-dialog-row cast-dialog-wide">
              <label><span>Website</span><input type="url" value={draft.website_url} onChange={(event) => change('website_url', event.target.value)} placeholder="https://..." /></label>
              <label><span>Other social links</span><input value={draft.other_social_links} onChange={(event) => change('other_social_links', event.target.value)} placeholder="One or more links" /></label>
            </div>
          </div>
          {error && <p className="cast-dialog-error" role="alert">{error}</p>}
          <footer className="cast-dialog-actions">
            <button type="button" className="admin-button admin-button-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="admin-button admin-button-primary" disabled={saving}>{saving ? 'Saving…' : member ? 'Save changes' : 'Create cast member'}</button>
          </footer>
        </form>
      </section>
    </div>
  );
};

export default CastMemberDialog;

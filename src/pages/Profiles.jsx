import React, { useCallback, useEffect, useState } from 'react';
import {
  Baby,
  Check,
  Film,
  LoaderCircle,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './Admin/AuthContext';
import ViewerProfileAvatar from '../components/ViewerProfileAvatar';
import { loadProfileIcons } from '../services/profileIcons';
import {
  createViewerProfile,
  deleteViewerProfile,
  loadViewerProfiles,
  MAX_VIEWER_PROFILES,
  updateViewerProfile,
} from '../services/viewerProfiles';

const BUILT_IN_AVATARS = [
  { id: 'avatar:ember', name: 'Ember', avatar_url: 'avatar:ember' },
  { id: 'avatar:kids', name: 'Playful', avatar_url: 'avatar:kids' },
  { id: 'avatar:comet', name: 'Cinema', avatar_url: 'avatar:comet' },
  { id: 'avatar:cat', name: 'Curious', avatar_url: 'avatar:cat' },
  { id: 'avatar:spark', name: 'Spark', avatar_url: 'avatar:spark' },
  { id: 'avatar:sun', name: 'Sunshine', avatar_url: 'avatar:sun' },
];

const getAccountProfileDefaults = (profile, user) => {
  const name = profile?.full_name?.trim()
    || user?.user_metadata?.full_name?.trim()
    || user?.email?.split('@')[0]
    || '';
  return {
    name: name.slice(0, 24),
    avatar_url: profile?.avatar_url || user?.user_metadata?.avatar_url || 'avatar:ember',
    is_kids: false,
  };
};

const ProfilesPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile: accountProfile, selectedViewerProfile, selectViewerProfile, signOut } = useAuth();
  const userId = user?.id;
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [icons, setIcons] = useState([]);
  const [iconsError, setIconsError] = useState('');
  const [dialogMode, setDialogMode] = useState('');
  const [editingId, setEditingId] = useState('');
  const [draft, setDraft] = useState({ name: '', avatar_url: 'avatar:ember', is_kids: false });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const refreshProfiles = useCallback(async () => {
    if (!userId) return;
    try {
      const loadedProfiles = await loadViewerProfiles(userId);
      setProfiles(loadedProfiles);
      setLoadError('');
    } catch (error) {
      console.error('Failed to load viewing profiles:', error);
      setLoadError(error.message || 'Unable to load profiles. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refreshProfiles();
  }, [refreshProfiles]);

  useEffect(() => {
    let active = true;
    loadProfileIcons({ useBundledFallback: true })
      .then((availableIcons) => {
        if (active) setIcons(availableIcons);
      })
      .catch((error) => {
        console.error('Failed to load profile avatar choices:', error);
        if (active) setIconsError(error.message || 'Profile photo choices could not be loaded.');
      });
    return () => { active = false; };
  }, []);

  const uniqueAvatarChoices = new Map(BUILT_IN_AVATARS.map((avatar) => [avatar.avatar_url, avatar]));
  icons.forEach((icon) => {
    if (icon.image_url) {
      uniqueAvatarChoices.set(icon.image_url, {
        id: icon.id,
        name: icon.name,
        avatar_url: icon.image_url,
      });
    }
  });
  const avatarChoices = [...uniqueAvatarChoices.values()];

  const closeDialog = () => {
    setDialogMode('');
    setEditingId('');
    setFormError('');
  };

  const openCreateDialog = () => {
    setDialogMode('create');
    setEditingId('');
    setDraft(profiles.length === 0
      ? getAccountProfileDefaults(accountProfile, user)
      : { name: '', avatar_url: 'avatar:ember', is_kids: false });
    setFormError('');
    setSuccessMessage('');
  };

  const openManageDialog = () => {
    const firstProfile = profiles[0];
    setDialogMode('manage');
    setEditingId(firstProfile?.id || '');
    setDraft(firstProfile
      ? { name: firstProfile.name, avatar_url: firstProfile.avatar_url, is_kids: firstProfile.is_kids }
      : { name: '', avatar_url: 'avatar:ember', is_kids: false });
    setFormError('');
    setSuccessMessage('');
  };

  const chooseProfile = (viewerProfile) => {
    selectViewerProfile(viewerProfile);
    navigate(location.state?.from?.pathname || '/', { replace: true });
  };

  const selectForEditing = (viewerProfile) => {
    setEditingId(viewerProfile.id);
    setDraft({
      name: viewerProfile.name,
      avatar_url: viewerProfile.avatar_url || 'avatar:ember',
      is_kids: viewerProfile.is_kids,
    });
    setFormError('');
    setSuccessMessage('');
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    const isCreating = dialogMode === 'create';
    setSaving(true);
    setFormError('');
    setSuccessMessage('');
    try {
      const savedProfile = isCreating
        ? await createViewerProfile(userId, draft)
        : await updateViewerProfile(userId, editingId, draft);
      setProfiles((current) => dialogMode === 'create'
        ? [...current, savedProfile]
        : current.map((item) => item.id === savedProfile.id ? savedProfile : item));
      if (isCreating) {
        selectViewerProfile(savedProfile);
        navigate(location.state?.from?.pathname || '/', { replace: true });
        return;
      }
      if (selectedViewerProfile?.id === savedProfile.id) selectViewerProfile(savedProfile);
      setDraft({
        name: savedProfile.name,
        avatar_url: savedProfile.avatar_url || 'avatar:ember',
        is_kids: savedProfile.is_kids,
      });
      setSuccessMessage('Profile saved successfully.');
    } catch (error) {
      console.error('Failed to save viewing profile:', error);
      setFormError(error.message || 'Unable to save this profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const removeProfile = async () => {
    const profileToDelete = profiles.find((item) => item.id === editingId);
    if (!profileToDelete) return;
    if (!window.confirm(`Delete "${profileToDelete.name}"? This cannot be undone.`)) return;

    setSaving(true);
    setFormError('');
    setSuccessMessage('');
    try {
      await deleteViewerProfile(userId, profileToDelete.id);
      setProfiles((current) => current.filter((item) => item.id !== profileToDelete.id));
      if (selectedViewerProfile?.id === profileToDelete.id) selectViewerProfile(null);
      const nextProfile = profiles.find((item) => item.id !== profileToDelete.id);
      setEditingId(nextProfile?.id || '');
      setDraft(nextProfile
        ? { name: nextProfile.name, avatar_url: nextProfile.avatar_url || 'avatar:ember', is_kids: nextProfile.is_kids }
        : { name: '', avatar_url: 'avatar:ember', is_kids: false });
      setSuccessMessage('Profile deleted.');
    } catch (error) {
      console.error('Failed to delete viewing profile:', error);
      setFormError(error.message || 'Unable to delete this profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Sign out failed:', error);
      setLoadError(error.message || 'Unable to sign out. Please try again.');
    }
  };

  const profileName = accountProfile?.full_name?.trim()
    || user?.user_metadata?.full_name?.trim()
    || user?.email?.split('@')[0]
    || '';

  return (
    <section className="viewer-selection-page">
      <div className="viewer-selection-ambience" aria-hidden="true" />
      <header className="viewer-selection-topbar">
        <span className="viewer-selection-brand"><Film size={21} /> Mythic<span>HQ</span></span>
        <button type="button" className="viewer-signout-button" onClick={handleSignOut}>Sign out</button>
      </header>

      <main className="viewer-selection-content">
        <div className="viewer-selection-eyebrow"><span /> YOUR CINEMA, YOUR WAY</div>
        <h1>Who&apos;s watching?</h1>
        <p className="viewer-selection-subtitle">
          {profileName ? `Welcome back, ${profileName}. Choose a profile to continue.` : 'Choose a profile to continue.'}
        </p>

        {loading ? (
          <div className="viewer-state-message" role="status">
            <LoaderCircle className="viewer-spinner" size={22} /> Loading your profiles…
          </div>
        ) : loadError ? (
          <div className="viewer-state-card" role="alert">
            <p>{loadError}</p>
            <button type="button" className="viewer-outline-button" onClick={() => {
              setLoading(true);
              void refreshProfiles();
            }}>Try again</button>
          </div>
        ) : profiles.length ? (
          <div className="viewer-profile-grid" aria-label="Choose a viewing profile">
            {profiles.map((viewerProfile, index) => (
              <button
                type="button"
                className={`viewer-profile-card ${selectedViewerProfile?.id === viewerProfile.id ? 'is-current' : ''}`}
                key={viewerProfile.id}
                style={{ '--profile-order': index }}
                onClick={() => chooseProfile(viewerProfile)}
              >
                <span className="viewer-card-avatar-wrap">
                  <ViewerProfileAvatar profile={viewerProfile} />
                  {viewerProfile.is_kids && <span className="viewer-kids-badge"><Baby size={12} /> Kids</span>}
                  <span className="viewer-card-check"><Check size={18} /></span>
                </span>
                <span className="viewer-card-name">{viewerProfile.name}</span>
              </button>
            ))}

            {profiles.length < MAX_VIEWER_PROFILES && (
              <button type="button" className="viewer-profile-card viewer-add-card" onClick={openCreateDialog}>
                <span className="viewer-add-avatar"><Plus size={39} strokeWidth={1.5} /></span>
                <span className="viewer-card-name">Add Profile</span>
              </button>
            )}
          </div>
        ) : (
          <div className="viewer-empty-state">
            <span className="viewer-empty-icon"><Sparkles size={24} /></span>
            <h2>Your watch space starts here</h2>
            <p>Create your first profile to personalize your MythicHQ experience.</p>
            <button type="button" className="viewer-primary-button" onClick={openCreateDialog}>
              <Plus size={17} /> Create a profile
            </button>
          </div>
        )}

        {!loading && !loadError && profiles.length > 0 && (
          <button type="button" className="viewer-manage-button" onClick={openManageDialog}>
            <Pencil size={15} /> Manage Profiles
          </button>
        )}
        {!loading && !loadError && profiles.length >= MAX_VIEWER_PROFILES && (
          <p className="viewer-profile-limit">You&apos;ve reached the {MAX_VIEWER_PROFILES}-profile limit.</p>
        )}
        {successMessage && !dialogMode && <p className="viewer-page-success" role="status">{successMessage}</p>}
      </main>

      <footer className="viewer-selection-footer"><ShieldCheck size={14} /> Your profiles are private to your account</footer>

      {dialogMode && (
        <div className="viewer-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) closeDialog();
        }}>
          <section className="viewer-dialog" role="dialog" aria-modal="true" aria-labelledby="viewer-dialog-title">
            <header className="viewer-dialog-header">
              <div>
                <span className="viewer-dialog-kicker">{dialogMode === 'create' ? 'MAKE IT YOURS' : 'PROFILE SETTINGS'}</span>
                <h2 id="viewer-dialog-title">{dialogMode === 'create' ? 'Add a profile' : 'Manage profiles'}</h2>
              </div>
              <button type="button" className="viewer-dialog-close" onClick={closeDialog} aria-label="Close" disabled={saving}><X size={19} /></button>
            </header>

            {dialogMode === 'manage' && profiles.length > 1 && (
              <div className="viewer-manage-tabs" aria-label="Choose a profile to edit">
                {profiles.map((viewerProfile) => (
                  <button
                    type="button"
                    className={editingId === viewerProfile.id ? 'is-active' : ''}
                    key={viewerProfile.id}
                    onClick={() => selectForEditing(viewerProfile)}
                  >
                    <ViewerProfileAvatar profile={viewerProfile} />
                    <span>{viewerProfile.name}</span>
                  </button>
                ))}
              </div>
            )}

            {dialogMode === 'manage' && !editingId ? (
              <div className="viewer-dialog-empty">
                <p>No profiles to manage yet.</p>
                <button type="button" className="viewer-primary-button" onClick={openCreateDialog}><Plus size={16} /> Add your first profile</button>
              </div>
            ) : (
              <form className="viewer-profile-form" onSubmit={saveProfile}>
                <label className="viewer-form-label">
                  Profile name
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                    placeholder="e.g. Movie Lover"
                    maxLength={24}
                    autoFocus
                    required
                  />
                </label>

                <fieldset className="viewer-avatar-picker">
                  <legend>Choose an avatar</legend>
                  {iconsError && <p className="viewer-avatar-error" role="status">Photo avatars unavailable: {iconsError}</p>}
                  <div className="viewer-avatar-options">
                    {avatarChoices.map((avatar) => {
                      const chosen = draft.avatar_url === avatar.avatar_url;
                      return (
                        <button
                          type="button"
                          className={`viewer-avatar-option ${chosen ? 'is-selected' : ''}`}
                          key={avatar.id}
                          onClick={() => setDraft((current) => ({ ...current, avatar_url: avatar.avatar_url }))}
                          aria-label={`Choose ${avatar.name} avatar`}
                          aria-pressed={chosen}
                        >
                          <ViewerProfileAvatar profile={{ avatar_url: avatar.avatar_url, is_kids: draft.is_kids }} />
                          {chosen && <span><Check size={13} /></span>}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <label className="viewer-kids-toggle">
                  <span className="viewer-kids-toggle-icon"><Baby size={19} /></span>
                  <span><strong>Kids profile</strong><small>Show a more family-friendly experience.</small></span>
                  <input
                    type="checkbox"
                    checked={draft.is_kids}
                    onChange={(event) => setDraft((current) => ({ ...current, is_kids: event.target.checked }))}
                  />
                </label>

                {formError && <p className="viewer-form-error" role="alert">{formError}</p>}
                {successMessage && <p className="viewer-form-success" role="status">{successMessage}</p>}

                <div className="viewer-dialog-actions">
                  {dialogMode === 'manage' && (
                    <button type="button" className="viewer-delete-button" onClick={() => void removeProfile()} disabled={saving}>
                      <Trash2 size={15} /> Delete
                    </button>
                  )}
                  <button type="button" className="viewer-cancel-button" onClick={closeDialog} disabled={saving}>Cancel</button>
                  <button type="submit" className="viewer-primary-button" disabled={saving}>
                    {saving ? <LoaderCircle className="viewer-spinner" size={16} /> : <Check size={16} />}
                    {saving ? 'Saving…' : 'Save profile'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </section>
  );
};

export default ProfilesPage;

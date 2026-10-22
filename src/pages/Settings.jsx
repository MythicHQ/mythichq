import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell, Check, ChevronRight, CircleHelp, Eye, Film, Globe2, Heart, LockKeyhole,
  Monitor, Moon, Palette, RotateCcw, Shield, SlidersHorizontal, UserRound, UserRoundCog,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './Admin/AuthContext';
import { supabase } from '../lib/supabase';
import {
  applyAppearanceSettings,
  DEFAULT_USER_SETTINGS,
  loadUserSettings,
  saveUserSettings,
  USER_SETTINGS_UPDATED_EVENT,
} from '../services/userSettings';
import { getProfileAvatarUrl } from '../services/profileIcons';

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy', icon: Shield },
  { id: 'movies', label: 'Movie taste', icon: Film },
  { id: 'account', label: 'Account & security', icon: LockKeyhole },
  { id: 'activity', label: 'Activity & help', icon: CircleHelp },
];

const GENRES = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Science Fiction', 'Thriller'];
const MOVIE_LANGUAGES = ['English', 'Hindi', 'Japanese', 'Korean', 'Spanish', 'French', 'Tamil', 'Telugu'];
const CATEGORIES = ['Movies', 'TV shows', 'Documentaries', 'Animation'];
const ACCENTS = [
  { value: 'crimson', label: 'Crimson', color: '#e33b46' },
  { value: 'violet', label: 'Violet', color: '#8b5cf6' },
  { value: 'teal', label: 'Teal', color: '#14b8a6' },
  { value: 'amber', label: 'Amber', color: '#f59e0b' },
];

const settingsEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, profile, updateProfile, signOut, resetPassword } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_USER_SETTINGS);
  const [savedSettings, setSavedSettings] = useState(DEFAULT_USER_SETTINGS);
  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name || '',
    username: profile?.username || '',
    bio: profile?.bio || '',
    instagram_url: profile?.instagram_url || '',
    youtube_url: profile?.youtube_url || '',
    x_url: profile?.x_url || '',
    website_url: profile?.website_url || '',
  });
  const [savedProfileForm, setSavedProfileForm] = useState(profileForm);
  const [avatarFile, setAvatarFile] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [activeSection, setActiveSection] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const fileInputRef = useRef(null);

  const settingsDirty = !settingsEqual(settings, savedSettings);
  const profileDirty = !settingsEqual(profileForm, savedProfileForm) || Boolean(avatarFile) || removeAvatar;
  const isDirty = settingsDirty || profileDirty;

  useEffect(() => {
    setProfileForm({
      full_name: profile?.full_name || '',
      username: profile?.username || '',
      bio: profile?.bio || '',
      instagram_url: profile?.instagram_url || '',
      youtube_url: profile?.youtube_url || '',
      x_url: profile?.x_url || '',
      website_url: profile?.website_url || '',
    });
    setSavedProfileForm({
      full_name: profile?.full_name || '',
      username: profile?.username || '',
      bio: profile?.bio || '',
      instagram_url: profile?.instagram_url || '',
      youtube_url: profile?.youtube_url || '',
      x_url: profile?.x_url || '',
      website_url: profile?.website_url || '',
    });
  }, [profile]);

  useEffect(() => {
    let active = true;
    loadUserSettings(user.id)
      .then((loaded) => {
        if (!active) return;
        setSettings(loaded);
        setSavedSettings(loaded);
        applyAppearanceSettings(loaded.appearance);
      })
      .catch((error) => {
        if (active) setFeedback({ type: 'error', message: error.message || 'Unable to load your settings.' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [user.id]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (settings.appearance) applyAppearanceSettings(settings.appearance);
  }, [settings.appearance]);

  const avatarUrl = useMemo(
    () => avatarPreview || getProfileAvatarUrl(profile, user),
    [avatarPreview, profile, user],
  );

  const changeSetting = (group, key, value) => {
    setSettings((current) => ({
      ...current,
      [group]: { ...current[group], [key]: value },
    }));
  };

  const saveAll = async (event) => {
    event.preventDefault();
    setFeedback(null);
    setSaving(true);
    try {
      let nextAvatarUrl = profile?.avatar_url || null;
      let nextAvatarSource = profile?.avatar_source || null;
      if (avatarFile) {
        const extension = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from('profile-avatars')
          .upload(path, avatarFile, { upsert: false, contentType: avatarFile.type });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('profile-avatars').getPublicUrl(path);
        nextAvatarUrl = data.publicUrl;
        nextAvatarSource = 'upload';
      }
      if (removeAvatar) {
        nextAvatarUrl = null;
        nextAvatarSource = null;
      }

      if (profileDirty) {
        const username = profileForm.username.trim();
        if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{2,19}$/.test(username)) {
          throw new Error('Username must be 3–20 characters and use letters, numbers, dots, dashes, or underscores.');
        }
        const { data: available, error: usernameError } = await supabase.rpc('is_profile_username_available', { candidate: username });
        if (usernameError) throw usernameError;
        if (!available) throw new Error('That username is already taken. Try another one.');
        if (profileForm.bio.trim().length > 220) throw new Error('Your bio must be 220 characters or fewer.');
        for (const [field, value] of Object.entries(profileForm)) {
          if (field.endsWith('_url') && value.trim()) {
            let parsed;
            try {
              parsed = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`);
            } catch {
              throw new Error(`Enter a valid web address for ${field.replace('_url', '').replace('_', ' ')}.`);
            }
            if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Social links must use HTTP or HTTPS.');
          }
        }
        const updatedProfile = await updateProfile({
          ...profileForm,
          username,
          full_name: profileForm.full_name.trim(),
          bio: profileForm.bio.trim(),
          instagram_url: profileForm.instagram_url.trim(),
          youtube_url: profileForm.youtube_url.trim(),
          x_url: profileForm.x_url.trim(),
          website_url: profileForm.website_url.trim(),
          ...(avatarFile || removeAvatar ? { avatar_url: nextAvatarUrl, avatar_source: nextAvatarSource } : {}),
        });
        if (!updatedProfile) throw new Error('Your profile could not be saved. Refresh and try again.');
      }

      let persistedSettings = savedSettings;
      if (settingsDirty) {
        persistedSettings = await saveUserSettings(user.id, settings);
        setSettings(persistedSettings);
        setSavedSettings(persistedSettings);
        window.localStorage.setItem('mythichq:user-settings', JSON.stringify(persistedSettings));
        window.dispatchEvent(new CustomEvent(USER_SETTINGS_UPDATED_EVENT, { detail: persistedSettings }));
      }
      setSavedProfileForm(profileForm);
      setAvatarFile(null);
      setRemoveAvatar(false);
      setFeedback({ type: 'success', message: 'Your changes have been saved.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to save your changes.' });
    } finally {
      setSaving(false);
    }
  };

  const cancelChanges = () => {
    if (isDirty && !window.confirm('Discard your unsaved changes?')) return;
    setSettings(savedSettings);
    setProfileForm(savedProfileForm);
    setAvatarFile(null);
    setRemoveAvatar(false);
    setFeedback(null);
  };

  const updateEmail = async () => {
    if (!supabase || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFeedback({ type: 'error', message: 'Enter a valid email address.' });
      return;
    }
    setEmailBusy(true);
    setFeedback(null);
    try {
      const { error } = await supabase.auth.updateUser({ email: email.trim() });
      if (error) throw error;
      setFeedback({ type: 'success', message: 'Check your inbox to confirm the email address change.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to update your email.' });
    } finally {
      setEmailBusy(false);
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 8) {
      setFeedback({ type: 'error', message: 'Use a password with at least 8 characters.' });
      return;
    }
    setPasswordBusy(true);
    setFeedback(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setFeedback({ type: 'success', message: 'Your password has been updated.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to update your password.' });
    } finally {
      setPasswordBusy(false);
    }
  };

  const sendPasswordReset = async () => {
    setFeedback(null);
    try {
      await resetPassword(user.email);
      setFeedback({ type: 'success', message: 'If your email is verified, a password reset link has been sent.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to send a reset email.' });
    }
  };

  const handleSignOut = async () => {
    if (isDirty && !window.confirm('You have unsaved changes. Sign out anyway?')) return;
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Unable to sign out.' });
    }
  };

  const toggleChoice = (group, key, value) => {
    const selected = settings[group][key];
    changeSetting(group, key, selected.includes(value)
      ? selected.filter((entry) => entry !== value)
      : [...selected, value]);
  };

  const profileField = (label, key, type = 'text', hint = '') => (
    <label className="settings-field" key={key}>
      <span>{label}</span>
      <input
        type={type}
        value={profileForm[key]}
        maxLength={key === 'bio' ? 220 : undefined}
        onChange={(event) => setProfileForm((current) => ({ ...current, [key]: event.target.value }))}
      />
      {hint && <small>{hint}</small>}
    </label>
  );

  if (loading) {
    return <main className="settings-page page-container"><div className="settings-loading" role="status">Loading your settings…</div></main>;
  }

  return (
    <main className="settings-page page-container">
      <header className="settings-heading">
        <div className="settings-heading-copy">
          <span className="settings-kicker"><span /> ACCOUNT CONTROL ROOM</span>
          <h1>Make it <em>yours.</em></h1>
          <p>Your preferences, privacy, and profile — all in one place.</p>
        </div>
        <div className="settings-heading-account">
          <img src={avatarUrl} alt="" />
          <span><strong>{profile?.full_name || profile?.username || 'Your account'}</strong><small>@{profile?.username || 'mythichq'}</small></span>
          <Link to="/profile" className="settings-profile-preview"><Eye size={16} /> Profile</Link>
        </div>
      </header>

      {feedback && <div className={`settings-feedback is-${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>{feedback.type === 'success' && <Check size={17} />}{feedback.message}</div>}

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          <span className="settings-nav-label">YOUR SPACE</span>
          {SECTIONS.map(({ id, label, icon: Icon }, index) => (
            <button key={id} type="button" aria-current={activeSection === id ? 'page' : undefined} className={activeSection === id ? 'is-active' : ''} onClick={() => setActiveSection(id)}>
              <span className="settings-nav-index">{String(index + 1).padStart(2, '0')}</span><Icon size={17} /><span>{label}</span><ChevronRight size={15} />
            </button>
          ))}
          <div className="settings-nav-footer"><span className="settings-status-light" /> Your account is protected</div>
        </nav>

        <div className="settings-content">
          {activeSection === 'profile' && (
            <section className="settings-panel">
              <SectionHeading icon={UserRoundCog} title="Profile details" description="Update how other movie fans see you." />
              <div className="settings-avatar-row">
                <img src={avatarUrl} alt="" />
                <div><strong>Profile picture</strong><span>Choose a JPG, PNG, or WebP image up to 5 MB.</span></div>
                <input ref={fileInputRef} className="settings-hidden-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file && (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024)) {
                    setFeedback({ type: 'error', message: 'Choose an image no larger than 5 MB.' });
                  } else if (file) {
                    setAvatarFile(file);
                    setRemoveAvatar(false);
                    setFeedback(null);
                  }
                  event.target.value = '';
                }} />
                <button type="button" className="settings-button settings-button-secondary" onClick={() => fileInputRef.current?.click()}>Change photo</button>
                {profile?.avatar_url && <button type="button" className="settings-text-button" onClick={() => {
                  setAvatarFile(null);
                  setRemoveAvatar(true);
                  setFeedback(null);
                }}>Remove</button>}
              </div>
              <div className="settings-form-grid">
                {profileField('Full name', 'full_name')}
                {profileField('Username', 'username', 'text', '3–20 letters, numbers, dots, dashes, or underscores.')}
                <label className="settings-field settings-field-wide"><span>Bio</span><textarea rows="4" maxLength="220" value={profileForm.bio} onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))} /><small>{profileForm.bio.length}/220 characters</small></label>
                {profileField('Instagram URL', 'instagram_url', 'url')}
                {profileField('YouTube URL', 'youtube_url', 'url')}
                {profileField('X URL', 'x_url', 'url')}
                {profileField('Website', 'website_url', 'url')}
              </div>
            </section>
          )}

          {activeSection === 'appearance' && (
            <section className="settings-panel">
              <SectionHeading icon={SlidersHorizontal} title="Appearance & preferences" description="Tune the look and feel of your MythicHQ experience." />
              <SettingsGroup title="Theme">
                <div className="settings-choice-grid">
                  {[['dark', 'Dark', Moon], ['cinema', 'Cinema', Film], ['system', 'System', Monitor]].map(([value, label, Icon]) => (
                    <ChoiceButton key={value} selected={settings.appearance.theme === value} onClick={() => changeSetting('appearance', 'theme', value)} icon={Icon} label={label} />
                  ))}
                </div>
              </SettingsGroup>
              <SettingsGroup title="Accent color">
                <div className="settings-accent-row">{ACCENTS.map((accent) => <button key={accent.value} type="button" aria-label={`${accent.label} accent`} aria-pressed={settings.appearance.accent === accent.value} className={settings.appearance.accent === accent.value ? 'is-selected' : ''} style={{ '--settings-accent': accent.color }} onClick={() => changeSetting('appearance', 'accent', accent.value)}><span />{accent.label}</button>)}</div>
              </SettingsGroup>
              <SettingsGroup title="Language and browsing">
                <div className="settings-form-grid">
                  <label className="settings-field"><span><Globe2 size={14} /> Language</span><select value={settings.appearance.language} onChange={(event) => changeSetting('appearance', 'language', event.target.value)}><option value="en">English</option></select><small>Additional interface languages are not available yet.</small></label>
                  <label className="settings-field"><span>Movie browsing layout</span><select value={settings.appearance.layout} onChange={(event) => changeSetting('appearance', 'layout', event.target.value)}><option value="grid">Poster grid</option><option value="compact">Compact list</option></select></label>
                </div>
              </SettingsGroup>
              <SettingsGroup title="Playback & accessibility">
                <SettingToggle title="Autoplay trailers" description="Start trailers automatically when opened. Off by default." checked={settings.appearance.trailerAutoplay} onChange={(value) => changeSetting('appearance', 'trailerAutoplay', value)} />
                <SettingToggle title="Reduce motion" description="Reduce non-essential animations and transitions." checked={settings.appearance.reducedMotion} onChange={(value) => changeSetting('appearance', 'reducedMotion', value)} />
              </SettingsGroup>
            </section>
          )}

          {activeSection === 'notifications' && (
            <section className="settings-panel">
              <SectionHeading icon={Bell} title="Notifications" description="Choose which in-app updates you want to receive." />
              <div className="settings-note">Email notifications are not currently supported. These preferences apply to in-app notifications.</div>
              <SettingToggle title="Review replies" description="When someone replies to one of your reviews." checked={settings.notifications.reviewReplies} onChange={(value) => changeSetting('notifications', 'reviewReplies', value)} />
              <SettingToggle title="Likes and reactions" description="When someone reacts to one of your reviews." checked={settings.notifications.reviewReactions} onChange={(value) => changeSetting('notifications', 'reviewReactions', value)} />
              <SettingToggle title="New followers" description="When someone follows your profile." checked={settings.notifications.newFollowers} onChange={(value) => changeSetting('notifications', 'newFollowers', value)} />
              <SettingToggle title="Movie recommendations" description="Occasional picks based on your movie preferences." checked={settings.notifications.recommendations} onChange={(value) => changeSetting('notifications', 'recommendations', value)} />
              <SettingToggle title="Website announcements" description="Important MythicHQ news and service updates." checked={settings.notifications.announcements} onChange={(value) => changeSetting('notifications', 'announcements', value)} />
            </section>
          )}

          {activeSection === 'privacy' && (
            <section className="settings-panel">
              <SectionHeading icon={Shield} title="Privacy" description="Manage what other signed-in MythicHQ members can see." />
              <SettingToggle title="Public profile" description="Allow other members to find and view your profile." checked={settings.privacy.profilePublic} onChange={(value) => changeSetting('privacy', 'profilePublic', value)} />
              <SettingToggle title="Reviews on your public profile" description="Show your reviews on your profile page." checked={settings.privacy.reviewsPublic} onChange={(value) => changeSetting('privacy', 'reviewsPublic', value)} />
              <div className="settings-note settings-note-warning"><Eye size={16} /> Watchlists and liked movies are not publicly browsable in MythicHQ, so no visibility controls are offered for them here.</div>
            </section>
          )}

          {activeSection === 'movies' && (
            <section className="settings-panel">
              <SectionHeading icon={Film} title="Your movie taste" description="Save your favorite genres and formats for discovery." />
              <ChipGroup title="Favorite genres" choices={GENRES} selected={settings.movies.genres} onToggle={(value) => toggleChoice('movies', 'genres', value)} />
              <ChipGroup title="Preferred movie languages" choices={MOVIE_LANGUAGES} selected={settings.movies.languages} onToggle={(value) => toggleChoice('movies', 'languages', value)} />
              <ChipGroup title="Favorite categories" choices={CATEGORIES} selected={settings.movies.categories} onToggle={(value) => toggleChoice('movies', 'categories', value)} />
              <SettingToggle title="Personalized recommendations" description="Use your selected tastes where personalized discovery is available." checked={settings.movies.personalizedRecommendations} onChange={(value) => changeSetting('movies', 'personalizedRecommendations', value)} />
              <button type="button" className="settings-text-button settings-reset-button" onClick={() => {
                if (!window.confirm('Reset all your movie preferences?')) return;
                setSettings((current) => ({ ...current, movies: { ...DEFAULT_USER_SETTINGS.movies } }));
              }}><RotateCcw size={15} /> Reset movie preferences</button>
            </section>
          )}

          {activeSection === 'account' && (
            <section className="settings-panel">
              <SectionHeading icon={LockKeyhole} title="Account & security" description="Manage your sign-in details and account access." />
              <div className="settings-inline-form"><label className="settings-field"><span>Email address</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><button type="button" className="settings-button settings-button-secondary" disabled={emailBusy} onClick={() => void updateEmail()}>{emailBusy ? 'Sending…' : 'Update email'}</button></div>
              <p className="settings-hint">Supabase will send a verification email before the new address takes effect.</p>
              <div className="settings-inline-form"><label className="settings-field"><span>New password</span><input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="At least 8 characters" /></label><button type="button" className="settings-button settings-button-secondary" disabled={passwordBusy || !newPassword} onClick={() => void changePassword()}>{passwordBusy ? 'Updating…' : 'Change password'}</button></div>
              <button type="button" className="settings-text-button" onClick={() => void sendPasswordReset()}>Email me a password reset link</button>
              <div className="settings-account-meta"><div><span>Sign-in provider</span><strong>{user?.app_metadata?.provider === 'google' ? 'Google' : 'Email and password'}</strong></div><div><span>Member since</span><strong>{user?.created_at ? new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(user.created_at)) : 'Unavailable'}</strong></div></div>
              {user?.app_metadata?.provider === 'google' && <p className="settings-hint">Manage Google sign-in and password through your Google account.</p>}
              <button type="button" className="settings-button settings-button-danger" onClick={() => void handleSignOut()}>Sign out of this account</button>
              <p className="settings-hint">Other sessions and account deletion require secure server-side support and are not enabled in this project.</p>
            </section>
          )}

          {activeSection === 'activity' && (
            <section className="settings-panel">
              <SectionHeading icon={CircleHelp} title="Activity & help" description="Quick access to your MythicHQ activity and support." />
              <div className="settings-link-list">
                <Link to="/profile"><Heart size={17} /> My reviews, likes & profile activity <ChevronRight size={16} /></Link>
                <Link to="/watchlist"><Film size={17} /> My watchlist <ChevronRight size={16} /></Link>
                <Link to="/help"><CircleHelp size={17} /> Frequently asked questions <ChevronRight size={16} /></Link>
                <Link to="/contact"><Bell size={17} /> Contact support or report a bug <ChevronRight size={16} /></Link>
                <Link to="/privacy-policy"><Shield size={17} /> Privacy policy <ChevronRight size={16} /></Link>
                <Link to="/terms-of-service"><LockKeyhole size={17} /> Terms of service <ChevronRight size={16} /></Link>
                <Link to="/about"><Film size={17} /> About MythicHQ <ChevronRight size={16} /></Link>
              </div>
            </section>
          )}

          <div className="settings-actions">
            <span>{isDirty ? 'You have unsaved changes.' : 'All changes saved.'}</span>
            {isDirty && <button type="button" className="settings-button settings-button-secondary" onClick={cancelChanges} disabled={saving}>Cancel</button>}
            <button type="button" className="settings-button settings-button-primary" disabled={saving || !isDirty} onClick={() => void saveAll({ preventDefault: () => {} })}>{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </div>
      </div>
    </main>
  );
};

const SectionHeading = ({ icon: Icon, title, description }) => (
  <header className="settings-section-heading"><span><Icon size={19} /></span><div><h2>{title}</h2><p>{description}</p></div></header>
);

const SettingsGroup = ({ title, children }) => <div className="settings-group"><h3>{title}</h3>{children}</div>;

const ChoiceButton = ({ selected, onClick, icon: Icon, label }) => (
  <button type="button" className={`settings-choice${selected ? ' is-selected' : ''}`} aria-pressed={selected} onClick={onClick}><Icon size={18} /><span>{label}</span>{selected && <Check size={16} />}</button>
);

const SettingToggle = ({ title, description, checked, onChange }) => (
  <label className="settings-toggle-row"><span><strong>{title}</strong><small>{description}</small></span><input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i aria-hidden="true" /></label>
);

const ChipGroup = ({ title, choices, selected, onToggle }) => (
  <div className="settings-group"><h3>{title}</h3><div className="settings-chip-list">{choices.map((choice) => <button type="button" key={choice} className={selected.includes(choice) ? 'is-selected' : ''} aria-pressed={selected.includes(choice)} onClick={() => onToggle(choice)}>{choice}</button>)}</div></div>
);

export default SettingsPage;

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Film, LoaderCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Admin/AuthContext';
import { checkProfileUsernameAvailability, loadProfileIcons } from '../../services/profileIcons';

const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{2,19}$/;

const ProfileSetupPage = () => {
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();
  const [icons, setIcons] = useState([]);
  const [iconsLoading, setIconsLoading] = useState(true);
  const [iconsError, setIconsError] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [username, setUsername] = useState(profile?.username || '');
  const [fullName, setFullName] = useState(profile?.full_name || user?.user_metadata?.full_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const [usernameError, setUsernameError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const loadIcons = async () => {
      try {
        const availableIcons = await loadProfileIcons({ useBundledFallback: true });
        if (active) {
          setIcons(availableIcons);
          if (availableIcons.length) {
            setAvatarUrl(availableIcons[0].image_url);
          }
        }
      } catch (error) {
        console.error('Failed to load profile icons for onboarding:', error);
        if (active) setIconsError(error.message || 'Unable to load profile images.');
      } finally {
        if (active) setIconsLoading(false);
      }
    };
    void loadIcons();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const normalizedUsername = username.trim();
    if (!normalizedUsername || !USERNAME_PATTERN.test(normalizedUsername)) return undefined;

    let active = true;
    const timeoutId = window.setTimeout(async () => {
      try {
        const available = await checkProfileUsernameAvailability(normalizedUsername);
        if (active) {
          setUsernameStatus(available ? 'available' : 'taken');
          setUsernameError(available ? '' : 'That username is already taken.');
        }
      } catch (error) {
        console.error('Failed to check profile username availability:', error);
        if (active) {
          setUsernameStatus('error');
          setUsernameError(error.message || 'Unable to check username availability.');
        }
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [username]);

  const usernameHint = useMemo(() => {
    if (usernameStatus === 'checking') return 'Checking availability…';
    if (usernameStatus === 'available') return 'Username is available.';
    return usernameError;
  }, [usernameError, usernameStatus]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    const normalizedUsername = username.trim();

    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      setUsernameStatus('invalid');
      setUsernameError('Use 3–20 letters, numbers, dots, dashes, or underscores. Start with a letter or number.');
      return;
    }
    if (!avatarUrl) {
      setFormError('Choose a profile image to continue.');
      return;
    }

    setSubmitting(true);
    try {
      const available = await checkProfileUsernameAvailability(normalizedUsername);
      if (!available) {
        setUsernameStatus('taken');
        setUsernameError('That username is already taken.');
        return;
      }

      const savedProfile = await updateProfile({
        username: normalizedUsername,
        full_name: fullName.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl,
        profile_completed: true,
      });
      if (!savedProfile?.profile_completed) {
        throw new Error('Your profile could not be confirmed as complete. Please try again.');
      }
      navigate('/profiles', { replace: true });
    } catch (error) {
      console.error('Failed to complete profile setup:', error);
      if (error.code === '23505') {
        setUsernameStatus('taken');
        setUsernameError('That username was just claimed. Please choose another.');
      } else {
        setFormError(error.message || 'Unable to save your profile. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="profile-setup-page">
      <main className="profile-setup-card">
        <header className="profile-setup-heading">
          <span className="profile-setup-brand"><Film size={18} /> MythicHQ</span>
          <span className="auth-badge">Your first stop</span>
          <h1>Welcome{fullName.trim() ? `, ${fullName.trim().split(/\s+/)[0]}` : ''} 👋</h1>
          <p>Let’s set up your profile so your movie space feels like yours.</p>
        </header>

        <form className="profile-setup-form" onSubmit={handleSubmit}>
          <section className="profile-setup-section" aria-labelledby="setup-photo-heading">
            <div className="profile-setup-section-heading">
              <div>
                <h2 id="setup-photo-heading">Choose your profile image</h2>
                <p>This image will be used for your avatar across MythicHQ.</p>
              </div>
              {avatarUrl && <img className="profile-setup-selected-avatar" src={avatarUrl} alt="Selected profile preview" />}
            </div>
            {iconsLoading ? (
              <p className="profile-setup-message"><LoaderCircle className="profile-setup-spinner" size={16} /> Loading profile images…</p>
            ) : iconsError ? (
              <p className="profile-setup-message is-error" role="alert">{iconsError}</p>
            ) : icons.length ? (
              <div className="profile-setup-icons">
                {icons.map((icon) => {
                  const selected = avatarUrl === icon.image_url;
                  return (
                    <button
                      type="button"
                      key={icon.id}
                      className={`profile-setup-icon ${selected ? 'is-selected' : ''}`}
                      onClick={() => { setAvatarUrl(icon.image_url); setFormError(''); }}
                      aria-label={`Choose ${icon.name} profile image`}
                      aria-pressed={selected}
                    >
                      <img src={icon.image_url} alt="" />
                      {selected && <span><Check size={13} /> Selected</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="profile-setup-message is-error" role="alert">No profile images are available right now. Please contact support.</p>
            )}
          </section>

          <section className="profile-setup-section">
            <div className="profile-setup-section-heading">
              <div>
                <h2>Profile details</h2>
                <p>You can update these details any time from your profile.</p>
              </div>
            </div>

            <div className="profile-setup-fields">
              <label className="profile-setup-field">
                <span>Username <i>Required</i></span>
                <input
                  type="text"
                  autoComplete="username"
                  maxLength={20}
                  placeholder="Enter your username"
                  value={username}
                  onChange={(event) => {
                    const nextUsername = event.target.value;
                    setUsername(nextUsername);
                    if (!nextUsername.trim()) {
                      setUsernameStatus('idle');
                      setUsernameError('');
                    } else if (USERNAME_PATTERN.test(nextUsername.trim())) {
                      setUsernameStatus('checking');
                      setUsernameError('');
                    } else {
                      setUsernameStatus('invalid');
                      setUsernameError('Use 3–20 letters, numbers, dots, dashes, or underscores. Start with a letter or number.');
                    }
                  }}
                  aria-invalid={['invalid', 'taken', 'error'].includes(usernameStatus)}
                  aria-describedby="profile-setup-username-help"
                  required
                />
                <small id="profile-setup-username-help" className={`profile-setup-hint is-${usernameStatus}`} aria-live="polite">
                  {usernameHint || '3–20 characters. Letters, numbers, dots, dashes, and underscores.'}
                </small>
              </label>

              <label className="profile-setup-field">
                <span>Full name <i>Optional</i></span>
                <input type="text" autoComplete="name" maxLength={100} placeholder="Enter your full name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </label>

              <label className="profile-setup-field">
                <span>Bio <i>Optional</i></span>
                <textarea rows={3} maxLength={220} placeholder="Tell us a little about yourself..." value={bio} onChange={(event) => setBio(event.target.value)} />
                <small className="profile-setup-hint">{bio.length}/220</small>
              </label>

              <label className="profile-setup-field">
                <span>Email</span>
                <input type="email" value={user?.email || ''} readOnly disabled />
                <small className="profile-setup-hint">Connected to your sign-in account.</small>
              </label>
            </div>
          </section>

          {formError && <p className="profile-setup-form-error" role="alert">{formError}</p>}
          <button className="profile-setup-submit" type="submit" disabled={submitting || iconsLoading || !icons.length}>
            {submitting ? 'Saving your profile…' : 'Complete Profile'}
          </button>
          <p className="profile-setup-footnote">Your username is checked for availability before it’s saved.</p>
        </form>
      </main>
    </div>
  );
};

export default ProfileSetupPage;

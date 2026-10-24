import React, { useEffect, useState } from 'react';
import { Check, LoaderCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './Admin/AuthContext';
import BrandMark from '../components/BrandMark';
import { updateViewerProfile } from '../services/viewerProfiles';

const GENRES = ['Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Science Fiction', 'Thriller'];

export default function ProfileOnboarding() {
  const navigate = useNavigate();
  const { user, selectedViewerProfile, selectViewerProfile } = useAuth();
  const [genres, setGenres] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedViewerProfile) navigate('/profiles', { replace: true });
  }, [navigate, selectedViewerProfile]);

  const finish = async () => {
    if (!selectedViewerProfile?.id || !user?.id) {
      navigate('/profiles', { replace: true });
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await updateViewerProfile(user.id, selectedViewerProfile.id, {
        ...selectedViewerProfile,
        onboarding_completed: true,
        favorite_genres: genres.join(', '),
      });
      selectViewerProfile(updated);
      navigate('/', { replace: true });
    } catch (saveError) {
      setError(saveError.message || 'Could not save this profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="viewer-onboarding-page">
      <section className="viewer-onboarding-card">
        <span className="viewer-onboarding-brand"><BrandMark /> Mythic<span>HQ</span></span>
        <span className="viewer-onboarding-icon"><Sparkles size={22} /></span>
        <p className="viewer-onboarding-kicker">A FRESH START</p>
        <h1>Welcome, {selectedViewerProfile?.name || 'movie lover'}.</h1>
        <p className="viewer-onboarding-copy">This profile starts with its own empty watchlist. Pick a few genres to personalize what you discover.</p>
        <fieldset className="viewer-onboarding-genres">
          <legend>What do you enjoy?</legend>
          {GENRES.map((genre) => {
            const active = genres.includes(genre);
            return <button type="button" key={genre} className={active ? 'is-selected' : ''} aria-pressed={active} onClick={() => setGenres((current) => active ? current.filter((item) => item !== genre) : [...current, genre])}>{active && <Check size={14} />}{genre}</button>;
          })}
        </fieldset>
        {error && <p className="viewer-onboarding-error" role="alert">{error}</p>}
        <button type="button" className="viewer-onboarding-submit" disabled={saving} onClick={finish}>
          {saving ? <><LoaderCircle size={17} className="viewer-onboarding-spinner" /> Saving…</> : 'Start watching'}
        </button>
        <button type="button" className="viewer-onboarding-switch" onClick={() => navigate('/profiles')}>Choose a different profile</button>
      </section>
    </main>
  );
}

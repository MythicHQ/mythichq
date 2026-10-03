import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  CalendarDays,
  Camera,
  Edit3,
  Film,
  Globe,
  Heart,
  LogOut,
  Mail,
  MessageSquareText,
  ShieldCheck,
  Star,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './Admin/AuthContext';
import { useWatchlist } from './Admin/WatchlistContext';
import { fetchPublicMovies } from '../services/movieCatalog';
import { loadUserReviews } from '../services/reviews';
import MovieCard from '../components/MovieCard';

const DEFAULT_PROFILE_AVATAR_URL = 'https://i.ytimg.com/vi/3gDcG9qDfME/hqdefault.jpg';
const PROFILE_BIO_LIMIT = 220;

const isValidUrl = (value) => {
  if (!value || !value.trim()) return true;

  try {
    const candidate = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
    const parsed = new URL(candidate);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const sanitizeProfileDraft = (profile, user) => ({
  username: profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'mythichq',
  full_name: profile?.full_name || user?.user_metadata?.full_name || '',
  bio: profile?.bio || user?.user_metadata?.bio || '',
  avatar_url: profile?.avatar_url || user?.user_metadata?.avatar_url || '',
  youtube_url: profile?.youtube_url || user?.user_metadata?.youtube_url || '',
  instagram_url: profile?.instagram_url || user?.user_metadata?.instagram_url || '',
  x_url: profile?.x_url || user?.user_metadata?.x_url || '',
  website_url: profile?.website_url || user?.user_metadata?.website_url || '',
  favorite_genres: profile?.favorite_genres || user?.user_metadata?.favorite_genres || '',
});

const formatJoinedDate = (value) => {
  if (!value) return 'Recently joined';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently joined';

  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, profile, updateProfile, signOut } = useAuth();
  const { watchlist, setToastMessage } = useWatchlist();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [movieMap, setMovieMap] = useState(new Map());
  const [draft, setDraft] = useState(sanitizeProfileDraft(profile, user));

  useEffect(() => {
    setDraft(sanitizeProfileDraft(profile, user));
  }, [profile, user]);

  useEffect(() => {
    const loadProfileData = async () => {
      if (!user?.id) {
        setReviews([]);
        setMovieMap(new Map());
        return;
      }

      try {
        const userReviews = await loadUserReviews(user.id);
        setReviews(userReviews || []);

        const movies = await fetchPublicMovies();
        setMovieMap(new Map((movies || []).map((movie) => [String(movie.id), movie])));
      } catch (error) {
        console.error('Failed to load profile content:', error);
      }
    };

    loadProfileData();
  }, [user]);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Movie lover';
  const username = profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'mythichq';
  const profileAvatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || DEFAULT_PROFILE_AVATAR_URL;
  const joinedDate = formatJoinedDate(profile?.created_at || user?.created_at);
  const roleLabel = profile?.role === 'admin' ? 'Administrator' : 'Member';

  const favoriteGenres = useMemo(() => {
    const values = (profile?.favorite_genres || draft.favorite_genres || '').split(',').map((value) => value.trim()).filter(Boolean);
    return values.slice(0, 6);
  }, [draft.favorite_genres, profile?.favorite_genres]);

  const recentMovies = useMemo(() => {
    return [...reviews]
      .slice(0, 4)
      .map((review) => {
        const movie = movieMap.get(String(review.movie_id));
        return movie ? { ...movie, review } : null;
      })
      .filter(Boolean);
  }, [movieMap, reviews]);

  const stats = useMemo(() => ({
    watched: reviews.length,
    reviews: reviews.length,
    watchlist: watchlist.length,
    favorites: favoriteGenres.length,
  }), [favoriteGenres.length, reviews.length, watchlist.length]);

  const handleChange = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleAvatarSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setDraft((current) => ({ ...current, avatar_url: String(reader.result || '') }));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSave = async () => {
    const nextUsername = draft.username.trim();
    const nextBio = draft.bio.trim();

    if (!nextUsername) {
      setSaveError('Username is required.');
      return;
    }

    if (nextBio.length > PROFILE_BIO_LIMIT) {
      setSaveError(`Bio must be ${PROFILE_BIO_LIMIT} characters or fewer.`);
      return;
    }

    const socialFields = [
      ['youtube_url', draft.youtube_url],
      ['instagram_url', draft.instagram_url],
      ['x_url', draft.x_url],
      ['website_url', draft.website_url],
    ];

    for (const [field, value] of socialFields) {
      if (value && !isValidUrl(value)) {
        setSaveError(`Please enter a valid URL for ${field.replace('_url', '').replace('_', ' ')}.`);
        return;
      }
    }

    setSaving(true);
    setSaveError('');

    try {
      await updateProfile({
        username: nextUsername,
        full_name: draft.full_name.trim(),
        bio: nextBio,
        avatar_url: draft.avatar_url || null,
        youtube_url: draft.youtube_url.trim(),
        instagram_url: draft.instagram_url.trim(),
        x_url: draft.x_url.trim(),
        website_url: draft.website_url.trim(),
        favorite_genres: draft.favorite_genres.trim(),
      });

      setToastMessage({ text: 'Profile updated successfully.', type: 'success', id: Date.now() });
      setIsEditing(false);
    } catch (error) {
      setSaveError(error.message || 'Unable to save your profile right now.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(sanitizeProfileDraft(profile, user));
    setSaveError('');
    setIsEditing(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      setToastMessage({ text: error.message || 'Unable to sign out.', type: 'error', id: Date.now() });
    }
  };

  return (
    <div className="profile-page-shell">
      <div className="profile-page-topbar">
        <button className="profile-back-button" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={18} />
        </button>
        <h1>Profile</h1>
      </div>

      <section className="profile-hero-card">
        <div className="profile-hero-inner">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar profile-avatar-large">
              <img src={profileAvatarUrl} alt={displayName} />
            </div>
          </div>

          <div className="profile-summary-block">
            <div className="profile-name-row">
              <div>
                <p className="profile-kicker">MythicHQ</p>
                <h2>{username}</h2>
              </div>
              <button className="profile-action-button" onClick={() => setIsEditing(true)}>
                <Edit3 size={16} />
                Edit Profile
              </button>
            </div>

            <div className="profile-badges-row">
              {displayName && displayName !== username ? <span className="profile-identity">{displayName}</span> : null}
              <span className="profile-badge"><ShieldCheck size={13} /> {roleLabel}</span>
            </div>

            <p className="profile-bio">
              {profile?.bio || user?.user_metadata?.bio || 'Your personal space for watchlists, reviews, and stories worth finding.'}
            </p>

            <div className="profile-meta-row">
              <span><CalendarDays size={14} /> Joined {joinedDate}</span>
              {profile?.email || user?.email ? <span><Mail size={14} /> {user?.email || profile?.email}</span> : null}
            </div>

            <div className="profile-social-row">
              {profile?.youtube_url || user?.user_metadata?.youtube_url ? (
                <a href={profile?.youtube_url || user?.user_metadata?.youtube_url} target="_blank" rel="noreferrer" className="profile-social-link">
                  <Globe size={14} /> YouTube
                </a>
              ) : null}
              {profile?.instagram_url || user?.user_metadata?.instagram_url ? (
                <a href={profile?.instagram_url || user?.user_metadata?.instagram_url} target="_blank" rel="noreferrer" className="profile-social-link">
                  <Globe size={14} /> Instagram
                </a>
              ) : null}
              {profile?.x_url || user?.user_metadata?.x_url ? (
                <a href={profile?.x_url || user?.user_metadata?.x_url} target="_blank" rel="noreferrer" className="profile-social-link">
                  <X size={14} /> X
                </a>
              ) : null}
              {profile?.website_url || user?.user_metadata?.website_url ? (
                <a href={profile?.website_url || user?.user_metadata?.website_url} target="_blank" rel="noreferrer" className="profile-social-link">
                  <Globe size={14} /> Website
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="profile-stats-grid">
        <div className="profile-stat-card">
          <div className="profile-stat-icon"><Film size={18} /></div>
          <div>
            <span className="profile-stat-label">Movies Watched</span>
            <strong>{stats.watched}</strong>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="profile-stat-icon"><MessageSquareText size={18} /></div>
          <div>
            <span className="profile-stat-label">Reviews</span>
            <strong>{stats.reviews}</strong>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="profile-stat-icon"><Bookmark size={18} /></div>
          <div>
            <span className="profile-stat-label">Watchlist</span>
            <strong>{stats.watchlist}</strong>
          </div>
        </div>

        <div className="profile-stat-card">
          <div className="profile-stat-icon"><Heart size={18} /></div>
          <div>
            <span className="profile-stat-label">Favorites</span>
            <strong>{stats.favorites}</strong>
          </div>
        </div>
      </section>

      <section className="profile-content-grid">
        <div className="profile-content-panel">
          <div className="profile-panel-header">
            <div>
              <span className="profile-section-kicker">Recently watched</span>
              <h3>Recently Watched</h3>
            </div>
            <Star size={16} />
          </div>

          {recentMovies.length > 0 ? (
            <div className="profile-mini-grid">
              {recentMovies.map((movie) => (
                <div key={movie.id} className="profile-mini-card">
                  <img
                    src={movie.poster_path
                      ? (movie.poster_path.startsWith('http') || movie.poster_path.startsWith('/') ? movie.poster_path : `https://image.tmdb.org/t/p/w500${movie.poster_path}`)
                      : DEFAULT_PROFILE_AVATAR_URL}
                    alt={movie.title}
                  />
                  <div className="profile-mini-copy">
                    <strong>{movie.title}</strong>
                    <span>{movie.review?.rating ? `${movie.review.rating}/5 rating` : 'Recently watched'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="profile-empty-state">
              <Film size={24} />
              <p>Your recent watches will appear here.</p>
            </div>
          )}
        </div>

        <div className="profile-content-panel">
          <div className="profile-panel-header">
            <div>
              <span className="profile-section-kicker">Saved for later</span>
              <h3>Watchlist</h3>
            </div>
            <Bookmark size={16} />
          </div>

          {watchlist.length > 0 ? (
            <div className="profile-movie-grid">
              {watchlist.slice(0, 3).map((movie) => (
                <MovieCard key={movie.id} movie={movie} showTitle showMetadata />
              ))}
            </div>
          ) : (
            <div className="profile-empty-state">
              <Bookmark size={24} />
              <p>Your watchlist is empty.</p>
            </div>
          )}
        </div>

        <div className="profile-content-panel">
          <div className="profile-panel-header">
            <div>
              <span className="profile-section-kicker">Your notes</span>
              <h3>Reviews</h3>
            </div>
            <MessageSquareText size={16} />
          </div>

          {reviews.length > 0 ? (
            <div className="profile-review-list">
              {reviews.slice(0, 3).map((review) => {
                const movie = movieMap.get(String(review.movie_id));
                return (
                  <div key={review.id} className="profile-review-item">
                    <div>
                      <strong>{movie?.title || 'Movie review'}</strong>
                      <div className="profile-review-meta">
                        <span>{Number(review.rating).toFixed(1)}/5</span>
                        <span>{new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <p>{review.comment || 'A thoughtful watch.'}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="profile-empty-state">
              <Star size={24} />
              <p>No reviews yet. Start rating the movies you love.</p>
            </div>
          )}
        </div>

        <div className="profile-content-panel">
          <div className="profile-panel-header">
            <div>
              <span className="profile-section-kicker">Taste profile</span>
              <h3>Favorites</h3>
            </div>
            <Heart size={16} />
          </div>

          {favoriteGenres.length > 0 ? (
            <div className="profile-genre-list">
              {favoriteGenres.map((genre) => (
                <span key={genre} className="profile-genre-pill">{genre}</span>
              ))}
            </div>
          ) : (
            <div className="profile-empty-state">
              <Heart size={24} />
              <p>Save your favorite genres to personalize your profile.</p>
            </div>
          )}
        </div>
      </section>

      <div className="profile-account-actions">
        <button className="profile-signout-button" onClick={handleSignOut}>
          <LogOut size={16} /> Sign out
        </button>
      </div>

      {isEditing && (
        <div className="profile-edit-overlay" onClick={handleCancel}>
          <div className="profile-edit-modal" onClick={(event) => event.stopPropagation()}>
            <div className="profile-edit-header">
              <div>
                <span className="profile-section-kicker">Profile settings</span>
                <h3>Edit Profile</h3>
              </div>
              <button type="button" className="profile-close-button" onClick={handleCancel} aria-label="Close edit profile">
                <X size={18} />
              </button>
            </div>

            <div className="profile-edit-body">
              <div className="profile-edit-avatar-wrap">
                <div className="profile-avatar profile-avatar-large profile-avatar-edit">
                  <img src={draft.avatar_url || profileAvatarUrl} alt="Profile preview" />
                </div>

                <label className="profile-upload-button">
                  <Camera size={16} />
                  Change Photo
                  <input type="file" accept="image/*" onChange={handleAvatarSelect} />
                </label>

                {draft.avatar_url && (
                  <button type="button" className="profile-text-button" onClick={() => handleChange('avatar_url', '')}>
                    Remove photo
                  </button>
                )}
              </div>

              <div className="profile-field-grid">
                <label className="profile-field">
                  <span>Username</span>
                  <input type="text" value={draft.username} onChange={(event) => handleChange('username', event.target.value)} />
                </label>

                <label className="profile-field">
                  <span>Full name</span>
                  <input type="text" value={draft.full_name} onChange={(event) => handleChange('full_name', event.target.value)} />
                </label>
              </div>

              <label className="profile-field">
                <span>Bio</span>
                <textarea
                  rows={4}
                  maxLength={PROFILE_BIO_LIMIT}
                  placeholder="Tell people a little about yourself..."
                  value={draft.bio}
                  onChange={(event) => handleChange('bio', event.target.value)}
                />
                <small>{draft.bio.length}/{PROFILE_BIO_LIMIT}</small>
              </label>

              <div className="profile-field-grid">
                <label className="profile-field">
                  <span>YouTube</span>
                  <input type="url" value={draft.youtube_url} onChange={(event) => handleChange('youtube_url', event.target.value)} placeholder="https://youtube.com/@yourhandle" />
                </label>

                <label className="profile-field">
                  <span>Instagram</span>
                  <input type="url" value={draft.instagram_url} onChange={(event) => handleChange('instagram_url', event.target.value)} placeholder="https://instagram.com/yourhandle" />
                </label>
              </div>

              <div className="profile-field-grid">
                <label className="profile-field">
                  <span>X / Twitter</span>
                  <input type="url" value={draft.x_url} onChange={(event) => handleChange('x_url', event.target.value)} placeholder="https://x.com/yourhandle" />
                </label>

                <label className="profile-field">
                  <span>Website</span>
                  <input type="url" value={draft.website_url} onChange={(event) => handleChange('website_url', event.target.value)} placeholder="https://yourwebsite.com" />
                </label>
              </div>

              <label className="profile-field">
                <span>Favorite genres</span>
                <input type="text" value={draft.favorite_genres} onChange={(event) => handleChange('favorite_genres', event.target.value)} placeholder="Sci‑Fi, Thriller, Adventure" />
              </label>

              <div className="profile-account-info">
                <span className="profile-section-kicker">Account details</span>
                <div className="profile-account-inline">
                  <Mail size={15} />
                  <span>{user?.email || profile?.email || 'No email available'}</span>
                </div>
              </div>

              {saveError && <div className="profile-status-error">{saveError}</div>}
            </div>

            <div className="profile-edit-footer">
              <button type="button" className="profile-cancel-button" onClick={handleCancel}>
                Cancel
              </button>
              <button type="button" className="profile-save-button" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;

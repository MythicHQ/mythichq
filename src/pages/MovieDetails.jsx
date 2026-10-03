import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import {
  Play,
  Bookmark,
  Clock,
  Calendar,
  Globe,
  Building2,
  UserCheck,
  Film,
  ArrowLeft,
  Image,
  MessageSquareText,
  Share2,
  ChevronRight,
  X,
} from 'lucide-react';
import {
  fetchMovieDetails,
  getBackdropUrl,
  getImageUrl,
  getProfileUrl,
} from '../services/tmdb';
import {
  formatRuntime,
  formatDate,
  getRatingBadge,
  getReleaseYear,
  getGenreNames,
} from '../utils/helpers';
import { useWatchlist } from './Admin/WatchlistContext';
import { useAuth } from './Admin/AuthContext';
import RatingBadge from '../components/RatingBadge';
import MovieCard from '../components/MovieCard';
import MovieRail from '../components/MovieRail';
import SkeletonCard from '../components/SkeletonCard';
import { fetchMovieById, fetchPublicMovies } from '../services/movieCatalog';
import MovieReviews from '../components/MovieReviews';
import LoadingIndicator from '../components/LoadingIndicator';

const buildOttLogoDataUrl = ({ symbol, background, foreground, accent }) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${background}"/>
          <stop offset="100%" stop-color="${accent}"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#g)"/>
      <circle cx="48" cy="16" r="8" fill="rgba(255,255,255,0.18)"/>
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800" fill="${foreground}" letter-spacing="-1">${symbol}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const OTT_PLATFORM_META = {
  Netflix: { short: 'N', color: '#FFFFFF', background: '#E50914', accent: '#B91C1C', logo: 'https://www.image2url.com/r2/default/images/1790355848446-0c66f76c-cf75-43f1-8f17-e12eada0d657.png' },
  'Prime Video': { short: 'P', color: '#FFFFFF', background: '#1A73E8', accent: '#0F172A', logo: 'https://www.image2url.com/r2/default/images/1790358294504-b3aad16c-b9ce-403b-9951-6dd7db77b23c.png' },
  JioHotstar: { short: 'J', color: '#0F172A', background: '#67E8F9', accent: '#7DD3FC', logo: 'https://www.image2url.com/r2/default/images/1790358540004-d3880f2e-69d3-4652-b70f-15b77cf393c4.png' },
  SonyLIV: { short: 'S', color: '#FFFFFF', background: '#E11D48', accent: '#7F1D1D', logo: 'https://www.image2url.com/r2/default/images/1790358663312-a2ac02f3-9d5e-42b5-bcc4-767cb9f431de.png' },
  ZEE5: { short: 'Z', color: '#FFFFFF', background: '#6D28D9', accent: '#4C1D95', logo: 'https://www.image2url.com/r2/default/images/1790358399019-ba2cfe18-a6b8-4e73-a35f-692fb154f608.png' },
  'Apple TV+': { short: 'A', color: '#111827', background: '#F8FAFC', accent: '#D1D5DB', logo: buildOttLogoDataUrl({ symbol: 'A', background: '#F8FAFC', foreground: '#111827', accent: '#D1D5DB' }) },
  'Disney+ Hotstar': { short: 'D', color: '#FFFFFF', background: '#1D4ED8', accent: '#1E3A8A', logo: buildOttLogoDataUrl({ symbol: 'D', background: '#1D4ED8', foreground: '#FFFFFF', accent: '#1E3A8A' }) },
  'MX Player': { short: 'M', color: '#0F172A', background: '#FBBF24', accent: '#F59E0B', logo: buildOttLogoDataUrl({ symbol: 'M', background: '#FBBF24', foreground: '#0F172A', accent: '#F59E0B' }) },
  Aha: { short: 'A', color: '#FFFFFF', background: '#F97316', accent: '#C2410C', logo: buildOttLogoDataUrl({ symbol: 'A', background: '#F97316', foreground: '#FFFFFF', accent: '#C2410C' }) },
  'Sun NXT': { short: 'S', color: '#FFFFFF', background: '#14B8A6', accent: '#0F766E', logo: buildOttLogoDataUrl({ symbol: 'S', background: '#14B8A6', foreground: '#FFFFFF', accent: '#0F766E' }) },
  'Eros Now': { short: 'E', color: '#FFFFFF', background: '#EC4899', accent: '#9D174D', logo: buildOttLogoDataUrl({ symbol: 'E', background: '#EC4899', foreground: '#FFFFFF', accent: '#9D174D' }) },
  'YouTube Movies': { short: 'YT', color: '#FFFFFF', background: '#FF0000', accent: '#991B1B', logo: buildOttLogoDataUrl({ symbol: 'YT', background: '#FF0000', foreground: '#FFFFFF', accent: '#991B1B' }) },
};

const getOttPlatformMeta = (platformName) => {
  const normalizedName = String(platformName || '').trim();
  const fallback = normalizedName ? normalizedName.slice(0, 2).toUpperCase() : 'OT';

  return OTT_PLATFORM_META[normalizedName] || {
    short: fallback,
    color: '#F8FAFC',
    background: '#1F2937',
    accent: '#374151',
    logo: buildOttLogoDataUrl({ symbol: fallback, background: '#1F2937', foreground: '#F8FAFC', accent: '#374151' }),
  };
};

const MovieDetails = ({ onPlayTrailer }) => {
  const { movieIdentifier } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const shouldPlayTrailer = searchParams.get('playTrailer') === 'true';
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const { profile } = useAuth();

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedMovies, setRelatedMovies] = useState([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setMovie(null);
    setLoading(true);
    setError(null);
    window.scrollTo(0, 0);

    const detailsRequest = fetchMovieById(movieIdentifier).then((localMovie) => {
      if (localMovie) {
        return {
          ...localMovie,
          runtime: Number(localMovie.runtime || 0),
          genres: localMovie.genres?.length
            ? localMovie.genres
            : getGenreNames(localMovie.genre_ids).map((name, index) => ({ id: localMovie.genre_ids[index], name })),
          spoken_languages: (localMovie.languages?.length ? localMovie.languages : [localMovie.language]).filter(Boolean).map((language) => ({ english_name: language })),
          production_companies: [],
          videos: localMovie.trailer_key ? { results: [{ key: localMovie.trailer_key, site: 'YouTube', type: 'Trailer', official: true }] } : { results: [] },
          credits: {
            cast: (localMovie.cast || []).map((name, index) => ({ id: `${localMovie.id}-cast-${index}`, name, character: '' })),
            crew: localMovie.director ? [{ id: `${localMovie.id}-director`, name: localMovie.director, job: 'Director' }] : [],
          },
          similar: { results: [] },
          recommendations: { results: [] },
        };
      }

      return fetchMovieDetails(movieIdentifier);
    });

    detailsRequest
      .then((data) => {
        if (!isMounted) return;
        setMovie(data);

        // Auto trigger trailer if query param playTrailer=true
        if (shouldPlayTrailer && onPlayTrailer) {
          onPlayTrailer(data);
        }
      })
      .catch((err) => {
        if (isMounted) setError('Failed to fetch details for this movie.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [movieIdentifier, shouldPlayTrailer, onPlayTrailer]);

  useEffect(() => {
    if (!movie) return undefined;

    const apiSimilarMovies = [
      ...(movie.similar?.results || []),
      ...(movie.recommendations?.results || []),
    ].filter((item) => item?.id && item.id !== movie.id);

    if (apiSimilarMovies.length > 0) {
      setRelatedMovies(apiSimilarMovies.slice(0, 10));
      return undefined;
    }

    let active = true;
    fetchPublicMovies().then((catalog) => {
      if (!active) return;
      const movieLanguages = new Set([
        ...(movie.languages || []),
        ...(movie.spoken_languages || []).map((language) => language?.english_name || language?.name),
        ...(typeof movie.language === 'string' ? movie.language.split(',') : []),
      ].map((language) => String(language || '').trim().toLowerCase()).filter(Boolean));

      const languageMatches = catalog.filter((candidate) => {
        if (!candidate || candidate.id === movie.id) return false;
        const candidateLanguages = [
          ...(candidate.languages || []),
          ...(typeof candidate.language === 'string' ? candidate.language.split(',') : []),
        ].map((language) => String(language || '').trim().toLowerCase()).filter(Boolean);
        return candidateLanguages.some((language) => movieLanguages.has(language));
      });

      const related = languageMatches.filter((candidate, index, list) => list.findIndex((item) => item.id === candidate.id) === index).slice(0, 15);
      setRelatedMovies(related);
    }).catch(() => {
      if (active) setRelatedMovies([]);
    });

    return () => { active = false; };
  }, [movie]);

  useEffect(() => {
    if (!reviewModalOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setReviewModalOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [reviewModalOpen]);

  if (loading) {
    return (
      <div className="page-container movie-details-loading"><LoadingIndicator label="Loading movie details..." /></div>
    );
  }

  if (error || !movie) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <h3>Movie Not Found</h3>
          <p>{error || 'The requested movie details could not be retrieved.'}</p>
          <button className="btn-primary" onClick={() => navigate('/movies')}>
            Back to Movies
          </button>
        </div>
      </div>
    );
  }

  const resolveMediaUrl = (value, resolver, size) => {
    if (!value) return null;
    if (value.startsWith('/') || value.startsWith('http')) return value;
    return resolver(value, size);
  };
  const backdropUrl = resolveMediaUrl(movie.backdrop_path, getBackdropUrl, 'original');
  const posterUrl = resolveMediaUrl(movie.poster_path, getImageUrl, 'w500');
  const inWatchlist = isInWatchlist(movie.id);

  // Cast & Crew
  const credits = movie.credits || {};
  const cast = credits.cast?.slice(0, 10) || [];
  const directorObj = credits.crew?.find((c) => c.job === 'Director');
  const directorName = directorObj ? directorObj.name : 'Unknown';

  const trailerObj =
    movie.videos?.results?.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
    movie.videos?.results?.find((v) => v.site === 'YouTube');
  const trailerSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${movie.title} official trailer`)}`;
  const ottPlatforms = [...new Set((Array.isArray(movie.otts)
    ? movie.otts
    : typeof movie.ott === 'string'
      ? movie.ott.split(',')
      : Array.isArray(movie.ott)
        ? movie.ott
        : [])
    .map((platform) => String(platform).trim())
    .filter(Boolean))];
  const ottPlatformBadges = ottPlatforms.map((platform) => {
    const meta = getOttPlatformMeta(platform);
    return (
      <span key={platform} className="details-taxonomy-chip language-chip">
        <img
          src={meta.logo}
          alt={`${platform} logo`}
          style={{
            width: ['Netflix', 'Prime Video', 'ZEE5', 'JioHotstar', 'SonyLIV'].includes(platform) ? '96px' : '18px',
            height: ['Netflix', 'Prime Video', 'ZEE5', 'JioHotstar', 'SonyLIV'].includes(platform) ? '32px' : '18px',
            borderRadius: ['Netflix', 'Prime Video', 'ZEE5', 'JioHotstar', 'SonyLIV'].includes(platform) ? '0' : '6px',
            objectFit: ['Netflix', 'Prime Video', 'ZEE5', 'JioHotstar', 'SonyLIV'].includes(platform) ? 'contain' : 'cover',
            display: 'block',
            boxShadow: ['Netflix', 'Prime Video', 'ZEE5', 'JioHotstar', 'SonyLIV'].includes(platform) ? 'none' : '0 0 0 1px rgba(255,255,255,0.12)',
          }}
        />
        {!['Netflix', 'Prime Video', 'ZEE5', 'JioHotstar', 'SonyLIV'].includes(platform) && platform}
      </span>
    );
  });
  const detailGenres = (movie.genres || [])
    .map((genre) => typeof genre === 'string' ? genre : genre?.name)
    .filter(Boolean);
  const detailLanguages = [...new Set((movie.spoken_languages?.length
    ? movie.spoken_languages.map((language) => language?.english_name || language?.name)
    : movie.languages?.length
      ? movie.languages
      : String(movie.language || '').split(',')).map((language) => String(language || '').trim()).filter(Boolean))];

  return (
    <div className="movie-details-page">
      {/* 1. BACKDROP HERO HEADER */}
      <div className="details-hero">
        <div
          className="details-hero-backdrop"
          style={{ backgroundImage: `url(${backdropUrl})` }}
        >
          <div className="details-hero-gradient" />
        </div>

        <div className="details-hero-container">
          <button className="btn-back-floating" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="details-hero-content">
            {/* Poster Image */}
            <div className="details-poster-box">
              <img src={posterUrl} alt={movie.title} className="details-poster-img" />
              {profile?.role === 'admin' && (
                <Link
                  className="details-media-update-link"
                  to={`/admin/movies/edit/${movie.id}`}
                  state={{ returnTo: `${location.pathname}${location.search}` }}
                >
                  <Image size={16} />
                  <span>Update images</span>
                </Link>
              )}
              <button
                className={`btn-watchlist-hero ${inWatchlist ? 'active' : ''}`}
                onClick={() => toggleWatchlist(movie)}
              >
                <Bookmark size={20} fill={inWatchlist ? '#E50914' : 'none'} color={inWatchlist ? '#E50914' : '#FFFFFF'} />
                <span>{inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}</span>
              </button>
            </div>

            {/* Info Column */}
            <div className="details-info-col">
              <div className="details-rating-row">
                <RatingBadge rating={movie.vote_average} size="large" />
              </div>

              <h1 className="details-title">{movie.title}</h1>
              {movie.tagline && <p className="details-tagline">"{movie.tagline}"</p>}

              {/* Quick Meta Row */}
              <div className="details-meta-row">
                <span className="meta-item">
                  <Film size={16} />
                  <span>{movie.content_type === 'tv_show' ? 'TV Show' : 'Movie'}</span>
                </span>
                <span className="meta-item">
                  <Calendar size={16} />
                  <span>{formatDate(movie.release_date)}</span>
                </span>

                <span className="meta-item">
                  <Clock size={16} />
                  <span>{formatRuntime(movie.runtime)}</span>
                </span>

                {directorObj && (
                  <span className="meta-item">
                    <UserCheck size={16} />
                    <span>Director: <strong>{directorName}</strong></span>
                  </span>
                )}
              </div>

              <div className="details-taxonomy-grid">
                <div className="details-taxonomy-section">
                  <span className="details-taxonomy-label"><Film size={14} /> Genres</span>
                  <div className="details-taxonomy-list">
                    {detailGenres.map((genre) => <span key={genre} className="details-taxonomy-chip genre-chip"><Film size={13} /> {genre}</span>)}
                  </div>
                </div>
                <div className="details-taxonomy-section">
                  <span className="details-taxonomy-label"><Globe size={14} /> Languages</span>
                  <div className="details-taxonomy-list">
                    {detailLanguages.map((language) => <span key={language} className="details-taxonomy-chip language-chip"><Globe size={13} /> {language}</span>)}
                  </div>
                </div>
              </div>

              {/* Action CTA Buttons */}
              <div className="details-cta-buttons">
                <button
                  className="btn-primary btn-cta-large"
                  onClick={() => onPlayTrailer && onPlayTrailer(movie, trailerObj?.key)}
                >
                  <Play size={22} fill="#FFFFFF" />
                  <span>Watch Trailer</span>
                </button>
                <a className="btn-outline btn-cta-large" href={trailerSearchUrl} target="_blank" rel="noopener noreferrer">
                  <Play size={20} />
                  <span>Find on YouTube</span>
                </a>

                <button
                  className={`btn-secondary btn-cta-large ${inWatchlist ? 'active' : ''}`}
                  onClick={() => toggleWatchlist(movie)}
                >
                  <Bookmark size={22} fill={inWatchlist ? '#E50914' : 'none'} color={inWatchlist ? '#E50914' : '#FFFFFF'} />
                  <span>{inWatchlist ? 'Saved in Watchlist' : 'Add to Watchlist'}</span>
                </button>
              </div>

              {/* Story Overview */}
              <div className="details-overview-box">
                <h3>Story Overview</h3>
                <p>{movie.overview || 'No overview available for this movie.'}</p>
              </div>

              {/* Languages & Production */}
              <div className="details-extra-grid">
                {movie.production_companies?.length > 0 && (
                  <div className="extra-item">
                    <Building2 size={16} />
                    <span>
                      Studios:{' '}
                      <strong>{movie.production_companies.map((p) => p.name).slice(0, 3).join(', ')}</strong>
                    </span>
                  </div>
                )}
                {ottPlatformBadges.length > 0 && (
                  <div className="details-taxonomy-section" style={{ gridColumn: '1 / -1' }}>
                    <span className="details-taxonomy-label"><Film size={14} /> Available on</span>
                    <div className="details-taxonomy-list">
                      {ottPlatformBadges}
                    </div>
                  </div>
                )}
                {movie.writers?.length > 0 && (
                  <div className="extra-item">
                    <UserCheck size={16} />
                    <span>Writers: <strong>{movie.writers.join(', ')}</strong></span>
                  </div>
                )}
                {movie.production_company && (
                  <div className="extra-item">
                    <Building2 size={16} />
                    <span>Production: <strong>{movie.production_company}</strong></span>
                  </div>
                )}
                {movie.distributor && (
                  <div className="extra-item">
                    <Building2 size={16} />
                    <span>Distributor: <strong>{movie.distributor}</strong></span>
                  </div>
                )}
              </div>

              <button type="button" className="btn-outline details-review-trigger" onClick={() => setReviewModalOpen(true)}>
                <MessageSquareText size={18} />
                <span>Write a Review</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. CAST & CREW CAROUSEL */}
      <div className="main-content-wrapper">
        {cast.length > 0 && (
          <section className="home-section">
            <div className="section-header">
              <h2>Top Cast</h2>
            </div>

            <div className="cast-grid">
              {cast.map((actor) => {
                const profileUrl = getProfileUrl(actor.profile_path);
                return (
                  <div key={actor.id} className="cast-card">
                    {profileUrl ? (
                      <img src={profileUrl} alt={actor.name} className="cast-avatar" />
                    ) : (
                      <div className="cast-avatar-fallback">👤</div>
                    )}
                    <div className="cast-info">
                      <h4>{actor.name || 'Unknown cast member'}</h4>
                      {actor.character && <p>{actor.character}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 3. MORE LIKE THIS CAROUSEL */}
        {relatedMovies.length > 0 ? (
          <section className="home-section">
            <div className="section-header">
              <h2>More Like This</h2>
            </div>
            <MovieRail>
              {relatedMovies.map((m) => (
                <MovieCard key={m.id} movie={m} showMetadata onPlayTrailer={onPlayTrailer} />
              ))}
            </MovieRail>
          </section>
        ) : (
          <section className="home-section">
            <div className="section-header">
              <h2>More Like This</h2>
            </div>
            <div className="details-empty-state">No similar movies available</div>
          </section>
        )}

        {/* 4. EXISTING REVIEWS */}
        <MovieReviews movieId={movie.id} showComposer={false} />
      </div>

      {reviewModalOpen && (
        <div className="review-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setReviewModalOpen(false);
        }}>
          <section className="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-modal-title">
            <div className="review-modal-header">
              <div><span className="eyebrow"><MessageSquareText size={14} /> Community</span><h2 id="review-modal-title">Write a Review</h2></div>
              <button type="button" className="review-modal-close" onClick={() => setReviewModalOpen(false)} aria-label="Close review form"><X size={20} /></button>
            </div>
            <MovieReviews movieId={movie.id} showReviewList={false} />
          </section>
        </div>
      )}
    </div>
  );
};

export default MovieDetails;

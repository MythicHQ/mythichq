import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import {
  Play,
  Bookmark,
  Clock,
  Calendar,
  Globe,
  UserCheck,
  Film,
  ArrowLeft,
  Image,
  MessageSquareText,
  X,
  Heart,
  Flame,
  Smile,
  Moon,
  Star,
  BadgeCheck,
  ThumbsUp,
  CircleHelp,
  Pencil,
} from 'lucide-react';
import {
  fetchMovieDetails,
  getBackdropDisplayUrl,
  getPosterDisplayUrl,
  getProfileUrl,
} from '../services/tmdb';
import {
  formatRuntime,
  formatDate,
  getGenreNames,
  GENRES_MAP,
} from '../utils/helpers';
import { useWatchlist } from './Admin/WatchlistContext';
import { useAuth } from './Admin/AuthContext';
import RatingBadge from '../components/RatingBadge';
import MovieCard from '../components/MovieCard';
import MovieTitleArtwork from '../components/MovieTitleArtwork';
import MovieRail from '../components/MovieRail';
import { fetchMovieById, fetchPublicMovies } from '../services/movieCatalog';
import MovieReviews from '../components/MovieReviews';
import LoadingIndicator from '../components/LoadingIndicator';
import { supabase } from '../lib/supabase';
import { fetchMovieCredits } from '../services/movieCredits';
import { fetchMovieCastMembers } from '../services/castMembers';
import {
  loadMovieEngagement,
  recordMovieView,
  saveMovieReaction,
  setMovieLiked,
} from '../services/movieEngagement';

const HYPE_REACTIONS = [
  { value: 'hype', label: 'Hype', Icon: Flame },
  { value: 'maybe', label: 'Maybe', Icon: CircleHelp },
  { value: 'not_interested', label: 'Not interested', Icon: Moon },
  { value: 'love', label: 'Love', Icon: Heart },
  { value: 'amazing', label: 'Amazing', Icon: Smile },
  { value: 'average', label: 'Average', Icon: ThumbsUp },
];

const HYPE_LEVELS = [
  { maximum: 25, label: 'Low hype' },
  { maximum: 50, label: 'Moderate' },
  { maximum: 75, label: 'High hype' },
  { maximum: 90, label: 'Very high' },
  { maximum: 100, label: 'Extremely hype' },
];

const MOVIE_BADGE_LABELS = {
  trending: 'Trending',
  popular: 'Popular',
  rising: 'Rising',
  new: 'New',
  top_rated: 'Top rated',
  editors_pick: "Editor's pick",
};

const isSafeHttpUrl = (value) => /^https?:\/\//i.test(String(value || '').trim());

const getYouTubeVideoId = (value) => {
  if (!value || typeof value !== 'string') return '';
  const trimmedValue = value.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmedValue)) return trimmedValue;

  try {
    const url = new URL(trimmedValue);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (!['youtube.com', 'youtube-nocookie.com', 'm.youtube.com', 'youtu.be'].includes(host)) return '';
    const videoId = host === 'youtu.be'
      ? url.pathname.split('/').filter(Boolean)[0]
      : url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1];
    return /^[A-Za-z0-9_-]{11}$/.test(videoId || '') ? videoId : '';
  } catch {
    return '';
  }
};

const formatMoney = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

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
  const { user, profile, requireAuth } = useAuth();

  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedMovies, setRelatedMovies] = useState([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [engagement, setEngagement] = useState({ hypePercentage: 0, trendingBadge: '', reaction: '', liked: false });
  const [engagementLoading, setEngagementLoading] = useState(true);
  const [engagementSaving, setEngagementSaving] = useState(false);
  const [engagementError, setEngagementError] = useState('');
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [mythicRating, setMythicRating] = useState(null);

  const handleReviewSummary = useCallback(({ average }) => {
    setMythicRating(Number(average || 0));
  }, []);

  useEffect(() => {
    let isMounted = true;
    setMovie(null);
    setLoading(true);
    setError(null);
    window.scrollTo(0, 0);

    const detailsRequest = fetchMovieById(movieIdentifier).then(async (localMovie) => {
      if (localMovie) {
        let storedCredits = { cast: [], crew: [] };
        let centralizedCast = [];
        if (supabase) {
          try {
            storedCredits = await fetchMovieCredits(localMovie.id);
          } catch (creditsError) {
            console.warn('Could not load structured movie credits; using legacy credits:', creditsError);
          }
          try {
            centralizedCast = await fetchMovieCastMembers(localMovie.id);
          } catch (castError) {
            console.warn('Could not load centralized cast; using legacy credits:', castError);
          }
        }
        const legacyCharacterByName = new Map();
        [...storedCredits.cast, ...(Array.isArray(localMovie.cast_crew) ? localMovie.cast_crew : [])]
          .forEach((person) => {
            const name = String(person.full_name || person.person_name || person.actor_name || person.name || '').trim().toLocaleLowerCase();
            const character = String(person.character_name || person.character || '').trim();
            if (name && character && !legacyCharacterByName.has(name)) legacyCharacterByName.set(name, character);
          });
        const storedCast = (centralizedCast.length ? centralizedCast : storedCredits.cast).map((person) => {
          const name = person.full_name || person.person_name || person.actor_name;
          const characterName = String(person.character_name || '').trim()
            || legacyCharacterByName.get(String(name || '').trim().toLocaleLowerCase())
            || '';
          return ({
          id: person.id,
          castMemberId: person.cast_member_id || (centralizedCast.length ? person.id : ''),
          name,
          character: characterName,
          profile_path: person.image_url || person.profile_image_url || '',
          });
        });
        const storedCrew = storedCredits.crew.map((person) => ({
          id: person.id,
          name: person.person_name,
          department: person.department || 'Other',
          job: person.job || person.department || 'Crew',
          profile_path: person.image_url || '',
        }));
        return {
          ...localMovie,
          has_structured_cast: centralizedCast.length > 0 || storedCredits.cast.length > 0,
          has_structured_crew: storedCredits.crew.length > 0,
          runtime: Number(localMovie.runtime || 0),
          genres: localMovie.genres?.length
            ? localMovie.genres
            : getGenreNames(localMovie.genre_ids).map((name, index) => ({ id: localMovie.genre_ids[index], name })),
          spoken_languages: (localMovie.languages?.length ? localMovie.languages : [localMovie.language]).filter(Boolean).map((language) => ({ english_name: language })),
          production_companies: [],
          videos: localMovie.trailer_key ? { results: [{ key: localMovie.trailer_key, site: 'YouTube', type: 'Trailer', official: true }] } : { results: [] },
          credits: {
            cast: storedCast.length
              ? storedCast
              : (localMovie.cast || []).map((name, index) => ({ id: `${localMovie.id}-cast-${index}`, name, character: '' })),
            crew: storedCrew.length
              ? storedCrew
              : localMovie.director ? [{ id: `${localMovie.id}-director`, name: localMovie.director, department: 'Director', job: 'Director' }] : [],
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
      .catch(() => {
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
    if (!movie?.id) return undefined;
    let active = true;
    setEngagementLoading(true);
    setEngagementError('');

    Promise.all([
      loadMovieEngagement(movie.id, user?.id),
      recordMovieView({ movieId: movie.id, userId: user?.id }),
    ])
      .then(([nextEngagement]) => {
        if (active) setEngagement(nextEngagement);
      })
      .catch((engagementLoadError) => {
        console.error('Failed to load movie engagement:', engagementLoadError);
        if (active) {
          const needsMigration = ['PGRST202', 'PGRST205', '42P01'].includes(engagementLoadError.code)
            || /schema cache|does not exist/i.test(engagementLoadError.message || '');
          setEngagementError(needsMigration
            ? 'Movie interactions need a database update. Run supabase/movie_details_features.sql in the Supabase SQL Editor.'
            : 'Movie reactions could not be loaded. Please refresh and try again.');
        }
      })
      .finally(() => {
        if (active) setEngagementLoading(false);
      });

    return () => { active = false; };
  }, [movie?.id, user?.id]);

  const handleReaction = async (reaction) => {
    if (!user) {
      requireAuth();
      return;
    }
    setEngagementSaving(true);
    setEngagementError('');
    try {
      const nextReaction = engagement.reaction === reaction ? '' : reaction;
      await saveMovieReaction({ movieId: movie.id, userId: user.id, reaction: nextReaction });
      const nextEngagement = await loadMovieEngagement(movie.id, user.id);
      setEngagement(nextEngagement);
    } catch (saveError) {
      console.error('Failed to save movie reaction:', saveError);
      setEngagementError(saveError.message || 'Unable to save your reaction. Please try again.');
    } finally {
      setEngagementSaving(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      requireAuth();
      return;
    }
    setEngagementSaving(true);
    setEngagementError('');
    try {
      const liked = await setMovieLiked({ movieId: movie.id, userId: user.id, liked: !engagement.liked });
      setEngagement((current) => ({ ...current, liked }));
    } catch (saveError) {
      console.error('Failed to save movie like:', saveError);
      setEngagementError(saveError.message || 'Unable to update your like. Please try again.');
    } finally {
      setEngagementSaving(false);
    }
  };

  const openReviews = () => {
    document.getElementById('movie-reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
      const movieGenres = new Set([
        ...(movie.genres || []).map((genre) => typeof genre === 'string' ? genre : genre?.name),
        ...(movie.genre || '').split(','),
      ].map((genre) => String(genre || '').trim().toLowerCase()).filter(Boolean));
      const movieRating = Number(movie.vote_average || 0);

      const rankedMatches = catalog
        .filter((candidate) => {
          if (!candidate || String(candidate.id) === String(movie.id)) return false;
          const candidateLanguages = [
            ...(candidate.languages || []),
            ...(typeof candidate.language === 'string' ? candidate.language.split(',') : []),
          ].map((language) => String(language || '').trim().toLowerCase()).filter(Boolean);
          const candidateGenres = [
            ...(candidate.genres || []).map((genre) => typeof genre === 'string' ? genre : genre?.name),
            ...(candidate.genre || '').split(','),
          ].map((genre) => String(genre || '').trim().toLowerCase()).filter(Boolean);
          const sharedGenreCount = candidateGenres.filter((genre) => movieGenres.has(genre)).length;
          const sharedLanguage = candidateLanguages.some((language) => movieLanguages.has(language));
          const candidateRating = Number(candidate.vote_average || 0);
          const ratingMatch = movieRating > 0 && candidateRating > 0 && Math.abs(movieRating - candidateRating) <= 1.5;
          return sharedGenreCount > 0 || sharedLanguage || ratingMatch;
        })
        .map((candidate) => {
          const candidateLanguages = [
            ...(candidate.languages || []),
            ...(typeof candidate.language === 'string' ? candidate.language.split(',') : []),
          ].map((language) => String(language || '').trim().toLowerCase()).filter(Boolean);
          const candidateGenres = [
            ...(candidate.genres || []).map((genre) => typeof genre === 'string' ? genre : genre?.name),
            ...(candidate.genre || '').split(','),
          ].map((genre) => String(genre || '').trim().toLowerCase()).filter(Boolean);
          const sharedGenreCount = candidateGenres.filter((genre) => movieGenres.has(genre)).length;
          const sharedLanguage = candidateLanguages.some((language) => movieLanguages.has(language));
          const ratingDifference = Math.abs(movieRating - Number(candidate.vote_average || 0));
          return {
            candidate,
            score: sharedGenreCount * 3 + (sharedLanguage ? 2 : 0)
              + (movieRating > 0 && ratingDifference <= 1.5 ? 2 - ratingDifference : 0),
          };
        })
        .sort((first, second) => second.score - first.score)
        .slice(0, 15)
        .map(({ candidate }) => candidate);

      setRelatedMovies(rankedMatches);
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

  const backdropUrl = getBackdropDisplayUrl(movie.backdrop_path, 'original');
  const posterUrl = getPosterDisplayUrl(movie.poster_path, 'w500');
  const inWatchlist = isInWatchlist(movie.id);

  // Cast & Crew
  const credits = movie.credits || {};
  const cast = credits.cast?.slice(0, 10) || [];
  const directorObj = credits.crew?.find((c) => c.job === 'Director');
  const directorName = directorObj ? directorObj.name : 'Unknown';

  const trailerObj =
    movie.videos?.results?.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
    movie.videos?.results?.find((v) => v.site === 'YouTube');
  const trailerVideoId = getYouTubeVideoId(trailerObj?.key)
    || getYouTubeVideoId(movie.trailer_key)
    || getYouTubeVideoId(movie.trailer_url);
  const trailerUrl = isSafeHttpUrl(movie.trailer_url) ? movie.trailer_url.trim() : '';
  const isDirectVideo = /\.(mp4|webm|ogg)(?:$|[?#])/i.test(trailerUrl);
  const ottPlatforms = [...new Set((Array.isArray(movie.otts)
    ? movie.otts
    : typeof movie.ott === 'string'
      ? movie.ott.split(',')
      : Array.isArray(movie.ott)
        ? movie.ott
        : [])
    .map((platform) => String(platform).trim())
    .filter(Boolean))];
  const detailGenres = [...new Set((movie.genres || [])
    .map((genre) => {
      const value = typeof genre === 'string' ? genre : genre?.name || genre?.id;
      if (value == null) return '';
      const name = String(value).trim();
      return /^\d+$/.test(name) ? GENRES_MAP[name] || '' : name;
    })
    .filter((genre) => genre && !/^\d+$/.test(genre)) )];
  const detailLanguages = [...new Set((movie.spoken_languages?.length
    ? movie.spoken_languages.map((language) => language?.english_name || language?.name)
    : movie.languages?.length
      ? movie.languages
      : String(movie.language || '').split(',')).map((language) => String(language || '').trim()).filter(Boolean))];
  const hypePercentage = Math.max(0, Math.min(100, engagement.hypePercentage));
  const hypeLevel = HYPE_LEVELS.find((level) => hypePercentage <= level.maximum)?.label || 'Extremely hype';
  const reviewRatingOutOfTen = mythicRating == null ? null : mythicRating * 2;
  const customCastCrew = Array.isArray(movie.cast_crew) ? movie.cast_crew : [];
  const isCastCredit = (person) => !person?.role || /actor|actress|cast/i.test(person.role);
  const customCastCards = customCastCrew
    .filter((person) => person?.name && isCastCredit(person))
    .slice(0, 18)
    .map((person, index) => ({
      id: `custom-cast-${index}-${person.name}`,
      name: person.name,
      character: person.character || '',
      imageUrl: isSafeHttpUrl(person.image_url) ? person.image_url : '',
    }));
  const fallbackCastCards = cast.map((actor) => ({
    id: actor.castMemberId || actor.id || actor.name,
    castMemberId: actor.castMemberId || '',
    name: actor.name || 'Unknown cast member',
    character: actor.character || '',
    imageUrl: actor.profile_path?.startsWith?.('http')
      ? actor.profile_path
      : getProfileUrl(actor.profile_path),
  }));
  const castCrewCards = (
    movie.has_structured_cast && cast.length
      ? fallbackCastCards
      : customCastCards.length ? customCastCards : fallbackCastCards
  ).slice(0, 18);
  const customCrewCards = customCastCrew
    .filter((person) => person?.name && !isCastCredit(person))
    .map((person, index) => ({
      id: `custom-crew-${index}-${person.name}`,
      name: person.name,
      department: person.role || 'Other',
      job: person.job || person.role || 'Crew',
      imageUrl: isSafeHttpUrl(person.image_url) ? person.image_url : '',
    }));
  const fallbackCrewCards = (credits.crew || [])
    .filter((person) => person?.name)
    .map((person) => ({
      id: person.id,
      name: person.name,
      department: person.department || person.job || 'Crew',
      job: person.job || person.department || 'Crew',
      imageUrl: person.profile_path?.startsWith?.('http')
        ? person.profile_path
        : getProfileUrl(person.profile_path),
    }));
  const crewCards = (
    movie.has_structured_crew && fallbackCrewCards.length
      ? fallbackCrewCards
      : customCrewCards.length ? customCrewCards : fallbackCrewCards
  ).slice(0, 24);
  const crewGroups = crewCards.reduce((groups, person) => {
    const department = person.department || 'Crew';
    if (!groups[department]) groups[department] = [];
    groups[department].push(person);
    return groups;
  }, {});
  const watchProviderEntries = Array.isArray(movie.watch_providers) && movie.watch_providers.length
    ? movie.watch_providers.filter((provider) => provider?.name)
    : ottPlatforms.map((name) => ({ name }));
  const allBadges = [...new Set([
    ...(Array.isArray(movie.badges) ? movie.badges : []),
    engagement.trendingBadge,
  ].filter(Boolean))];
  const overviewText = movie.overview || movie.description || 'No overview available for this movie.';
  const hasLongSynopsis = overviewText.length > 320;
  const displayedSynopsis = hasLongSynopsis && !synopsisExpanded
    ? `${overviewText.slice(0, 320).trimEnd()}…`
    : overviewText;

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
                {allBadges.length > 0 && (
                  <div className="movie-detail-badges">
                    {allBadges.map((badge) => (
                      <span className={`movie-detail-badge is-${badge}`} key={badge}>
                        {badge === 'trending' ? '🔥 ' : badge === 'popular' ? '⚡ ' : badge === 'rising' ? '🚀 ' : '✦ '}
                        {MOVIE_BADGE_LABELS[badge] || badge.replaceAll('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <h1 className="details-title">
                <MovieTitleArtwork title={movie.title} imageUrl={movie.title_image_url} />
              </h1>
              {movie.tagline && <p className="details-tagline">"{movie.tagline}"</p>}

              {/* Quick Meta Row */}
              <div className="details-meta-row">
                <span className="meta-item">
                  <Film size={16} />
                  <span>{movie.content_type === 'tv_show' ? 'TV Show' : 'Movie'}</span>
                </span>
                <span className="meta-item">
                  <Calendar size={16} />
                  <span>{formatDate(movie.release_date)}{movie.release_date ? ` · ${String(movie.release_date).slice(0, 4)}` : ''}</span>
                </span>

                <span className="meta-item">
                  <Clock size={16} />
                  <span>{formatRuntime(movie.runtime)}</span>
                </span>
                {movie.age_rating && (
                  <span className="meta-item movie-age-rating"><BadgeCheck size={16} /><span>{movie.age_rating}</span></span>
                )}

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
                {(trailerVideoId || trailerUrl) && (
                  <button
                    className="btn-primary btn-cta-large"
                    onClick={() => {
                      if (trailerVideoId && onPlayTrailer) {
                        onPlayTrailer(movie, trailerVideoId);
                      } else {
                        document.getElementById('movie-trailer')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                  >
                    <Play size={22} fill="#FFFFFF" />
                    <span>Watch Trailer</span>
                  </button>
                )}

                <button
                  className={`btn-secondary btn-cta-large ${inWatchlist ? 'active' : ''}`}
                  onClick={() => toggleWatchlist(movie)}
                >
                  <Bookmark size={22} fill={inWatchlist ? '#E33B46' : 'none'} color={inWatchlist ? '#FF6470' : '#FFFFFF'} />
                  <span>{inWatchlist ? 'Saved in Watchlist' : 'Add to Watchlist'}</span>
                </button>
                <button
                  type="button"
                  className={`btn-secondary btn-cta-large ${engagement.liked ? 'active' : ''}`}
                  onClick={() => void handleLike()}
                  disabled={engagementSaving}
                  aria-pressed={engagement.liked}
                >
                  <Heart size={20} fill={engagement.liked ? 'currentColor' : 'none'} />
                  <span>{engagement.liked ? 'Liked' : 'Like'}</span>
                </button>
                <button type="button" className="btn-outline btn-cta-large" onClick={openReviews}>
                  <MessageSquareText size={19} />
                  <span>Reviews</span>
                </button>
                {profile?.role === 'admin' && (
                  <Link
                    className="btn-outline btn-cta-large movie-admin-edit-link"
                    to={`/admin/movies/edit/${movie.id}`}
                    state={{ returnTo: `${location.pathname}${location.search}` }}
                  >
                    <Pencil size={18} />
                    <span>Edit Movie</span>
                  </Link>
                )}
              </div>

              <div className="movie-detail-rating-hype">
                <div className="movie-detail-rating-card">
                  <span className="movie-detail-metric-label"><Star size={15} fill="currentColor" /> MythicHQ rating</span>
                  <strong>{reviewRatingOutOfTen == null ? '—' : reviewRatingOutOfTen.toFixed(1)}<small>/10</small></strong>
                  <div className="movie-detail-stars" aria-label={`${reviewRatingOutOfTen == null ? 'No rating' : `${reviewRatingOutOfTen.toFixed(1)} out of 10`}`}>
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star key={index} size={14} fill={index < Math.round(mythicRating) ? 'currentColor' : 'none'} />
                    ))}
                  </div>
                </div>
                <div className="movie-detail-rating-card is-imdb">
                  <span className="movie-detail-metric-label"><Star size={15} fill="currentColor" /> IMDb</span>
                  <strong>{movie.imdb_rating == null ? '—' : Number(movie.imdb_rating).toFixed(1)}<small>/10</small></strong>
                  <span className="movie-detail-rating-note">Independent rating</span>
                </div>
                <div className="movie-detail-hype-card">
                  <div className="movie-detail-hype-heading">
                    <span className="movie-detail-metric-label"><Flame size={16} /> Community hype</span>
                    {engagementLoading ? <span className="movie-detail-loading-dot" aria-label="Loading hype" /> : (
                      <span className="movie-detail-hype-label">{hypeLevel}</span>
                    )}
                  </div>
                  <strong>{engagementLoading ? '—' : `${hypePercentage}%`}</strong>
                  <div
                    className="movie-detail-hype-track"
                    role="progressbar"
                    aria-label="Community hype"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={hypePercentage}
                  >
                    <span style={{ width: `${engagementLoading ? 0 : hypePercentage}%` }} />
                  </div>
                </div>
              </div>
              <div className="movie-detail-reaction-row" aria-label="Your movie reaction">
                {HYPE_REACTIONS.map(({ value, label, Icon }) => (
                  <button
                    type="button"
                    className={`movie-detail-reaction ${engagement.reaction === value ? 'is-selected' : ''}`}
                    key={value}
                    onClick={() => void handleReaction(value)}
                    disabled={engagementLoading || engagementSaving}
                    aria-pressed={engagement.reaction === value}
                  >
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>
              {engagementError && <p className="movie-detail-engagement-error" role="status">{engagementError}</p>}

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
        {(trailerVideoId || trailerUrl) && (
          <section className="movie-detail-section movie-detail-trailer" id="movie-trailer" aria-labelledby="movie-trailer-heading">
            <div className="section-header"><h2 id="movie-trailer-heading">Trailer</h2></div>
            <div className="movie-detail-trailer-player">
              {trailerVideoId ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${trailerVideoId}?rel=0`}
                  title={`${movie.title} trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              ) : isDirectVideo ? (
                <video src={trailerUrl} controls preload="metadata" />
              ) : (
                <a href={trailerUrl} target="_blank" rel="noopener noreferrer">
                  <Play size={22} fill="currentColor" />
                  <span>Open trailer</span>
                </a>
              )}
            </div>
          </section>
        )}
        <section className="movie-detail-section movie-detail-synopsis" aria-labelledby="movie-synopsis-heading">
          <div className="section-header">
            <h2 id="movie-synopsis-heading">Synopsis</h2>
          </div>
          <p>{displayedSynopsis}</p>
          {hasLongSynopsis && (
            <button type="button" className="movie-detail-read-more" onClick={() => setSynopsisExpanded((expanded) => !expanded)}>
              {synopsisExpanded ? 'Read less' : 'Read more'}
            </button>
          )}
        </section>

        <section className="movie-detail-section" aria-labelledby="movie-information-heading">
          <div className="section-header"><h2 id="movie-information-heading">Movie Information</h2></div>
          <dl className="movie-information-grid">
            {[
              ['Release date', movie.release_date ? formatDate(movie.release_date) : ''],
              ['Runtime', movie.runtime ? formatRuntime(movie.runtime) : ''],
              ['Genre', detailGenres.join(', ')],
              ['Language', detailLanguages.join(', ')],
              ['Country', movie.country || movie.origin_country?.join(', ') || ''],
              ['Age rating', movie.age_rating || ''],
              ['Director', movie.director || (directorName !== 'Unknown' ? directorName : '')],
              ['Writer', movie.writer || (movie.writers || []).join(', ')],
              ['Production company', movie.production_company || (movie.production_companies || []).map((company) => company.name).join(', ')],
              ['Budget', formatMoney(movie.budget)],
              ['Box office', formatMoney(movie.box_office)],
              ['Status', movie.movie_status || movie.release_status || ''],
            ].filter(([, value]) => value)
              .map(([label, value]) => (
                <div className="movie-information-item" key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>
        </section>

        {castCrewCards.length > 0 && (
          <section className="home-section">
            <div className="section-header">
              <h2>Cast</h2>
            </div>

            <div className="cast-grid">
              {castCrewCards.map((person) => {
                return (
                  <Link
                    key={person.id}
                    className="cast-card movie-credits-card movie-cast-profile-link"
                    to={`/cast/${encodeURIComponent(person.castMemberId || person.name)}`}
                    aria-label={`View ${person.name}'s cast profile`}
                  >
                    {person.imageUrl ? (
                      <img src={person.imageUrl} alt="" className="cast-avatar" loading="lazy" />
                    ) : (
                      <div className="cast-avatar-fallback"><UserCheck size={25} /></div>
                    )}
                    <div className="cast-info">
                      <h4>{person.name}</h4>
                      <p>{person.character || 'Actor'}</p>
                      <span className="movie-cast-profile-hint">View profile</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {crewCards.length > 0 && (
          <section className="home-section movie-crew-section" aria-labelledby="movie-crew-heading">
            <div className="section-header"><h2 id="movie-crew-heading">Crew</h2></div>
            {Object.entries(crewGroups).map(([department, people]) => (
              <div className="movie-crew-group" key={department}>
                <h3>{department}</h3>
                <div className="cast-grid">
                  {people.map((person) => (
                    <article key={person.id} className="cast-card movie-credits-card">
                      {person.imageUrl
                        ? <img src={person.imageUrl} alt="" className="cast-avatar" loading="lazy" />
                        : <div className="cast-avatar-fallback"><UserCheck size={25} /></div>}
                      <div className="cast-info">
                        <h4>{person.name}</h4>
                        <p>{person.job}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {watchProviderEntries.length > 0 && (
          <section className="movie-detail-section" aria-labelledby="where-to-watch-heading">
            <div className="section-header"><h2 id="where-to-watch-heading">Where to Watch</h2></div>
            <div className="movie-provider-grid">
              {watchProviderEntries.map((provider, index) => {
                const providerUrl = isSafeHttpUrl(provider.url) ? provider.url : '';
                const providerLogo = isSafeHttpUrl(provider.logo_url)
                  ? provider.logo_url
                  : getOttPlatformMeta(provider.name).logo;
                const ProviderTag = providerUrl ? 'a' : 'div';
                return (
                  <ProviderTag
                    className="movie-provider-card"
                    href={providerUrl || undefined}
                    target={providerUrl ? '_blank' : undefined}
                    rel={providerUrl ? 'noopener noreferrer' : undefined}
                    key={`${provider.name}-${index}`}
                  >
                    {providerLogo
                      ? <img src={providerLogo} alt="" loading="lazy" />
                      : <span className="movie-provider-mark">{provider.name.slice(0, 1).toUpperCase()}</span>}
                    <span>{provider.name}</span>
                    {providerUrl && <span className="movie-provider-action">Watch</span>}
                  </ProviderTag>
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
        <div id="movie-reviews" className="movie-detail-reviews-anchor">
          <MovieReviews
            movieId={movie.id}
            showComposer={false}
            hideCommunityCounts
            onSummaryChange={handleReviewSummary}
          />
        </div>
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
            <MovieReviews movieId={movie.id} showReviewList={false} hideCommunityCounts />
          </section>
        </div>
      )}
    </div>
  );
};

export default MovieDetails;

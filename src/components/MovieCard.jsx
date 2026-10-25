import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Play, Share2, Star } from 'lucide-react';
import { getImageUrl, getBackdropUrl } from '../services/tmdb';
import { getReleaseYear } from '../utils/helpers';
import { useWatchlist } from '../pages/Admin/WatchlistContext';
import { getMovieDetailRoute } from '../services/movieCatalog';
import RatingBadge from './RatingBadge';
import CropImage from './CropImage';
import { TrendingRankBadge } from '../contexts/TrendingRankContext';

const STOP_CARD_PREVIEW_EVENT = 'mythichq:stop-card-preview';
const PREVIEW_HOVER_DELAY = 550;

const MovieCard = ({ movie, rank = null, trendingRank = false, showTrendingBadge = true, newReleaseBadge = false, showTitle = true, showMetadata = false, showWatchlist = true, recommendationCard = false, variant = 'default', onMovieClick = null, onWatchlistClick = null }) => {
  const navigate = useNavigate();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const previewInstanceId = useId();
  const cardRef = useRef(null);
  const previewTimerRef = useRef(null);
  const [previewActive, setPreviewActive] = useState(false);
  const [previewShiftX, setPreviewShiftX] = useState(0);
  const [shareMessage, setShareMessage] = useState('');

  const cardMovie = movie || {};
  const genres = (Array.isArray(cardMovie.genre) ? cardMovie.genre : Array.isArray(cardMovie.genres) ? cardMovie.genres : [])
    .map((genre) => typeof genre === 'string' ? genre : genre?.name || '')
    .filter(Boolean)
    .slice(0, 2);
  const description = String(cardMovie.overview || cardMovie.description || cardMovie.short_description || '').trim();
  const rating = Number(cardMovie.imdb_rating || cardMovie.vote_average || cardMovie.rating || 0);
  const ratingLabel = Number(cardMovie.imdb_rating) > 0 ? 'IMDb' : 'TMDB';
  const cardPreviewActive = previewActive && !recommendationCard;

  const stopPreview = useCallback(() => {
    window.clearTimeout(previewTimerRef.current);
    previewTimerRef.current = null;
    setPreviewActive(false);
  }, []);

  useEffect(() => {
    const handleOtherPreview = (event) => {
      if (event.detail !== previewInstanceId) stopPreview();
    };

    window.addEventListener(STOP_CARD_PREVIEW_EVENT, handleOtherPreview);
    return () => {
      window.clearTimeout(previewTimerRef.current);
      window.removeEventListener(STOP_CARD_PREVIEW_EVENT, handleOtherPreview);
    };
  }, [previewInstanceId, stopPreview]);

  useEffect(() => {
    if (!previewActive || !cardRef.current || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) stopPreview();
    }, { threshold: 0.05 });
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [previewActive, stopPreview]);

  useEffect(() => {
    if (!previewActive) return undefined;
    const handleVisibilityChange = () => {
      if (document.hidden) stopPreview();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [previewActive, stopPreview]);

  if (!movie) return null;

  const handlePointerEnter = (event) => {
    if (recommendationCard || window.innerWidth <= 767 || event.pointerType === 'touch' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    window.clearTimeout(previewTimerRef.current);
    previewTimerRef.current = window.setTimeout(() => {
      if (document.hidden) return;
      const cardRect = cardRef.current?.getBoundingClientRect();
      if (cardRect) {
        const railRect = cardRef.current.closest('.horizontal-scroll-container')?.getBoundingClientRect();
        const visibleRight = Math.min(window.innerWidth - 16, railRect?.right ?? window.innerWidth - 16);
        const visibleLeft = Math.max(16, railRect?.left ?? 16);
        const expandedWidth = Math.min(340, window.innerWidth - 48);
        const overflowRight = cardRect.left + expandedWidth - visibleRight;
        setPreviewShiftX(Math.min(Math.max(0, overflowRight), Math.max(0, cardRect.left - visibleLeft)));
      }
      window.dispatchEvent(new CustomEvent(STOP_CARD_PREVIEW_EVENT, { detail: previewInstanceId }));
      setPreviewActive(true);
    }, PREVIEW_HOVER_DELAY);
  };

  const posterUrl = movie.poster_path?.startsWith?.('http') || movie.poster_path?.startsWith?.('/')
    ? movie.poster_path
    : getImageUrl(movie.poster_path, 'w500');
  const backdropUrl = movie.backdrop_path?.startsWith?.('http')
    ? movie.backdrop_path
    : getBackdropUrl(movie.backdrop_path, 'w780');
  const inWatchlist = isInWatchlist(movie);
  const releaseYear = getReleaseYear(movie.release_date);
  const tvBadgeLabels = {
    trending: 'Trending',
    popular: 'Popular',
    rising: 'Rising',
    new: 'New',
    top_rated: 'Top Rated',
    editors_pick: "Editor's Pick",
  };
  const tvBadges = movie.content_type === 'tv_show'
    ? [...new Set([...(movie.badges || []), ...(movie.is_trending ? ['trending'] : []), ...(movie.is_popular ? ['popular'] : []), ...(movie.is_rising ? ['rising'] : []), ...(movie.is_new ? ['new'] : []), ...(movie.is_top_rated ? ['top_rated'] : []), ...(movie.editors_pick ? ['editors_pick'] : [])])]
    : [];
  const movieBadges = movie.record_type !== 'tv_show' && Array.isArray(movie.badges)
    ? [...new Set(movie.badges.filter((badge) => typeof badge === 'string' && badge.trim()))]
    : [];
  const badgeLabels = {
    trending: 'Trending',
    popular: 'Popular',
    rising: 'Rising',
    new: 'New',
    top_rated: 'Top Rated',
    editors_pick: "Editor's Pick",
  };

  const handleCardClick = (e) => {
    if (e.target.closest('.watchlist-card-btn')) return;
    const destination = getMovieDetailRoute(movie);
    if (onMovieClick) {
      onMovieClick(movie, destination);
      return;
    }
    navigate(destination);
  };

  const handleWatchlistToggle = (e) => {
    e.stopPropagation();
    if (onWatchlistClick) {
      onWatchlistClick(movie, getMovieDetailRoute(movie));
      return;
    }
    toggleWatchlist(movie);
  };

  const handlePreviewPlay = (event) => {
    event.stopPropagation();
    handleCardClick(event);
  };

  const handlePreviewShare = async (event) => {
    event.stopPropagation();
    const shareUrl = new URL(getMovieDetailRoute(movie), window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: movie.title, url: shareUrl });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareMessage('Link copied');
      } else {
        setShareMessage('Sharing is not available in this browser');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Unable to share movie link', error);
        setShareMessage('Could not share link');
      }
    }
  };

  return (
    <div
      ref={cardRef}
      className={`movie-card${cardPreviewActive ? ' movie-card-preview-active' : ''}${recommendationCard ? ' movie-card-recommendation' : ''}${trendingRank ? ' movie-card-trending-rank' : ''}${variant === 'home' ? ' home-movie-card' : ''}`}
      style={cardPreviewActive ? {
        width: 'min(340px, calc(100vw - 48px))',
        maxWidth: 'calc(100vw - 48px)',
        flexBasis: 'min(340px, calc(100vw - 48px))',
        '--movie-card-preview-shift-x': `${-previewShiftX}px`,
      } : undefined}
      onClick={handleCardClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={stopPreview}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        handleCardClick(event);
      }}
      role="link"
      tabIndex={0}
      aria-label={`View details for ${movie.title || 'movie'}`}
    >
      {/* Poster Image Container */}
      <div
        className="movie-poster-wrapper"
        style={cardPreviewActive ? {
          width: '100%',
          height: 'auto',
          aspectRatio: '16 / 9',
          marginLeft: 0,
          borderRadius: '11px 11px 0 0',
          boxShadow: 'none',
        } : undefined}
      >
        {posterUrl ? (
          <CropImage
            src={posterUrl}
            alt={movie.title || 'Movie Poster'}
            className="movie-poster-img"
            loading={posterUrl.startsWith('/movie-assets/') ? 'eager' : 'lazy'}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}

        {/* Fallback visual if image fails or missing */}
        <div
          className="movie-poster-fallback"
          style={{ display: posterUrl ? 'none' : 'flex', '--poster-seed': movie.id % 360 }}
        >
          <div className="fallback-backdrop-blur" style={{ backgroundImage: backdropUrl ? `url(${backdropUrl})` : 'none' }} />
          <FilmIconFallback title={movie.title} />
        </div>

        {cardPreviewActive && (
          <div className="movie-card-preview" aria-hidden="true">
            {(backdropUrl || posterUrl) && (
              <img
                src={backdropUrl || posterUrl}
                alt=""
                loading="eager"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div className="movie-card-preview-shade" />
          </div>
        )}

        {/* Top Overlay Gradient */}
        <div className="card-top-gradient" />

        {showTrendingBadge && <TrendingRankBadge movie={movie} />}
        {newReleaseBadge && (
          <span className="new-release-card-badge" aria-label="New release">
            NEW RELEASE
          </span>
        )}

        {variant === 'home' && trendingRank && (
          <div className="home-trending-card-overlay" aria-label={movie.title}>
            <span className="home-trending-card-title">{movie.title}</span>
          </div>
        )}

        {/* Watchlist Quick Button */}
        {showWatchlist && movie.record_type !== 'tv_show' && (
          <button
            className={`watchlist-card-btn ${inWatchlist ? 'active' : ''}`}
            onClick={handleWatchlistToggle}
            title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
            aria-label="Toggle Watchlist"
          >
            <Bookmark size={18} fill={inWatchlist ? '#E50914' : 'none'} color={inWatchlist ? '#E50914' : '#FFFFFF'} />
          </button>
        )}
        {recommendationCard && Number(movie.vote_average) > 0 && (
          <span className="movie-recommendation-rating" aria-label={`Rating ${Number(movie.vote_average).toFixed(1)} out of 10`}>
            <Star size={12} fill="currentColor" /> {Number(movie.vote_average).toFixed(1)}
          </span>
        )}
        {movieBadges.length > 0 && (
          <div className={`movie-card-badges${trendingRank ? ' trending-card-badges' : ''}`} aria-label={`Movie badges: ${movieBadges.map((badge) => badgeLabels[badge] || badge).join(', ')}`}>
            {movieBadges.map((badge) => (
              <span key={badge} className={trendingRank && badge === 'new' ? 'is-recently-added' : ''}>
                {trendingRank && badge === 'new' ? 'Recently added' : badgeLabels[badge] || badge}
              </span>
            ))}
          </div>
        )}
        {tvBadges.length > 0 && (
          <div className={`movie-tv-badges${trendingRank ? ' trending-card-badges' : ''}`} aria-label="TV Show badges">
            {tvBadges.map((badge) => <span key={badge}>{tvBadgeLabels[badge] || badge}</span>)}
          </div>
        )}

      </div>

      {cardPreviewActive && (
        <div className="movie-card-expanded-details">
          <h3>{movie.title}</h3>
          <div className="movie-card-expanded-metadata">
            {releaseYear && <span>{releaseYear}</span>}
            {genres.length > 0 && <span>{genres.join(' · ')}</span>}
            {rating > 0 && <span>{ratingLabel} {rating.toFixed(1)}</span>}
            <span>{movie.record_type === 'tv_show' || movie.content_type === 'tv_show' ? 'TV' : 'Movie'}</span>
          </div>
          <div className="movie-card-expanded-actions">
            <button type="button" className="movie-card-expanded-play" onClick={handlePreviewPlay} aria-label={`View ${movie.title} details`}>
              <Play size={19} fill="currentColor" />
            </button>
            <button type="button" className="movie-card-expanded-share" onClick={handlePreviewShare} aria-label={`Share ${movie.title}`}>
              <Share2 size={19} />
            </button>
            {shareMessage && <span className="movie-card-expanded-share-message" aria-live="polite">{shareMessage}</span>}
          </div>
          {description && <p className="movie-card-expanded-description">{description}</p>}
        </div>
      )}

      {rank && <div className="movie-rank-badge" aria-label={`Trending rank ${rank}`}>{rank}</div>}

      {/* Card Content Info */}
      {showTitle && (
        <div className={`movie-card-info${variant === 'home' ? ' home-card-info' : ''}`}>
          {variant === 'home' ? (
            <>
              <div className="home-card-metadata">
                <span className="movie-card-year">{releaseYear}</span>
              </div>
              <h3 className="movie-card-title home-card-title" title={movie.title}>
                {movie.title}
              </h3>
            </>
          ) : (
            <>
              {showMetadata && !rank && (
                <div className="movie-card-header">
                  <RatingBadge rating={movie.vote_average || 0} size="small" />
                  <span className="movie-card-year">{releaseYear}</span>
                </div>
              )}
              <h3 className="movie-card-title" title={movie.title}>
                {movie.title}
              </h3>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const FilmIconFallback = ({ title }) => (
  <div className="fallback-inner">
    <div className="fallback-icon">🎬</div>
    <span className="fallback-title">{title}</span>
  </div>
);

export default MovieCard;

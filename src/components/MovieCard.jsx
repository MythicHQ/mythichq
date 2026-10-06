import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Play, Info } from 'lucide-react';
import { getImageUrl, getBackdropUrl } from '../services/tmdb';
import { getReleaseYear } from '../utils/helpers';
import { useWatchlist } from '../pages/Admin/WatchlistContext';
import { getMovieDetailRoute } from '../services/movieCatalog';
import RatingBadge from './RatingBadge';

const MovieCard = ({ movie, rank = null, showTitle = true, showMetadata = false, showWatchlist = true, onPlayTrailer = null, onMovieClick = null, onWatchlistClick = null }) => {
  const navigate = useNavigate();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  if (!movie) return null;

  const posterUrl = movie.poster_path?.startsWith?.('http') || movie.poster_path?.startsWith?.('/')
    ? movie.poster_path
    : getImageUrl(movie.poster_path, 'w500');
  const backdropUrl = getBackdropUrl(movie.backdrop_path, 'w780');
  const inWatchlist = isInWatchlist(movie.id);
  const releaseYear = getReleaseYear(movie.release_date);

  const handleCardClick = (e) => {
    // Prevent navigation if clicking interactive buttons
    if (e.target.closest('.card-action-btn') || e.target.closest('.watchlist-card-btn')) return;
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

  const handleTrailerClick = (e) => {
    e.stopPropagation();
    if (onPlayTrailer) {
      onPlayTrailer(movie);
    } else if (onMovieClick) {
      onMovieClick(movie, `${getMovieDetailRoute(movie)}?playTrailer=true`);
    } else {
      navigate(`${getMovieDetailRoute(movie)}?playTrailer=true`);
    }
  };

  return (
    <div className="movie-card" onClick={handleCardClick}>
      {/* Poster Image Container */}
      <div className="movie-poster-wrapper">
        {posterUrl ? (
          <img
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

        {/* Top Overlay Gradient */}
        <div className="card-top-gradient" />

        {/* Watchlist Quick Button */}
        {showWatchlist && (
          <button
            className={`watchlist-card-btn ${inWatchlist ? 'active' : ''}`}
            onClick={handleWatchlistToggle}
            title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
            aria-label="Toggle Watchlist"
          >
            <Bookmark size={18} fill={inWatchlist ? '#E50914' : 'none'} color={inWatchlist ? '#E50914' : '#FFFFFF'} />
          </button>
        )}

        {/* Card Hover Action Buttons Overlay */}
        <div className="card-hover-overlay">
          <button className="card-action-btn primary-action" onClick={handleTrailerClick}>
            <Play size={16} fill="#FFFFFF" />
            <span>Trailer</span>
          </button>
          <button className="card-action-btn secondary-action" onClick={() => {
            const destination = getMovieDetailRoute(movie);
            if (onMovieClick) onMovieClick(movie, destination);
            else navigate(destination);
          }}>
            <Info size={16} />
            <span>Details</span>
          </button>
        </div>
      </div>

      {rank && <div className="movie-rank-badge" aria-label={`Trending rank ${rank}`}>{rank}</div>}

      {/* Card Content Info */}
      {showTitle && (
        <div className="movie-card-info">
          {showMetadata && !rank && (
            <div className="movie-card-header">
              <RatingBadge rating={movie.vote_average || 0} size="small" />
              <span className="movie-card-year">{releaseYear}</span>
            </div>
          )}
          <h3 className="movie-card-title" title={movie.title}>
            {movie.title}
          </h3>
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

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Star } from 'lucide-react';
import { getImageUrl, getBackdropUrl } from '../services/tmdb';
import { getReleaseYear } from '../utils/helpers';
import { useWatchlist } from '../pages/Admin/WatchlistContext';
import { getMovieDetailRoute } from '../services/movieCatalog';
import RatingBadge from './RatingBadge';
import CropImage from './CropImage';

const MovieCard = ({ movie, rank = null, trendingRank = false, showTitle = true, showMetadata = false, showWatchlist = true, recommendationCard = false, onMovieClick = null, onWatchlistClick = null }) => {
  const navigate = useNavigate();
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  if (!movie) return null;

  const posterUrl = movie.poster_path?.startsWith?.('http') || movie.poster_path?.startsWith?.('/')
    ? movie.poster_path
    : getImageUrl(movie.poster_path, 'w500');
  const backdropUrl = getBackdropUrl(movie.backdrop_path, 'w780');
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

  return (
    <div
      className={`movie-card${recommendationCard ? ' movie-card-recommendation' : ''}${trendingRank ? ' movie-card-trending-rank' : ''}`}
      onClick={handleCardClick}
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
      <div className="movie-poster-wrapper">
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

        {/* Top Overlay Gradient */}
        <div className="card-top-gradient" />

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
          <div className="movie-card-badges" aria-label={`Movie badges: ${movieBadges.map((badge) => badgeLabels[badge] || badge).join(', ')}`}>
            {movieBadges.map((badge) => (
              <span key={badge} className={trendingRank && badge === 'new' ? 'is-recently-added' : ''}>
                {trendingRank && badge === 'new' ? 'Recently added' : badgeLabels[badge] || badge}
              </span>
            ))}
          </div>
        )}
        {tvBadges.length > 0 && (
          <div className="movie-tv-badges" aria-label="TV Show badges">
            {tvBadges.map((badge) => <span key={badge}>{tvBadgeLabels[badge] || badge}</span>)}
          </div>
        )}

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

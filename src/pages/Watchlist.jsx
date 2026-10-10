import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bookmark, Trash2, Film, Star, Sparkles } from 'lucide-react';
import { useWatchlist } from './Admin/WatchlistContext';
import MovieCard from '../components/MovieCard';

const Watchlist = ({ onPlayTrailer }) => {
  const navigate = useNavigate();
  const { watchlist, clearWatchlist } = useWatchlist();

  const totalSaved = watchlist.length;
  const avgRating =
    totalSaved > 0
      ? (
          watchlist.reduce((sum, m) => sum + (m.vote_average || 0), 0) / totalSaved
        ).toFixed(1)
      : '0.0';

  return (
    <div className="page-container watchlist-page">
      <div className="watchlist-header-dashboard">
        <div className="watchlist-title-box">
          <div className="header-badge-row">
            <Bookmark size={28} color="#E50914" />
            <h1>My Watchlist</h1>
          </div>
          <p>Your personal collection of bookmarked films to watch next.</p>
        </div>

        {totalSaved > 0 && (
          <div className="watchlist-stats">
            <div className="stat-card">
              <span className="stat-value">{totalSaved}</span>
              <span className="stat-label">Saved Movies</span>
            </div>

            <div className="stat-card">
              <span className="stat-value">⭐ {avgRating}</span>
              <span className="stat-label">Avg Rating</span>
            </div>

            <button className="btn-clear-watchlist" onClick={clearWatchlist} title="Clear Watchlist">
              <Trash2 size={16} />
              <span>Clear All</span>
            </button>
          </div>
        )}
      </div>

      {totalSaved > 0 ? (
        <div className="movies-grid">
          {watchlist.map((movie) => (
            <MovieCard key={movie.id} movie={movie} onPlayTrailer={onPlayTrailer} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🔖</div>
          <h3>Your Watchlist is Empty</h3>
          <p>Explore trending movies, top-rated classics, or use our decision engine to save movies for later.</p>
          <div className="empty-actions">
            <button className="btn-primary" onClick={() => navigate('/movies')}>
              Browse Movies
            </button>
            <button className="btn-secondary" onClick={() => navigate('/trending')}>
              See Trending Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Watchlist;

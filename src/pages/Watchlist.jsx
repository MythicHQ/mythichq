import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Film, Star, Trash2, Clapperboard } from 'lucide-react';
import { useWatchlist } from './Admin/WatchlistContext';
import MovieCard from '../components/MovieCard';

const Watchlist = ({ onPlayTrailer }) => {
  const navigate = useNavigate();
  const { watchlist, watchlistLoading, clearWatchlist } = useWatchlist();

  const totalSaved = watchlist.length;
  const avgRating = totalSaved
    ? (watchlist.reduce((sum, movie) => sum + (Number(movie.vote_average) || 0), 0) / totalSaved).toFixed(1)
    : '0.0';

  return (
    <main className="page-container watchlist-page">
      <header className="watchlist-hero">
        <div className="watchlist-hero-copy">
          <span className="watchlist-eyebrow"><Bookmark size={14} /> YOUR COLLECTION</span>
          <h1>My Watchlist</h1>
          <p>A personal shortlist of stories you want to come back to.</p>
        </div>
        <div className="watchlist-hero-actions">
          <div className="watchlist-stat-card">
            <span className="watchlist-stat-icon"><Film size={17} /></span>
            <span className="watchlist-stat-value">{watchlistLoading ? '—' : totalSaved}</span>
            <span className="watchlist-stat-label">SAVED TITLES</span>
          </div>
          <div className="watchlist-stat-card is-rating">
            <span className="watchlist-stat-icon"><Star size={16} /></span>
            <span className="watchlist-stat-value">{watchlistLoading ? '—' : avgRating}</span>
            <span className="watchlist-stat-label">AVG. RATING</span>
          </div>
          {!watchlistLoading && totalSaved > 0 && (
            <button type="button" className="watchlist-clear-button" onClick={clearWatchlist} title="Clear Watchlist">
              <Trash2 size={16} /> <span>Clear list</span>
            </button>
          )}
        </div>
      </header>

      {watchlistLoading ? (
        <div className="watchlist-loading" role="status"><span className="watchlist-loading-spinner" /><span>Loading your list…</span></div>
      ) : totalSaved > 0 ? (
        <section className="watchlist-library" aria-labelledby="watchlist-library-title">
          <div className="watchlist-library-heading">
            <div>
              <span className="watchlist-library-kicker">PICK UP WHERE YOU LEFT OFF</span>
              <h2 id="watchlist-library-title">Saved for later</h2>
            </div>
            <span className="watchlist-count-pill">{totalSaved} {totalSaved === 1 ? 'title' : 'titles'}</span>
          </div>
          <div className="movies-grid watchlist-movies-grid">
            {watchlist.map((movie) => (
              <MovieCard key={`${movie.record_type || 'movie'}-${movie.id}`} movie={movie} onPlayTrailer={onPlayTrailer} />
            ))}
          </div>
        </section>
      ) : (
        <section className="watchlist-empty" aria-labelledby="watchlist-empty-title">
          <div className="watchlist-empty-art" aria-hidden="true">
            <span className="watchlist-empty-orbit orbit-one" />
            <span className="watchlist-empty-orbit orbit-two" />
            <span className="watchlist-empty-icon"><Clapperboard size={34} /></span>
          </div>
          <span className="watchlist-library-kicker">YOUR NEXT FAVORITE IS OUT THERE</span>
          <h2 id="watchlist-empty-title">Your list is waiting.</h2>
          <p>Save movies you’re curious about and they’ll be right here when you’re ready.</p>
          <div className="watchlist-empty-actions">
            <button type="button" className="btn-primary" onClick={() => navigate('/movies')}>Explore movies</button>
            <button type="button" className="btn-secondary" onClick={() => navigate('/trending')}>Browse trending</button>
          </div>
        </section>
      )}
    </main>
  );
};

export default Watchlist;

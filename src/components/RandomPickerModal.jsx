import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dices, X, Play, Info, Sparkles, RefreshCw } from 'lucide-react';
import { fetchRandomMovie, getImageUrl, getBackdropUrl } from '../services/tmdb';
import { GENRES_MAP, getRatingBadge } from '../utils/helpers';
import { PICK_A_MOVIE } from '../data/movieCollections';
import { getMovieDetailRoute } from '../services/movieCatalog';

const RandomPickerModal = ({ isOpen, onClose, onPlayTrailer }) => {
  const navigate = useNavigate();
  const [selectedGenre, setSelectedGenre] = useState('');
  const [minRating, setMinRating] = useState(7.0);
  const [loading, setLoading] = useState(false);
  const [resultMovie, setResultMovie] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handlePickMovie = async () => {
    setLoading(true);
    setError(null);
    setResultMovie(null);

    try {
      const candidates = PICK_A_MOVIE.filter((movie) => (
        (!selectedGenre || movie.genre_ids?.includes(Number(selectedGenre)))
        && movie.vote_average >= minRating
      ));
      const movie = candidates.length > 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : await fetchRandomMovie(selectedGenre, minRating);
      if (movie) {
        setResultMovie(movie);
      } else {
        setError('No movies matched your criteria. Try lowering the minimum rating or picking another genre!');
      }
    } catch (err) {
      setError('Could not fetch recommendations right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const genreList = [
    { id: '', name: '🎲 Any Genre' },
    ...Object.entries(GENRES_MAP).map(([id, name]) => ({ id, name })),
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="picker-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={24} />
        </button>

        <div className="picker-modal-header">
          <div className="picker-title-badge">
            <Sparkles size={18} color="#FF2E4D" />
            <span>Movie Decision Engine</span>
          </div>
          <h2>Don't Know What to Watch?</h2>
          <p>Let MythicHQ pick a top-rated movie matched to your mood.</p>
        </div>

        {/* Filter Controls */}
        <div className="picker-filters">
          <div className="picker-field">
            <label>Select Genre</label>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="picker-select"
            >
              {genreList.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="picker-field">
            <label>
              Minimum Rating: <strong style={{ color: '#FF2E4D' }}>{minRating.toFixed(1)} +</strong>
            </label>
            <input
              type="range"
              min="5.0"
              max="8.5"
              step="0.5"
              value={minRating}
              onChange={(e) => setMinRating(parseFloat(e.target.value))}
              className="picker-range"
            />
            <div className="range-labels">
              <span>5.0</span>
              <span>7.0</span>
              <span>8.5+</span>
            </div>
          </div>
        </div>

        {/* Trigger Button */}
        <button
          className={`picker-submit-btn ${loading ? 'loading' : ''}`}
          onClick={handlePickMovie}
          disabled={loading}
        >
          {loading ? (
            <>
              <RefreshCw className="spin-icon" size={20} />
              <span>Rolling the Dice...</span>
            </>
          ) : (
            <>
              <Dices size={22} />
              <span>🎲 Pick a Movie</span>
            </>
          )}
        </button>

        {/* Error State */}
        {error && <div className="picker-error">{error}</div>}

        {/* Result Movie Display Card */}
        {resultMovie && !loading && (
          <div className="picker-result-card">
            <div className="picker-result-backdrop">
              <img src={getBackdropUrl(resultMovie.backdrop_path, 'w780')} alt="" />
              <div className="result-backdrop-overlay" />
            </div>

            <div className="picker-result-body">
              <img
                src={getImageUrl(resultMovie.poster_path, 'w342')}
                alt={resultMovie.title}
                className="picker-result-poster"
              />
              <div className="picker-result-info">
                <div className="result-rating-row">
                  <span className="result-badge">{getRatingBadge(resultMovie.vote_average).label}</span>
                  <span className="result-year">{resultMovie.release_date?.split('-')[0]}</span>
                </div>
                <h3>{resultMovie.title}</h3>
                <p className="result-overview">{resultMovie.overview || 'No description available.'}</p>

                <div className="picker-result-actions">
                  <button
                    className="btn-primary"
                    onClick={() => {
                      onClose();
                      if (onPlayTrailer) onPlayTrailer(resultMovie);
                    }}
                  >
                    <Play size={16} fill="#FFFFFF" />
                    <span>Watch Trailer</span>
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      onClose();
                      navigate(getMovieDetailRoute(resultMovie));
                    }}
                  >
                    <Info size={16} />
                    <span>View Details</span>
                  </button>
                  <button className="btn-icon-only" onClick={handlePickMovie} title="Pick Another Movie">
                    <RefreshCw size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RandomPickerModal;

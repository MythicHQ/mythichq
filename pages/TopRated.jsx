import React, { useMemo, useState } from 'react';
import { Award, Star } from 'lucide-react';
import { getPublicMovieSections } from '../services/movieCatalog';
import { GENRES_MAP } from '../utils/helpers';
import MovieCard from '../components/MovieCard';
import SkeletonCard from '../components/SkeletonCard';
import { usePublicCatalog } from '../hooks/usePublicCatalog';

const TopRated = ({ onPlayTrailer }) => {
  const [selectedGenre, setSelectedGenre] = useState('');
  const { movies: catalog, loading } = usePublicCatalog();
  const movies = useMemo(() => {
    const topRated = getPublicMovieSections(catalog).curated.topRatedMasterpieces;
    return selectedGenre
      ? topRated.filter((movie) => {
        const genreName = GENRES_MAP[selectedGenre];
        const genreIds = movie.genre_ids || [];
        const genreNames = [
          ...(Array.isArray(movie.genre) ? movie.genre : [movie.genre]),
          ...(Array.isArray(movie.genres) ? movie.genres : []),
        ].map((genre) => String(typeof genre === 'object' ? genre?.name || '' : genre || '').trim().toLowerCase());
        return genreIds.includes(Number(selectedGenre)) || genreNames.includes(genreName.toLowerCase());
      })
      : topRated;
  }, [catalog, selectedGenre]);
  const selectedGenreName = selectedGenre ? GENRES_MAP[selectedGenre] : 'All genres';

  return (
    <div className="page-container top-rated-page">
      <section className="top-rated-hero" aria-labelledby="top-rated-title">
        <div className="top-rated-hero-icon" aria-hidden="true">
          <Award size={28} />
        </div>
        <div className="top-rated-hero-copy">
          <span className="top-rated-hero-kicker">THE HIGHEST-RATED PICKS</span>
          <h1 id="top-rated-title">Top Rated <span>Collection</span></h1>
          <p>Discover audience favorites and critically acclaimed stories, ranked by rating.</p>
        </div>
        <div className="top-rated-hero-count" aria-live="polite">
          <strong>{loading ? '—' : movies.length}</strong>
          <span className="top-rated-count-desktop">{selectedGenre ? `${selectedGenreName} titles` : 'top-rated titles'}</span>
          <span className="top-rated-count-mobile">titles</span>
        </div>
      </section>

      <section className="top-rated-filter-panel" aria-label="Filter top-rated titles by genre">
        <div className="top-rated-filter-heading">
          <div>
            <span className="top-rated-filter-kicker"><Star size={13} fill="currentColor" /> Curated by rating</span>
            <h2>Explore by genre</h2>
          </div>
          <span className="top-rated-filter-selection">{selectedGenreName}</span>
        </div>
        <div className="genre-filter-scroll top-rated-genre-filter">
          <button
            className={`genre-chip ${selectedGenre === '' ? 'active' : ''}`}
            onClick={() => setSelectedGenre('')}
            aria-pressed={selectedGenre === ''}
          >
            All Top Rated
          </button>
          {Object.entries(GENRES_MAP).map(([id, name]) => (
            <button
              key={id}
              className={`genre-chip ${selectedGenre === id ? 'active' : ''}`}
              onClick={() => setSelectedGenre(id)}
              aria-pressed={selectedGenre === id}
            >
              {name}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="movies-grid top-rated-grid">
          <SkeletonCard count={12} />
        </div>
      ) : movies.length > 0 ? (
        <>
          <div className="top-rated-results-heading">
            <div>
              <span>Showing</span>
              <strong>{selectedGenre ? `${selectedGenreName} favorites` : 'Audience favorites'}</strong>
            </div>
            <span className="top-rated-results-count">{movies.length} {movies.length === 1 ? 'title' : 'titles'}</span>
          </div>
          <div className="movies-grid top-rated-grid">
          {movies.map((movie) => (
            <MovieCard
              key={`${movie.record_type || 'movie'}-${movie.id}`}
              movie={movie}
              onPlayTrailer={onPlayTrailer}
            />
          ))}
          </div>
        </>
      ) : (
        <div className="top-rated-empty-state">
          <div className="top-rated-empty-icon"><Star size={22} /></div>
          <h2>No titles in this genre yet</h2>
          <p>Choose another genre to explore more top-rated movies and shows.</p>
          <button className="genre-chip active" onClick={() => setSelectedGenre('')}>Show all top rated</button>
        </div>
      )}
    </div>
  );
};

export default TopRated;

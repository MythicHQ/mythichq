import React, { useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { getPublicMovieSections } from '../services/movieCatalog';
import { GENRES_MAP } from '../utils/helpers';
import MovieCard from '../components/MovieCard';
import SkeletonCard from '../components/SkeletonCard';
import { usePublicCatalog } from '../hooks/usePublicCatalog';

const TopRated = ({ onPlayTrailer }) => {
  const [selectedGenre, setSelectedGenre] = useState('');
  const { movies: catalog, loading } = usePublicCatalog();
  const movies = useMemo(() => {
    const topRated = getPublicMovieSections(catalog).topRated;
    return selectedGenre
      ? topRated.filter((movie) => movie.genre_ids?.includes(Number(selectedGenre)))
      : topRated;
  }, [catalog, selectedGenre]);

  return (
    <div className="page-container top-rated-page">
      <div className="page-header">
        <div className="header-badge-row">
          <Star size={28} color="#F59E0B" />
          <h1>⭐ Top Rated Cinema</h1>
        </div>
        <p>Highest audience & critical acclaim scores of all time.</p>

        {/* Genre Filter Pills */}
        <div className="genre-filter-scroll">
          <button
            className={`genre-chip ${selectedGenre === '' ? 'active' : ''}`}
            onClick={() => setSelectedGenre('')}
          >
            All Top Rated
          </button>
          {Object.entries(GENRES_MAP).map(([id, name]) => (
            <button
              key={id}
              className={`genre-chip ${selectedGenre === id ? 'active' : ''}`}
              onClick={() => setSelectedGenre(id)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="movies-grid">
          <SkeletonCard count={12} />
        </div>
      ) : (
        <div className="movies-grid">
          {movies.map((movie, index) => (
            <MovieCard
              key={`${movie.record_type || 'movie'}-${movie.id}`}
              movie={movie}
              rank={index + 1}
              onPlayTrailer={onPlayTrailer}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TopRated;

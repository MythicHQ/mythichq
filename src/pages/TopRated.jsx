import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { fetchPublicMovies, getPublicMovieSections } from '../services/movieCatalog';
import { GENRES_MAP } from '../utils/helpers';
import MovieCard from '../components/MovieCard';
import SkeletonCard from '../components/SkeletonCard';

const TopRated = ({ onPlayTrailer }) => {
  const [selectedGenre, setSelectedGenre] = useState('');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchPublicMovies()
      .then((catalog) => {
        if (!isMounted) return;

        const { topRated } = getPublicMovieSections(catalog);
        const filteredMovies = selectedGenre
          ? topRated.filter((movie) => movie.genre_ids?.includes(Number(selectedGenre)))
          : topRated;

        setMovies(filteredMovies);
      })
      .catch(() => {
        if (!isMounted) return;
        setMovies([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedGenre]);

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
              key={movie.id}
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

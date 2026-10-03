import React, { useState, useEffect } from 'react';
import { fetchPublicMovies, getPublicMovieSections } from '../services/movieCatalog';
import MovieCard from '../components/MovieCard';
import SkeletonCard from '../components/SkeletonCard';

const Trending = ({ onPlayTrailer }) => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchPublicMovies()
      .then((catalog) => {
        if (!isMounted) return;

        const { trending } = getPublicMovieSections(catalog);
        setMovies(trending.slice(0, 6));
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
  }, []);

  return (
    <div className="page-container trending-page">
      {loading ? (
        <div className="movies-grid">
          <SkeletonCard count={12} />
        </div>
      ) : movies.length > 0 ? (
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
      ) : (
        <div className="empty-state">
          <p>No trending movies available.</p>
        </div>
      )}
    </div>
  );
};

export default Trending;

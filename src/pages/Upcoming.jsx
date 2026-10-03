import React, { useEffect, useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { fetchPublicMovies, getPublicMovieSections } from '../services/movieCatalog';
import { formatDate, getDaysUntil } from '../utils/helpers';
import MovieCard from '../components/MovieCard';
import SkeletonCard from '../components/SkeletonCard';

const Upcoming = ({ onPlayTrailer }) => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchPublicMovies()
      .then((catalog) => {
        if (!isMounted) return;

        const { upcoming } = getPublicMovieSections(catalog);
        setMovies(upcoming);
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
    <div className="page-container upcoming-page">
      <div className="page-header">
        <div className="header-badge-row">
          <Calendar size={28} color="#06B6D4" />
          <h1>🆕 Coming Soon to Theaters</h1>
        </div>
      </div>

      {loading ? (
        <div className="movies-grid">
          <SkeletonCard count={12} />
        </div>
      ) : (
        <div className="movies-grid">
          {movies.map((movie) => {
            const daysLeft = getDaysUntil(movie.release_date);
            return (
              <div key={movie.id} className="upcoming-card-wrapper">
                {daysLeft !== null && daysLeft > 0 && (
                  <div className="upcoming-countdown-badge">
                    <Clock size={12} />
                    <span>In {daysLeft} Days</span>
                  </div>
                )}
                <MovieCard movie={movie} onPlayTrailer={onPlayTrailer} />
                <div className="upcoming-release-date">
                  <span>Target Release: {formatDate(movie.release_date)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Upcoming;

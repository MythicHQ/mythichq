import { Calendar, Clock } from 'lucide-react';
import { getPublicMovieSections } from '../services/movieCatalog';
import { formatDate, getDaysUntil } from '../utils/helpers';
import MovieCard from '../components/MovieCard';
import SkeletonCard from '../components/SkeletonCard';
import { usePublicCatalog } from '../hooks/usePublicCatalog';

const Upcoming = ({ onPlayTrailer }) => {
  const { movies: catalog, loading } = usePublicCatalog();
  const movies = getPublicMovieSections(catalog).upcoming;

  return (
    <div className="page-container upcoming-page">
      <div className="upcoming-hero">
        <div className="upcoming-hero-icon" aria-hidden="true">
          <Calendar size={27} />
        </div>
        <div className="upcoming-hero-copy">
          <span className="upcoming-hero-kicker">UPCOMING RELEASES</span>
          <h1>Coming Soon <span>to Theaters</span></h1>
          <p>Mark your calendar for the stories arriving next on the big screen.</p>
        </div>
        <div className="upcoming-hero-count">
          <strong>{movies.length}</strong>
          <span>upcoming {movies.length === 1 ? 'film' : 'films'}</span>
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

import { Flame } from 'lucide-react';
import { getPublicMovieSections } from '../services/movieCatalog';
import MovieCard from '../components/MovieCard';
import SkeletonCard from '../components/SkeletonCard';
import { usePublicCatalog } from '../hooks/usePublicCatalog';

const Trending = ({ onPlayTrailer }) => {
  const { movies: catalog, loading } = usePublicCatalog();
  const movies = getPublicMovieSections(catalog).trending;

  return (
    <div className="page-container trending-page">
      <div className="trending-page-hero">
        <div className="trending-page-hero-icon" aria-hidden="true">
          <Flame size={27} />
        </div>
        <div className="trending-page-hero-copy">
          <span className="trending-page-hero-kicker">WHAT EVERYONE IS WATCHING</span>
          <h1>Trending <span>Now</span></h1>
          <p>The movies everyone is talking about right now.</p>
        </div>
        <div className="trending-page-hero-count">
          <strong>{loading ? '—' : movies.length}</strong>
          <span>trending {movies.length === 1 ? 'film' : 'films'}</span>
        </div>
      </div>

      {loading ? (
        <div className="movies-grid">
          <SkeletonCard count={12} />
        </div>
      ) : movies.length > 0 ? (
        <div className="movies-grid">
          {movies.map((movie, index) => (
            <MovieCard
              key={`${movie.record_type || 'movie'}-${movie.id}`}
              movie={movie}
              rank={index + 1}
              trendingRank
              showTitle={false}
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

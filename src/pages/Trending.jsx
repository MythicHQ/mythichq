import { getPublicMovieSections } from '../services/movieCatalog';
import MovieCard from '../components/MovieCard';
import SkeletonCard from '../components/SkeletonCard';
import { usePublicCatalog } from '../hooks/usePublicCatalog';

const Trending = ({ onPlayTrailer }) => {
  const { movies: catalog, loading } = usePublicCatalog();
  const movies = getPublicMovieSections(catalog).trending.slice(0, 6);

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

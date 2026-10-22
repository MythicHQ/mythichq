import { CalendarDays, Film } from 'lucide-react';
import { getPublicMovieSections } from '../services/movieCatalog';
import MovieCard from '../components/MovieCard';
import SkeletonCard from '../components/SkeletonCard';
import { usePublicCatalog } from '../hooks/usePublicCatalog';
import { useLocalDate } from '../hooks/useLocalDate';

const NewReleases = ({ onPlayTrailer }) => {
  const { movies: catalog, loading } = usePublicCatalog();
  const today = useLocalDate();
  const movies = getPublicMovieSections(catalog, today).newReleases;

  return (
    <div className="page-container new-releases-page">
      <section className="new-releases-hero" aria-labelledby="new-releases-title">
        <div className="new-releases-hero-icon" aria-hidden="true">
          <CalendarDays size={27} />
        </div>
        <div className="new-releases-hero-copy">
          <span className="new-releases-hero-kicker">FRESH FROM THE VAULT</span>
          <h1 id="new-releases-title">New <span>Releases</span></h1>
          <p>Published movies and TV shows released within the last 60 days.</p>
        </div>
        <div className="new-releases-hero-count" aria-live="polite">
          <strong>{loading ? '—' : movies.length}</strong>
          <span>{movies.length === 1 ? 'new release' : 'new releases'}</span>
        </div>
      </section>

      {loading ? (
        <div className="movies-grid new-releases-grid">
          <SkeletonCard count={12} />
        </div>
      ) : movies.length > 0 ? (
        <>
          <div className="new-releases-results-heading">
            <div>
              <span>Handpicked and recent</span>
              <strong>Just released</strong>
            </div>
            <span>{movies.length} {movies.length === 1 ? 'movie' : 'movies'}</span>
          </div>
          <div className="movies-grid new-releases-grid">
            {movies.map((movie) => (
              <MovieCard
                key={`${movie.record_type || 'movie'}-${movie.id}`}
                movie={movie}
                newReleaseBadge
                showMetadata
                onPlayTrailer={onPlayTrailer}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="new-releases-empty-state">
          <div className="new-releases-empty-icon"><Film size={22} /></div>
          <h2>No new releases right now</h2>
          <p>Published movies and TV shows appear here automatically for 60 days after release.</p>
        </div>
      )}
    </div>
  );
};

export default NewReleases;

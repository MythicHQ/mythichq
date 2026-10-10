import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Film, Search } from 'lucide-react';
import { GENRES_MAP } from '../utils/helpers';
import MovieCard from '../components/MovieCard';
import SearchClearButton from '../components/SearchClearButton';
import { usePublicCatalog } from '../hooks/usePublicCatalog';

const GenreDetail = ({ onPlayTrailer }) => {
  const { id } = useParams();
  const genreName = GENRES_MAP[id] || 'Genre';

  const { movies: catalog, loading } = usePublicCatalog();
  const [query, setQuery] = useState('');

  const visibleMovies = useMemo(() => catalog
    .filter((movie) => {
      const target = genreName.toLowerCase();
      return (movie.genres || []).some((genre) => String(genre?.name || genre).toLowerCase() === target)
        || String(movie.genre || '').toLowerCase().split(',').map((item) => item.trim()).includes(target);
    })
    .filter((movie) => !query.trim() || movie.title.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((first, second) => Number(second.vote_average || 0) - Number(first.vote_average || 0)), [catalog, genreName, query]);

  return (
    <div className="page-container genre-detail-page">
      <Link to="/genres" className="back-link">
        <ArrowLeft size={18} />
        <span>All genres</span>
      </Link>

      <div className="genre-detail-header">
        <h1>{genreName} Movies</h1>
        <p>{visibleMovies.length} titles in your catalog, sorted by rating.</p>
        <label className="genre-results-search">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${genreName} movies`} aria-label={`Search ${genreName} movies`} />
          <SearchClearButton value={query} onClear={() => setQuery('')} label="movie search" />
        </label>
      </div>

      {loading ? <div className="empty-state"><h3>Loading {genreName} movies...</h3></div> : visibleMovies.length > 0 ? (
        <div className="movies-grid genre-results-grid">
          {visibleMovies.map((movie) => <MovieCard key={`${movie.record_type || 'movie'}-${movie.id}`} movie={movie} onPlayTrailer={onPlayTrailer} />)}
        </div>
      ) : <div className="empty-state"><Film size={40} /><h3>No {genreName} movies found</h3><p>Add this genre to a movie to show it here.</p></div>}
    </div>
  );
};

export default GenreDetail;

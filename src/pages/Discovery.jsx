import React, { useMemo, useState } from 'react';
import { Compass, Info, Play, RotateCcw, Search, SlidersHorizontal, Star } from 'lucide-react';
import MovieCard from '../components/MovieCard';
import SearchClearButton from '../components/SearchClearButton';
import { getMovieDetailRoute, getPublicMovieSections } from '../services/movieCatalog';
import { GENRES_MAP } from '../utils/helpers';
import { usePublicCatalog } from '../hooks/usePublicCatalog';

const Discovery = ({ onPlayTrailer }) => {
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');
  const [minRating, setMinRating] = useState('0');
  const [sortBy, setSortBy] = useState('rating');
  const { movies: fetchedMovies } = usePublicCatalog();
  const catalog = useMemo(() => getPublicMovieSections(fetchedMovies).catalog, [fetchedMovies]);

  const years = [...new Set(catalog.map((movie) => movie.release_date?.slice(0, 4)).filter(Boolean))].sort().reverse();
  const toxicMovie = catalog.find((movie) => movie.title.startsWith('Toxic'));

  const movies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = catalog.filter((movie) => {
      const matchesQuery = !normalizedQuery || movie.title.toLowerCase().includes(normalizedQuery) || movie.overview.toLowerCase().includes(normalizedQuery);
      const matchesGenre = !genre || movie.genre_ids?.includes(Number(genre));
      const matchesYear = !year || movie.release_date?.startsWith(year);
      const matchesRating = movie.vote_average >= Number(minRating);
      return matchesQuery && matchesGenre && matchesYear && matchesRating;
    });

    return [...filtered].sort((first, second) => {
      if (sortBy === 'title') return first.title.localeCompare(second.title);
      if (sortBy === 'year') return second.release_date.localeCompare(first.release_date);
      return second.vote_average - first.vote_average;
    });
  }, [catalog, genre, minRating, query, sortBy, year]);

  const clearFilters = () => {
    setQuery('');
    setGenre('');
    setYear('');
    setMinRating('0');
    setSortBy('rating');
  };

  return (
    <div className="page-container discovery-page">
      <div className="page-header discovery-header">
        <div>
          <div className="eyebrow"><Compass size={16} /> OFFLINE DISCOVERY</div>
          <h1>Find Your Next Favorite</h1>
          <p>Search the complete MythicHQ catalog, including the latest Kannada releases.</p>
        </div>
        <div className="discovery-count"><strong>{movies.length}</strong><span>matches</span></div>
      </div>

      {toxicMovie && (
        <section className="discovery-feature" style={{ '--feature-poster': `url(${toxicMovie.poster_path})` }}>
          <div className="discovery-feature-art">
            <img src={toxicMovie.poster_path} alt="Toxic: A Fairy Tale for Grown-ups poster" />
          </div>
          <div className="discovery-feature-copy">
            <span className="eyebrow"><Star size={14} fill="currentColor" /> FEATURED DISCOVERY</span>
            <h2>Toxic: A Fairy Tale for Grown-ups</h2>
            <div className="discovery-feature-meta"><span>Kannada</span><span>•</span><span>2026</span><span>•</span><strong>{toxicMovie.vote_average.toFixed(1)} / 10</strong></div>
            <p>{toxicMovie.overview}</p>
            <div className="discovery-feature-actions">
              <button className="btn-primary" onClick={() => onPlayTrailer?.(toxicMovie)}><Play size={16} fill="currentColor" /> Play trailer</button>
              <a className="btn-outline" href={getMovieDetailRoute(toxicMovie)}><Info size={16} /> More info</a>
            </div>
          </div>
        </section>
      )}

      <section className="discovery-controls" aria-label="Discovery filters">
        <div className="discovery-search">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles or stories" aria-label="Search titles or stories" />
          <SearchClearButton value={query} onClear={() => setQuery('')} label="title search" />
        </div>
        <div className="discovery-filter-row">
          <label><span>Genre</span><select value={genre} onChange={(event) => setGenre(event.target.value)}><option value="">All genres</option>{Object.entries(GENRES_MAP).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label><span>Release year</span><select value={year} onChange={(event) => setYear(event.target.value)}><option value="">All years</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Minimum rating</span><select value={minRating} onChange={(event) => setMinRating(event.target.value)}><option value="0">Any rating</option><option value="9">9.0+ Must watch</option><option value="8">8.0+ Excellent</option><option value="7">7.0+ Worth watching</option><option value="6">6.0+ Average</option></select></label>
          <label><span>Sort by</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="rating">Highest rated</option><option value="year">Newest first</option><option value="title">Title A-Z</option></select></label>
          <button className="btn-reset-filters" onClick={clearFilters}><RotateCcw size={16} /> Reset</button>
        </div>
      </section>

      {movies.length > 0 ? <div className="movies-grid discovery-grid">{movies.map((movie) => <MovieCard key={`${movie.record_type || 'movie'}-${movie.id}`} movie={movie} onPlayTrailer={onPlayTrailer} />)}</div> : <div className="empty-state"><SlidersHorizontal size={42} /><h3>No discoveries found</h3><p>Try relaxing one of your filters.</p><button className="btn-primary" onClick={clearFilters}>Clear filters</button></div>}
    </div>
  );
};

export default Discovery;

import React, { useMemo, useState } from 'react';
import { ArrowRight, Compass, Info, Play, RotateCcw, Search, SlidersHorizontal, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import MovieRail from '../components/MovieRail';
import SearchClearButton from '../components/SearchClearButton';
import { getMovieDetailRoute, getPublicMovieSections } from '../services/movieCatalog';
import { GENRES_MAP } from '../utils/helpers';
import { usePublicCatalog } from '../hooks/usePublicCatalog';

const movieKey = (movie) => `${movie.record_type || 'movie'}-${movie.id}`;

const Discovery = ({ onPlayTrailer }) => {
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');
  const [minRating, setMinRating] = useState('0');
  const [sortBy, setSortBy] = useState('rating');
  const { movies: fetchedMovies } = usePublicCatalog();
  const sections = useMemo(() => getPublicMovieSections(fetchedMovies), [fetchedMovies]);
  const catalog = sections.catalog;

  const years = [...new Set(catalog.map((movie) => movie.release_date?.slice(0, 4)).filter(Boolean))].sort().reverse();
  const featuredMovie = catalog.find((movie) => movie.featured) || catalog.find((movie) => movie.title?.startsWith('Toxic')) || catalog[0];
  const recentlyAdded = useMemo(() => [...catalog]
    .sort((first, second) => new Date(second.created_at || second.release_date || 0) - new Date(first.created_at || first.release_date || 0))
    .slice(0, 12), [catalog]);
  const topRated = useMemo(() => [...catalog]
    .sort((first, second) => Number(second.vote_average || 0) - Number(first.vote_average || 0))
    .slice(0, 12), [catalog]);

  const movies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = catalog.filter((movie) => {
      const title = String(movie.title || '').toLowerCase();
      const overview = String(movie.overview || '').toLowerCase();
      const matchesQuery = !normalizedQuery || title.includes(normalizedQuery) || overview.includes(normalizedQuery);
      const matchesGenre = !genre || movie.genre_ids?.includes(Number(genre));
      const matchesYear = !year || movie.release_date?.startsWith(year);
      const matchesRating = Number(movie.vote_average || 0) >= Number(minRating);
      return matchesQuery && matchesGenre && matchesYear && matchesRating;
    });

    return [...filtered].sort((first, second) => {
      if (sortBy === 'title') return String(first.title || '').localeCompare(String(second.title || ''));
      if (sortBy === 'year') return String(second.release_date || '').localeCompare(String(first.release_date || ''));
      return Number(second.vote_average || 0) - Number(first.vote_average || 0);
    });
  }, [catalog, genre, minRating, query, sortBy, year]);

  const clearFilters = () => {
    setQuery('');
    setGenre('');
    setYear('');
    setMinRating('0');
    setSortBy('rating');
  };

  const heroImage = featuredMovie?.backdrop_path || featuredMovie?.poster_path;

  return (
    <div className="page-container discovery-page">
      <div className="page-header discovery-header">
        <div>
          <div className="eyebrow"><Compass size={16} /> MYTHICHQ DISCOVERY</div>
          <h1>Find your next favorite</h1>
          <p>Great stories, picked from the MythicHQ catalog.</p>
        </div>
        <div className="discovery-count"><strong>{movies.length}</strong><span>titles to explore</span></div>
      </div>

      {featuredMovie && (
        <section className="discovery-feature" style={{ '--feature-image': `url("${heroImage}")` }}>
          <div className="discovery-feature-content">
            <span className="discovery-feature-kicker"><Star size={14} fill="currentColor" /> FEATURED FOR YOU</span>
            <h2>{featuredMovie.title}</h2>
            <div className="discovery-feature-meta">
              {featuredMovie.release_date?.slice(0, 4) && <span>{featuredMovie.release_date.slice(0, 4)}</span>}
              {Number(featuredMovie.vote_average) > 0 && <strong><Star size={14} fill="currentColor" /> {Number(featuredMovie.vote_average).toFixed(1)} rating</strong>}
              {featuredMovie.runtime && <span>{featuredMovie.runtime} min</span>}
            </div>
            <p>{featuredMovie.overview || 'Discover the story everyone is talking about.'}</p>
            <div className="discovery-feature-actions">
              {featuredMovie.trailer_url && <button className="discovery-play-button" onClick={() => onPlayTrailer?.(featuredMovie)}><Play size={17} fill="currentColor" /> Play trailer</button>}
              <Link className="discovery-info-button" to={getMovieDetailRoute(featuredMovie)}><Info size={17} /> More info <ArrowRight size={15} /></Link>
            </div>
          </div>
          <Link className="discovery-feature-hitarea" to={getMovieDetailRoute(featuredMovie)} aria-label={`View ${featuredMovie.title}`} />
        </section>
      )}

      {recentlyAdded.length > 0 && (
        <section className="discovery-shelf">
          <div className="discovery-shelf-heading"><div><span className="discovery-shelf-overline">FRESH ON MYTHICHQ</span><h2>Recently added</h2></div><span className="discovery-shelf-note">The latest stories in the catalog</span></div>
          <MovieRail hideScrollbar>{recentlyAdded.map((movie) => <MovieCard key={`recent-${movieKey(movie)}`} movie={movie} onPlayTrailer={onPlayTrailer} />)}</MovieRail>
        </section>
      )}

      {topRated.length > 0 && (
        <section className="discovery-shelf">
          <div className="discovery-shelf-heading"><div><span className="discovery-shelf-overline">HANDPICKED BY THE CROWD</span><h2>Top rated</h2></div><span className="discovery-shelf-note">Highest audience ratings</span></div>
          <MovieRail hideScrollbar>{topRated.map((movie) => <MovieCard key={`rated-${movieKey(movie)}`} movie={movie} onPlayTrailer={onPlayTrailer} />)}</MovieRail>
        </section>
      )}

      <section className="discovery-catalog-section" aria-label="Browse the full catalog">
        <div className="discovery-catalog-heading">
          <div><span className="discovery-shelf-overline">YOUR NEXT WATCH</span><h2>Explore the catalog</h2></div>
          <span className="discovery-result-count">{movies.length} {movies.length === 1 ? 'title' : 'titles'}</span>
        </div>
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

        {movies.length > 0 ? <div className="movies-grid discovery-grid">{movies.map((movie) => <MovieCard key={movieKey(movie)} movie={movie} onPlayTrailer={onPlayTrailer} />)}</div> : <div className="empty-state"><SlidersHorizontal size={42} /><h3>No discoveries found</h3><p>Try relaxing one of your filters.</p><button className="btn-primary" onClick={clearFilters}>Clear filters</button></div>}
      </section>
    </div>
  );
};

export default Discovery;

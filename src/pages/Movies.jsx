import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchDiscover } from '../services/tmdb';
import { fetchPublicMovies, getCachedPublicMovies } from '../services/movieCatalog';
import MovieCard from '../components/MovieCard';
import SkeletonCard from '../components/SkeletonCard';

const normalizeOptionValues = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const getMovieGenres = (movie) => {
  if (Array.isArray(movie?.genres)) {
    return movie.genres.map((genre) => (typeof genre === 'string' ? genre.trim() : genre.name)).filter(Boolean);
  }

  return normalizeOptionValues(movie?.genre);
};

const getMovieLanguages = (movie) => {
  if (Array.isArray(movie?.languages)) {
    return movie.languages.map((language) => String(language).trim()).filter(Boolean);
  }

  if (Array.isArray(movie?.language)) {
    return movie.language.map((language) => String(language).trim()).filter(Boolean);
  }

  return normalizeOptionValues(movie?.language);
};

const isVisibleFilterOption = (value) => value && !/^\d+$/.test(value.trim());

const Movies = ({ onPlayTrailer }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [movies, setMovies] = useState(() => getCachedPublicMovies() || []);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(() => getCachedPublicMovies() === undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const category = searchParams.get('category') || 'all';
  const [genreFilter, setGenreFilter] = useState('all');
  const languageFilter = searchParams.get('language') || 'all';
  const showResults = searchParams.has('category') || searchParams.has('language') || genreFilter !== 'all';

  const updateFiltersInUrl = (filters) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(filters).forEach(([key, value]) => {
      if (value === null) nextParams.delete(key);
      else nextParams.set(key, value);
    });
    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    let active = true;
    const hasCachedCatalog = getCachedPublicMovies() !== undefined;

    const loadCatalog = async () => {
      setError(null);
      if (!hasCachedCatalog) setLoading(true);
      try {
        const publicMovies = await fetchPublicMovies();
        if (active) {
          setMovies(publicMovies);
          setTotalPages(1);
          setPage(1);
        }
      } catch (err) {
        if (active) setError('Could not load the current movie catalog.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadCatalog();
    return () => {
      active = false;
    };
  }, []);

  const loadMovies = async (pageNum, reset = false) => {
    if (reset) {
      setLoading(true);
      setPage(1);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const data = await fetchDiscover({
        page: pageNum,
      });

      if (reset) {
        setMovies(data.results || []);
      } else {
        setMovies((prev) => [...prev, ...(data.results || [])]);
      }
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      setError('Could not fetch movies matching criteria.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (page < totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadMovies(nextPage, false);
    }
  };

  const genreOptions = useMemo(() => {
    const genres = movies.flatMap((movie) => getMovieGenres(movie));
    return [...new Set(genres.filter(isVisibleFilterOption))].sort((first, second) => first.localeCompare(second));
  }, [movies]);

  const languageOptions = useMemo(() => {
    const languages = movies.flatMap((movie) => getMovieLanguages(movie));
    return [...new Set(languages.filter(isVisibleFilterOption))].sort((first, second) => first.localeCompare(second));
  }, [movies]);

  const activeGenreFilter = genreOptions.includes(genreFilter) ? genreFilter : 'all';

  const visibleMovies = [...movies]
    .filter((movie) => {
      const movieGenres = getMovieGenres(movie);
      const movieLanguages = getMovieLanguages(movie);

      const matchesGenre = activeGenreFilter === 'all' || movieGenres.includes(activeGenreFilter);
      const matchesLanguage = languageFilter === 'all' || movieLanguages.includes(languageFilter);
      const matchesCategory = category === 'all'
        || category === 'popular'
        || (category === 'new' ? movie.status === 'released' : movie.status === category)
        || movieLanguages.includes(category)
        || movieGenres.some((genre) => genre.toLowerCase() === category.toLowerCase());

      return matchesGenre && matchesLanguage && matchesCategory;
    })
    .sort((first, second) => {
      if (category === 'popular') return second.vote_average - first.vote_average;
      if (category === 'new') return new Date(second.release_date || 0) - new Date(first.release_date || 0);
      return 0;
    });

  return (
    <div className="page-container movies-page">
      <div className="page-header movies-header">
        <div className="header-badge-row">
          <h1>All Movies</h1>
          <p className="movies-intro">Find your next favorite from movies worth discovering.</p>
        </div>
        <div className="movie-filter-group">
          <h2 className="movie-filter-label">Browse</h2>
          <div className="genre-filter-scroll" aria-label="Movie categories">
          {[
            ['all', 'All Movies'],
            ['upcoming', 'Upcoming'],
            ['popular', 'Popular'],
            ['International', 'Hollywood'],
            ['Hindi', 'Hindi'],
            ['Telugu', 'Telugu'],
            ['Tamil', 'Tamil'],
            ['Malayalam', 'Malayalam'],
            ['Kannada', 'Kannada'],
            ['Korean', 'Korean'],
            ['Japanese', 'Japanese'],
            ['Marvel', 'Marvel'],
          ].map(([value, label]) => (
            <button key={value} className={`genre-chip ${category === value ? 'active' : ''}`} onClick={() => {
              if (value === 'all') {
                setGenreFilter('all');
                updateFiltersInUrl({ category: 'all', language: null });
                return;
              }
              updateFiltersInUrl({ category: value, language: null });
            }}>
              {label}
            </button>
          ))}
          </div>

        </div>
        <div className="movie-filter-group">
          <h2 className="movie-filter-label">Genre</h2>
          <div className="genre-filter-scroll" aria-label="Genre filters">
          {[
            ['all', 'All Genres'],
            ...genreOptions.map((genre) => [genre, genre]),
          ].map(([value, label]) => (
            <button key={value} className={`genre-chip ${activeGenreFilter === value ? 'active' : ''}`} onClick={() => {
              setGenreFilter(value);
              if (value === 'all' && !showResults) updateFiltersInUrl({ category: 'all' });
            }}>
              {label}
            </button>
          ))}
          </div>

        </div>
        <div className="movie-filter-group">
          <h2 className="movie-filter-label">Language</h2>
          <div className="genre-filter-scroll" aria-label="Language filters">
          {[
            ['all', 'All Languages'],
            ...languageOptions.map((language) => [language, language]),
          ].map(([value, label]) => (
            <button key={value} className={`genre-chip ${languageFilter === value ? 'active' : ''}`} onClick={() => updateFiltersInUrl({ category: 'all', language: value })}>
              {label}
            </button>
          ))}
          </div>
        </div>

      </div>
      {showResults && !loading && (
        <div className="movies-results-summary" aria-live="polite">
          <span>{visibleMovies.length} {visibleMovies.length === 1 ? 'movie' : 'movies'}</span>
          <span>Ready to discover</span>
        </div>
      )}
      {/* MOVIES GRID */}
      {!showResults ? null : loading ? (
        <div className="movies-grid">
          <SkeletonCard count={12} />
        </div>
      ) : visibleMovies.length > 0 ? (
        <>
          <div className="movies-grid">
            {visibleMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} onPlayTrailer={onPlayTrailer} />
            ))}
          </div>

          {/* Load More Pagination */}
          {page < totalPages && (
            <div className="pagination-wrapper">
              <button
                className="btn-load-more"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading More Movies...' : 'Load More Movies'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No Movies Found</h3>
          <p>No movies are currently available.</p>
        </div>
      )}
    </div>
  );
};

export default Movies;

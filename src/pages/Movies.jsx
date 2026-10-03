import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchDiscover } from '../services/tmdb';
import { fetchPublicMovies } from '../services/movieCatalog';
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

const Movies = ({ onPlayTrailer }) => {
  const [searchParams] = useSearchParams();
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState(() => searchParams.get('category') || sessionStorage.getItem('mythichq:movies:category') || 'all');
  const [genreFilter, setGenreFilter] = useState(() => sessionStorage.getItem('mythichq:movies:genre') || 'all');
  const [languageFilter, setLanguageFilter] = useState(() => searchParams.get('language') || sessionStorage.getItem('mythichq:movies:language') || 'all');

  useEffect(() => {
    sessionStorage.setItem('mythichq:movies:category', category);
  }, [category]);

  useEffect(() => {
    sessionStorage.setItem('mythichq:movies:genre', genreFilter);
  }, [genreFilter]);

  useEffect(() => {
    sessionStorage.setItem('mythichq:movies:language', languageFilter);
  }, [languageFilter]);

  useEffect(() => {
    const requestedCategory = searchParams.get('category');
    if (requestedCategory) setCategory(requestedCategory);

    const requestedLanguage = searchParams.get('language');
    if (requestedLanguage) setLanguageFilter(requestedLanguage);
  }, [searchParams]);

  useEffect(() => {
    const loadCatalog = async () => {
      setError(null);
      setLoading(true);
      try {
        const publicMovies = await fetchPublicMovies();
        setMovies(publicMovies);
        setTotalPages(1);
        setPage(1);
      } catch (err) {
        setError('Could not load the current movie catalog.');
      } finally {
        setLoading(false);
      }
    };

    loadCatalog();
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
    return [...new Set(genres)].sort((first, second) => first.localeCompare(second));
  }, [movies]);

  const languageOptions = useMemo(() => {
    const languages = movies.flatMap((movie) => getMovieLanguages(movie));
    return [...new Set(languages)].sort((first, second) => first.localeCompare(second));
  }, [movies]);

  const visibleMovies = [...movies]
    .filter((movie) => {
      const movieGenres = getMovieGenres(movie);
      const movieLanguages = getMovieLanguages(movie);

      const matchesGenre = genreFilter === 'all' || movieGenres.includes(genreFilter);
      const matchesLanguage = languageFilter === 'all' || movieLanguages.includes(languageFilter);
      const matchesCategory = category === 'all'
        || category === 'popular'
        || (category === 'new' ? movie.status === 'released' : movie.status === category)
        || movie.language === category;

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
            <button key={value} className={`genre-chip ${category === value ? 'active' : ''}`} onClick={() => setCategory(value)}>
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
            <button key={value} className={`genre-chip ${genreFilter === value ? 'active' : ''}`} onClick={() => setGenreFilter(value)}>
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
            <button key={value} className={`genre-chip ${languageFilter === value ? 'active' : ''}`} onClick={() => setLanguageFilter(value)}>
              {label}
            </button>
          ))}
          </div>
        </div>

      </div>
      {/* MOVIES GRID */}
      {loading ? (
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

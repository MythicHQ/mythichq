import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import SkeletonCard from '../components/SkeletonCard';
import HomeHero from '../components/HomeHero';
import CatalogGenreRows from '../components/CatalogGenreRows';
import { fetchHeroMovies, fetchPublicMovies, getCachedPublicMovies } from '../services/movieCatalog';
import { getCachedRequest, subscribeToCachedRequest } from '../services/requestCache';

const normalizeOptionValues = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
};

const getMovieGenres = (movie) => {
  const genres = Array.isArray(movie?.genres) ? movie.genres : normalizeOptionValues(movie?.genre);
  return genres.map((genre) => (typeof genre === 'string' ? genre.trim() : genre?.name || '')).filter(Boolean);
};

const getMovieLanguages = (movie) => normalizeOptionValues(movie?.languages || movie?.language);
const isVisibleFilterOption = (value) => value && !/^\d+$/.test(value.trim());

const Movies = ({ onPlayTrailer }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const cachedMovies = getCachedPublicMovies();
  const [movies, setMovies] = useState(() => (cachedMovies || []).filter((movie) => movie.record_type !== 'tv_show' && movie.is_published === true));
  const [heroMovies, setHeroMovies] = useState(() => getCachedRequest('catalog:hero') || []);
  const [loading, setLoading] = useState(() => cachedMovies === undefined);
  const [heroLoading, setHeroLoading] = useState(() => getCachedRequest('catalog:hero') === undefined);
  const [error, setError] = useState('');
  const [heroError, setHeroError] = useState('');
  const category = searchParams.get('category') || 'all';
  const genreFilter = searchParams.get('genre') || 'all';
  const languageFilter = searchParams.get('language') || 'all';
  const hasFilters = category !== 'all' || genreFilter !== 'all' || languageFilter !== 'all';

  const updateFiltersInUrl = (filters) => {
    const nextParams = new URLSearchParams(searchParams);
    Object.entries(filters).forEach(([key, value]) => {
      if (value === null || value === 'all') nextParams.delete(key);
      else nextParams.set(key, value);
    });
    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    let active = true;
    const unsubscribeMovies = subscribeToCachedRequest('catalog:public:database-only', (catalog) => {
      if (active) setMovies(catalog.filter((movie) => movie.record_type !== 'tv_show' && movie.is_published === true));
    });
    const unsubscribeHero = subscribeToCachedRequest('catalog:hero', (selection) => {
      if (active) setHeroMovies(selection.filter((movie) => movie.is_published === true));
    });
    Promise.allSettled([fetchPublicMovies(), fetchHeroMovies()])
      .then(([catalogResult, heroResult]) => {
        if (!active) return;
        if (catalogResult.status === 'fulfilled') {
          setMovies(catalogResult.value.filter((movie) => movie.record_type !== 'tv_show' && movie.is_published === true));
        } else {
          console.error('Failed to load the public movie catalog:', catalogResult.reason);
          setError('Could not load published movies right now.');
        }
        if (heroResult.status === 'fulfilled') {
          setHeroMovies(heroResult.value.filter((movie) => movie.is_published === true));
          setHeroError('');
        } else {
          console.error('Failed to load the movie page hero:', heroResult.reason);
          setHeroError('Could not load featured movies right now.');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setHeroLoading(false);
        }
      });
    return () => {
      active = false;
      unsubscribeMovies();
      unsubscribeHero();
    };
  }, []);

  const genreOptions = useMemo(() => [...new Set(movies.flatMap(getMovieGenres).filter(isVisibleFilterOption))]
    .sort((first, second) => first.localeCompare(second)), [movies]);
  const languageOptions = useMemo(() => [...new Set(movies.flatMap(getMovieLanguages).filter(isVisibleFilterOption))]
    .sort((first, second) => first.localeCompare(second)), [movies]);

  const visibleMovies = useMemo(() => movies
    .filter((movie) => {
      const movieGenres = getMovieGenres(movie);
      const movieLanguages = getMovieLanguages(movie);
      const matchesGenre = genreFilter === 'all' || movieGenres.includes(genreFilter);
      const matchesLanguage = languageFilter === 'all' || movieLanguages.includes(languageFilter);
      const matchesCategory = category === 'all'
        || (category === 'popular' && Number(movie.vote_average) >= 7)
        || (category === 'upcoming' && movie.status === 'upcoming')
        || (category === 'new' && movie.status === 'released')
        || movieLanguages.includes(category)
        || movieGenres.some((genre) => genre.toLowerCase() === category.toLowerCase());
      return matchesGenre && matchesLanguage && matchesCategory;
    })
    .sort((first, second) => {
      if (category === 'popular') return Number(second.vote_average || 0) - Number(first.vote_average || 0);
      if (category === 'new') return new Date(second.release_date || 0) - new Date(first.release_date || 0);
      return 0;
    }), [movies, category, genreFilter, languageFilter]);
  const initialMovies = visibleMovies.slice(0, 12);
  const moreMovies = visibleMovies.slice(12);

  return (
    <div className="home-page catalog-page movies-catalog-page">
      <HomeHero items={heroMovies} onPlayTrailer={onPlayTrailer} loading={heroLoading} />
      <main className="main-content-wrapper catalog-content">
        {heroError && <p className="error-message" role="alert">{heroError}</p>}
        {error && <p className="error-message" role="alert">{error}</p>}
        <section className="home-section catalog-library-section">
          <div className="section-header">
            <div className="section-title-group"><h2>{hasFilters ? 'Matching Movies' : 'All Movies'}</h2></div>
            {!loading && <span className="catalog-item-count">{visibleMovies.length} published</span>}
          </div>
          {loading ? <div className="movies-grid"><SkeletonCard count={12} /></div> : initialMovies.length ? (
            <div className="movies-grid">{initialMovies.map((movie) => <MovieCard key={movie.id} movie={movie} onPlayTrailer={onPlayTrailer} recommendationCard showTitle={false} />)}</div>
          ) : (
            <div className="empty-state"><div className="empty-icon">🔍</div><h3>No Movies Found</h3><p>No published movies match these filters.</p></div>
          )}
        </section>
        {!hasFilters && !loading && <CatalogGenreRows items={movies} contentType="movie" onPlayTrailer={onPlayTrailer} recommendationCard />}
        {moreMovies.length > 0 && (
          <section className="home-section catalog-library-section">
            <div className="section-header"><div className="section-title-group"><h2>More Published Movies</h2></div></div>
            <div className="movies-grid">{moreMovies.map((movie) => <MovieCard key={movie.id} movie={movie} onPlayTrailer={onPlayTrailer} recommendationCard showTitle={false} />)}</div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Movies;

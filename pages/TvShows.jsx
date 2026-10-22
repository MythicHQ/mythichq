import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import SkeletonCard from '../components/SkeletonCard';
import HomeHero from '../components/HomeHero';
import CatalogGenreRows from '../components/CatalogGenreRows';
import { fetchHeroTvShows, fetchPublicTvShows } from '../services/tvShows';
import { getCachedRequest, subscribeToCachedRequest } from '../services/requestCache';

const readGenres = (show) => {
  const value = show.genres || show.genre || [];
  const genres = Array.isArray(value) ? value : String(value || '').split(',');
  return genres.map((genre) => (typeof genre === 'string' ? genre.trim() : genre?.name || '')).filter(Boolean);
};

const TvShows = ({ onPlayTrailer }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const cachedShows = getCachedRequest('catalog:tv-shows');
  const [shows, setShows] = useState(() => (cachedShows || []).filter((show) => show.record_type === 'tv_show' && show.is_published === true));
  const [heroShows, setHeroShows] = useState(() => getCachedRequest('catalog:hero:tv-shows') || []);
  const [loading, setLoading] = useState(() => cachedShows === undefined);
  const [heroLoading, setHeroLoading] = useState(() => getCachedRequest('catalog:hero:tv-shows') === undefined);
  const [error, setError] = useState('');
  const [heroError, setHeroError] = useState('');
  const genreFilter = searchParams.get('genre') || 'all';

  useEffect(() => {
    let active = true;
    const unsubscribeShows = subscribeToCachedRequest('catalog:tv-shows', (catalog) => {
      if (active) setShows(catalog.filter((show) => show.record_type === 'tv_show' && show.is_published === true));
    });
    const unsubscribeHero = subscribeToCachedRequest('catalog:hero:tv-shows', (selection) => {
      if (active) setHeroShows(selection.filter((show) => show.is_published === true));
    });
    Promise.allSettled([fetchPublicTvShows(), fetchHeroTvShows()])
      .then(([catalogResult, heroResult]) => {
        if (!active) return;
        if (catalogResult.status === 'fulfilled') {
          setShows(catalogResult.value.filter((show) => show.record_type === 'tv_show' && show.is_published === true));
        } else {
          console.error('Failed to load the public TV show catalog:', catalogResult.reason);
          setError('Could not load published TV shows right now.');
        }
        if (heroResult.status === 'fulfilled') {
          setHeroShows(heroResult.value.filter((show) => show.is_published === true));
        } else {
          console.error('Failed to load the TV show page hero:', heroResult.reason);
          setHeroError('Could not load featured TV shows right now.');
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
      unsubscribeShows();
      unsubscribeHero();
    };
  }, []);

  const genres = useMemo(() => [...new Set(shows.flatMap(readGenres))]
    .filter((genre) => genre && !/^\d+$/.test(genre))
    .sort((first, second) => first.localeCompare(second)), [shows]);
  const visibleShows = genreFilter === 'all' ? shows : shows.filter((show) => readGenres(show).includes(genreFilter));
  const featuredShows = visibleShows.slice(0, 12);
  const moreShows = visibleShows.slice(12);

  return (
    <div className="home-page catalog-page tv-catalog-page">
      <HomeHero items={heroShows} onPlayTrailer={onPlayTrailer} loading={heroLoading} />
      <main className="main-content-wrapper catalog-content">
        {heroError && <p className="error-message" role="alert">{heroError}</p>}
        <header className="page-header movies-header">
          <div className="header-badge-row">
            <h1>TV Shows</h1>
            <p className="movies-intro">Discover series and TV shows from the MythicHQ catalog.</p>
          </div>
          <div className="movie-filter-group">
            <h2 className="movie-filter-label">Browse by genre</h2>
            <div className="genre-filter-scroll" aria-label="TV show genre filters">
              {[['all', 'All TV Shows'], ...genres.map((genre) => [genre, genre])].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={`genre-chip ${genreFilter === value ? 'active' : ''}`}
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    if (value === 'all') next.delete('genre');
                    else next.set('genre', value);
                    setSearchParams(next, { replace: true });
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </header>
        {error && <p className="error-message" role="alert">{error}</p>}
        <section className="home-section catalog-library-section">
          <div className="section-header">
            <div className="section-title-group"><h2>{genreFilter === 'all' ? 'All TV Shows' : `${genreFilter} TV Shows`}</h2></div>
            {!loading && <span className="catalog-item-count">{visibleShows.length} published</span>}
          </div>
          {loading ? <div className="movies-grid"><SkeletonCard count={12} /></div> : featuredShows.length ? (
            <div className="movies-grid">{featuredShows.map((show) => <MovieCard key={show.id} movie={show} onPlayTrailer={onPlayTrailer} />)}</div>
          ) : (
            <div className="empty-state"><div className="empty-icon">📺</div><h3>No TV Shows Found</h3><p>No published TV shows match this genre.</p></div>
          )}
        </section>
        {genreFilter === 'all' && !loading && <CatalogGenreRows items={shows} contentType="tv" onPlayTrailer={onPlayTrailer} />}
        {moreShows.length > 0 && (
          <section className="home-section catalog-library-section">
            <div className="section-header"><div className="section-title-group"><h2>More Published TV Shows</h2></div></div>
            <div className="movies-grid">{moreShows.map((show) => <MovieCard key={show.id} movie={show} onPlayTrailer={onPlayTrailer} />)}</div>
          </section>
        )}
      </main>
    </div>
  );
};

export default TvShows;

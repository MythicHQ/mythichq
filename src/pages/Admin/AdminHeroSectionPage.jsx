import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowUp, ArrowDown, Plus, Minus, Eye, Check, X } from 'lucide-react';
import { fetchAdminMovies, getMovieDetailRoute } from '../../services/movieCatalog';
import { supabase } from '../../lib/supabase';
import { invalidateCache } from '../../services/requestCache';
import { getBackdropDisplayUrl } from '../../services/tmdb';

const getHeroBackdrop = (movie) => {
  return getBackdropDisplayUrl(movie.backdrop_path || movie.backdrop_url || movie.backdrop);
};

const AdminHeroSectionPage = () => {
  const [movies, setMovies] = useState([]);
  const [heroMovies, setHeroMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadMovies = async () => {
    setLoading(true);
    try {
      const allMovies = await fetchAdminMovies();
      setMovies(allMovies);

      if (!supabase) {
        setHeroMovies([]);
        return;
      }

      const { data, error } = await supabase
        .from('hero_movies')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;

      const selected = (data || [])
        .map((entry) => {
          const movie = allMovies.find((item) => Number(item.id) === Number(entry.movie_id));
          if (!movie) return null;

          return {
            ...movie,
            hero_position: entry.position,
            hero_id: entry.id,
            movie_id: entry.movie_id,
          };
        })
        .filter(Boolean)
        .sort((first, second) => Number(first.hero_position || 0) - Number(second.hero_position || 0));

      setHeroMovies(selected);
    } catch (error) {
      console.error('Failed to load hero movies:', error);
      setHeroMovies([]);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovies();
  }, []);

  const availableMovies = useMemo(() => {
    const heroIds = new Set(heroMovies.map((movie) => Number(movie.id)));
    return movies.filter((movie) => (
      !heroIds.has(Number(movie.id)) && getHeroBackdrop(movie)
    ));
  }, [movies, heroMovies]);

  const filteredMovies = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return availableMovies;

    return availableMovies.filter((movie) => (
      `${movie.title} ${movie.genre || ''} ${movie.language || ''}`.toLowerCase().includes(query)
    ));
  }, [availableMovies, search]);

  const addToHero = async (movie) => {
    if (!supabase) {
      window.alert('Supabase is not configured.');
      return;
    }

    try {
      const { error } = await supabase
        .from('hero_movies')
        .upsert({
          movie_id: movie.id,
          position: heroMovies.length + 1,
        }, {
          onConflict: 'movie_id',
        });

      if (error) throw error;

      invalidateCache('catalog:');
      await loadMovies();
    } catch (error) {
      console.error('Failed to add movie to hero:', error);
      window.alert(error.message || 'Unable to add movie to the hero section.');
    }
  };

  const removeFromHero = async (movieId) => {
    if (!supabase) {
      window.alert('Supabase is not configured.');
      return;
    }

    try {
      const { error } = await supabase
        .from('hero_movies')
        .delete()
        .eq('movie_id', movieId);

      if (error) throw error;

      invalidateCache('catalog:');
      await loadMovies();
    } catch (error) {
      console.error('Failed to remove movie from hero:', error);
      window.alert(error.message || 'Unable to remove movie from the hero section.');
    }
  };

  const moveMovie = async (movieId, direction) => {
    if (!supabase) {
      window.alert('Supabase is not configured.');
      return;
    }

    const sortedMovies = [...heroMovies].sort((first, second) => Number(first.hero_position || 0) - Number(second.hero_position || 0));
    const currentIndex = sortedMovies.findIndex((movie) => Number(movie.id) === Number(movieId));
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= sortedMovies.length) {
      return;
    }

    const currentMovie = sortedMovies[currentIndex];
    const targetMovie = sortedMovies[nextIndex];

    try {
      const nextPositionForCurrent = Number(targetMovie.hero_position || nextIndex + 1);
      const nextPositionForTarget = Number(currentMovie.hero_position || currentIndex + 1);

      const results = await Promise.all([
        supabase
          .from('hero_movies')
          .update({ position: nextPositionForCurrent })
          .eq('movie_id', currentMovie.id),
        supabase
          .from('hero_movies')
          .update({ position: nextPositionForTarget })
          .eq('movie_id', targetMovie.id),
      ]);

      const failedUpdate = results.find((result) => result.error)?.error;
      if (failedUpdate) throw failedUpdate;

      invalidateCache('catalog:');
      await loadMovies();
    } catch (error) {
      console.error('Failed to reorder hero movie:', error);
      window.alert(error.message || 'Unable to reorder the hero section.');
    }
  };

  return (
    <div className="admin-page-shell">
      <div className="admin-header-row">
        <div>
          <p className="admin-kicker">Hero section</p>
          <h1>Home Hero Movies</h1>
          <p className="admin-header-copy">Choose movies with a backdrop image for the homepage hero slider.</p>
        </div>
        <Link to="/admin/movies" className="admin-button admin-button-secondary">View all movies</Link>
      </div>

      <div className="admin-metric-grid">
        <div className="admin-metric-card">
          <div className="admin-metric-icon"><Plus size={18} /></div>
          <div>
            <strong>{heroMovies.length}</strong>
            <span>Selected</span>
          </div>
        </div>
        <div className="admin-metric-card">
          <div className="admin-metric-icon"><Search size={18} /></div>
          <div>
            <strong>{filteredMovies.length}</strong>
            <span>Available</span>
          </div>
        </div>
      </div>

      <div className="admin-panel admin-hero-selected-panel">
        <div className="admin-panel-header">
          <div>
            <p className="admin-panel-eyebrow">Live on homepage</p>
            <h3>Selected hero movies</h3>
          </div>
          <span className="admin-filter-count"><Check size={14} /> {heroMovies.length} selected</span>
        </div>

        {loading ? (
          <div className="admin-empty-state">Loading hero movies...</div>
        ) : heroMovies.length === 0 ? (
          <div className="admin-empty-state">No movies are currently selected for the hero section.</div>
        ) : (
          <div className="admin-section-list admin-hero-selected-list">
            {heroMovies.map((movie, index) => (
              <div className="admin-section-row" key={movie.id}>
                <div className="admin-section-media">
                  {getHeroBackdrop(movie) ? (
                    <img src={getHeroBackdrop(movie)} alt={`${movie.title} backdrop`} />
                  ) : (
                    <span className="admin-hero-no-backdrop">No backdrop</span>
                  )}
                </div>

                <div className="admin-section-copy">
                  <strong>{index + 1}. {movie.title}</strong>
                  <span>{movie.release_date || 'Release date TBD'}</span>
                </div>

                <div className="admin-section-actions">
                  <button
                    type="button"
                    className="admin-icon-btn"
                    onClick={() => moveMovie(movie.id, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${movie.title} up`}
                  >
                    <ArrowUp size={15} />
                  </button>

                  <button
                    type="button"
                    className="admin-icon-btn"
                    onClick={() => moveMovie(movie.id, 1)}
                    disabled={index === heroMovies.length - 1}
                    aria-label={`Move ${movie.title} down`}
                  >
                    <ArrowDown size={15} />
                  </button>

                  <a
                    href={getMovieDetailRoute(movie)}
                    target="_blank"
                    rel="noreferrer"
                    className="admin-icon-btn"
                    aria-label={`View ${movie.title}`}
                  >
                    <Eye size={15} />
                  </a>

                  <button
                    type="button"
                    className="admin-icon-btn danger"
                    onClick={() => removeFromHero(movie.id)}
                    aria-label={`Remove ${movie.title} from hero`}
                  >
                    <Minus size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="admin-panel admin-hero-picker-panel">
        <div className="admin-panel-header">
          <div>
            <p className="admin-panel-eyebrow">Add a movie</p>
            <h3>Choose a movie with a backdrop</h3>
          </div>
          <span className="admin-filter-count">{filteredMovies.length} available</span>
        </div>

        <label className="admin-hero-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by movie title, language, or genre"
            aria-label="Search movies to add to the hero"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="Clear movie search">
              <X size={17} />
            </button>
          )}
        </label>

        <div className="admin-hero-movie-grid">
          {filteredMovies.length === 0 ? (
            <div className="admin-empty-state">No movies with a backdrop match your search.</div>
          ) : (
            filteredMovies.map((movie) => (
              <div className="admin-hero-movie-card" key={movie.id}>
                <img src={getHeroBackdrop(movie)} alt={`${movie.title} backdrop`} />
                <div className="admin-hero-movie-card-copy">
                  <strong>{movie.title}</strong>
                  <span>{movie.language || 'English'}{movie.release_date ? ` · ${movie.release_date.slice(0, 4)}` : ''}</span>
                </div>
                <button type="button" className="admin-button admin-button-primary admin-hero-add-button" onClick={() => addToHero(movie)}>
                  <Plus size={16} />
                  Add
                </button>
                <a href={getMovieDetailRoute(movie)} target="_blank" rel="noreferrer" className="admin-hero-preview-link">
                  <Eye size={14} /> Preview
                </a>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminHeroSectionPage;

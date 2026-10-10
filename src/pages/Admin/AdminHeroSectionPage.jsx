import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowUp, ArrowDown, Plus, Minus, Eye, Check, X } from 'lucide-react';
import { fetchAdminMovies, getMovieDetailRoute } from '../../services/movieCatalog';
import { fetchAdminTvShows } from '../../services/tvShows';
import { supabase } from '../../lib/supabase';
import { invalidateCache } from '../../services/requestCache';
import { getBackdropDisplayUrl } from '../../services/tmdb';
import CropImage from '../../components/CropImage';
import ImageCropButton from '../../components/ImageCropButton';

const getHeroBackdrop = (movie) => {
  return getBackdropDisplayUrl(movie.backdrop_path || movie.backdrop_url || movie.backdrop);
};

const AdminHeroSectionPage = () => {
  const [content, setContent] = useState([]);
  const [heroContent, setHeroContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadMovies = async () => {
    setLoading(true);
    try {
      const [allMovies, allShows] = await Promise.all([fetchAdminMovies(), fetchAdminTvShows()]);
      const allContent = [...allMovies, ...allShows];
      setContent(allContent);

      if (!supabase) {
        setHeroContent([]);
        return;
      }

      const [movieSelection, showSelection] = await Promise.all([
        supabase.from('hero_movies').select('*').order('position', { ascending: true }),
        supabase.from('hero_tv_shows').select('*').order('position', { ascending: true }),
      ]);
      if (movieSelection.error) throw movieSelection.error;
      if (showSelection.error) throw showSelection.error;

      const selected = [
        ...(movieSelection.data || []).map((entry) => {
          const item = allMovies.find((movie) => Number(movie.id) === Number(entry.movie_id));
          return item ? { ...item, hero_position: entry.position, hero_id: entry.id } : null;
        }),
        ...(showSelection.data || []).map((entry) => {
          const item = allShows.find((show) => Number(show.id) === Number(entry.tv_show_id));
          return item ? { ...item, hero_position: entry.position, hero_id: entry.id } : null;
        }),
      ]
        .filter(Boolean)
        .sort((first, second) => Number(first.hero_position || 0) - Number(second.hero_position || 0));

      setHeroContent(selected);
    } catch (error) {
      console.error('Failed to load home hero content:', error);
      setHeroContent([]);
      setContent([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovies();
  }, []);

  const availableContent = useMemo(() => {
    const heroIds = new Set(heroContent.map((item) => `${item.record_type}:${item.id}`));
    return content.filter((item) => item.is_published === true && (
      !heroIds.has(`${item.record_type}:${item.id}`) && getHeroBackdrop(item)
    ));
  }, [content, heroContent]);

  const filteredContent = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return availableContent;

    return availableContent.filter((item) => (
      `${item.title} ${item.genre || ''} ${item.language || ''}`.toLowerCase().includes(query)
    ));
  }, [availableContent, search]);

  const addToHero = async (item) => {
    if (!supabase) {
      window.alert('Supabase is not configured.');
      return;
    }

    try {
      const isTvShow = item.record_type === 'tv_show';
      const { error } = await supabase
        .from(isTvShow ? 'hero_tv_shows' : 'hero_movies')
        .upsert({
          [isTvShow ? 'tv_show_id' : 'movie_id']: item.id,
          position: heroContent.length + 1,
        }, {
          onConflict: isTvShow ? 'tv_show_id' : 'movie_id',
        });

      if (error) throw error;

      invalidateCache('catalog:');
      await loadMovies();
    } catch (error) {
      console.error('Failed to add movie to hero:', error);
      window.alert(error.message || 'Unable to add content to the homepage hero section.');
    }
  };

  const removeFromHero = async (item) => {
    if (!supabase) {
      window.alert('Supabase is not configured.');
      return;
    }

    try {
      const isTvShow = item.record_type === 'tv_show';
      const { error } = await supabase
        .from(isTvShow ? 'hero_tv_shows' : 'hero_movies')
        .delete()
        .eq(isTvShow ? 'tv_show_id' : 'movie_id', item.id);

      if (error) throw error;

      invalidateCache('catalog:');
      await loadMovies();
    } catch (error) {
      console.error('Failed to remove movie from hero:', error);
      window.alert(error.message || 'Unable to remove content from the homepage hero section.');
    }
  };

  const moveContent = async (item, direction) => {
    if (!supabase) {
      window.alert('Supabase is not configured.');
      return;
    }

    const sortedContent = [...heroContent].sort((first, second) => Number(first.hero_position || 0) - Number(second.hero_position || 0));
    const currentIndex = sortedContent.findIndex((entry) => entry.record_type === item.record_type && Number(entry.id) === Number(item.id));
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= sortedContent.length) {
      return;
    }

    const reordered = [...sortedContent];
    [reordered[currentIndex], reordered[nextIndex]] = [reordered[nextIndex], reordered[currentIndex]];

    try {
      const results = await Promise.all(reordered.map((entry, position) => supabase
        .from(entry.record_type === 'tv_show' ? 'hero_tv_shows' : 'hero_movies')
        .update({ position: position + 1 })
        .eq(entry.record_type === 'tv_show' ? 'tv_show_id' : 'movie_id', entry.id)));

      const failedUpdate = results.find((result) => result.error)?.error;
      if (failedUpdate) throw failedUpdate;

      invalidateCache('catalog:');
      await loadMovies();
    } catch (error) {
      console.error('Failed to reorder homepage hero content:', error);
      window.alert(error.message || 'Unable to reorder the hero section.');
    }
  };

  return (
    <div className="admin-page-shell">
      <div className="admin-header-row">
        <div>
          <p className="admin-kicker">Hero section</p>
          <h1>Home Hero Selection</h1>
          <p className="admin-header-copy">Choose published movies and TV shows with a backdrop for the homepage hero slider.</p>
        </div>
        <Link to="/admin/movies" className="admin-button admin-button-secondary">View all movies</Link>
      </div>

      <div className="admin-metric-grid">
        <div className="admin-metric-card">
          <div className="admin-metric-icon"><Plus size={18} /></div>
          <div>
            <strong>{heroContent.length}</strong>
            <span>Selected</span>
          </div>
        </div>
        <div className="admin-metric-card">
          <div className="admin-metric-icon"><Search size={18} /></div>
          <div>
            <strong>{filteredContent.length}</strong>
            <span>Available</span>
          </div>
        </div>
      </div>

      <div className="admin-panel admin-hero-selected-panel">
        <div className="admin-panel-header">
          <div>
            <p className="admin-panel-eyebrow">Live on homepage</p>
            <h3>Selected home hero content</h3>
          </div>
          <span className="admin-filter-count"><Check size={14} /> {heroContent.length} selected</span>
        </div>

        {loading ? (
          <div className="admin-empty-state">Loading hero content...</div>
        ) : heroContent.length === 0 ? (
          <div className="admin-empty-state">No movies or TV shows are currently selected for the home hero section.</div>
        ) : (
          <div className="admin-section-list admin-hero-selected-list">
            {heroContent.map((movie, index) => (
              <div className="admin-section-row" key={`${movie.record_type}-${movie.id}`}>
                <div className="admin-section-media">
                  {getHeroBackdrop(movie) ? (
                    <CropImage src={getHeroBackdrop(movie)} alt={`${movie.title} backdrop`} />
                  ) : (
                    <span className="admin-hero-no-backdrop">No backdrop</span>
                  )}
                </div>

                <div className="admin-section-copy">
                  <strong>{index + 1}. {movie.title}</strong>
                  <span>{movie.record_type === 'tv_show' ? 'TV Show' : 'Movie'} · {movie.release_date || movie.premiere_date || 'Release date TBD'}</span>
                </div>

                <div className="admin-section-actions">
                  <button
                    type="button"
                    className="admin-icon-btn"
                    onClick={() => moveContent(movie, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${movie.title} up`}
                  >
                    <ArrowUp size={15} />
                  </button>

                  <button
                    type="button"
                    className="admin-icon-btn"
                    onClick={() => moveContent(movie, 1)}
                    disabled={index === heroContent.length - 1}
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
                    onClick={() => removeFromHero(movie)}
                    aria-label={`Remove ${movie.title} from hero`}
                  >
                    <Minus size={15} />
                  </button>
                  <ImageCropButton source={getHeroBackdrop(movie)} label={`${movie.title} hero backdrop`} aspectRatio="16:9" className="admin-button admin-button-secondary admin-hero-crop-button" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="admin-panel admin-hero-picker-panel">
        <div className="admin-panel-header">
          <div>
            <p className="admin-panel-eyebrow">Add home hero content</p>
            <h3>Choose a movie or TV show with a backdrop</h3>
          </div>
          <span className="admin-filter-count">{filteredContent.length} available</span>
        </div>

        <label className="admin-hero-search">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title, language, or genre"
            aria-label="Search movies and TV shows to add to the home hero"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="Clear movie search">
              <X size={17} />
            </button>
          )}
        </label>

        <div className="admin-hero-movie-grid">
          {filteredContent.length === 0 ? (
            <div className="admin-empty-state">No published movies or TV shows with a backdrop match your search.</div>
          ) : (
            filteredContent.map((movie) => (
              <div className="admin-hero-movie-card" key={`${movie.record_type}-${movie.id}`}>
                <CropImage src={getHeroBackdrop(movie)} alt={`${movie.title} backdrop`} />
                <div className="admin-hero-movie-card-copy">
                  <strong>{movie.title}</strong>
                  <span>{movie.record_type === 'tv_show' ? 'TV Show' : 'Movie'} · {movie.language || 'English'}{(movie.release_date || movie.premiere_date) ? ` · ${(movie.release_date || movie.premiere_date).slice(0, 4)}` : ''}</span>
                </div>
                <button type="button" className="admin-button admin-button-primary admin-hero-add-button" onClick={() => addToHero(movie)}>
                  <Plus size={16} />
                  Add
                </button>
                <ImageCropButton source={getHeroBackdrop(movie)} label={`${movie.title} hero backdrop`} aspectRatio="16:9" className="admin-button admin-button-secondary admin-hero-crop-button" />
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

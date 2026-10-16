import React, { useEffect, useMemo, useRef, useState } from 'react';
import CropImage from '../../components/CropImage';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2, Search, Filter, CheckCircle, Circle, Film, Clock3, Layers3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchAdminContent, getMovieDetailRoute } from '../../services/movieCatalog';
import { deleteMovieStorageAssets } from '../../services/movieStorage';
import { deleteTvShow } from '../../services/tvShows';
import { invalidateCache } from '../../services/requestCache';
import { normalizeSearchText } from '../../utils/movieSearch';
import SearchClearButton from '../../components/SearchClearButton';

const getMovieGenreNames = (movie) => {
  const genreValues = Array.isArray(movie.genres)
    ? movie.genres
    : Array.isArray(movie.genre)
      ? movie.genre
      : String(movie.genre || '').split(',');

  return genreValues
    .map((genre) => (typeof genre === 'string' ? genre : genre?.name || ''))
    .map((genre) => genre.trim())
    .filter(Boolean);
};

const getAlternateTitles = (movie) => {
  const values = [
    movie.original_title,
    movie.alternate_title,
    movie.alternative_title,
    movie.alternate_names,
    movie.alternate_titles,
    movie.aliases,
    movie.aka,
  ];
  return values.flatMap((value) => {
    const entries = Array.isArray(value) ? value : [value];
    return entries
      .map((entry) => {
        const title = typeof entry === 'string' ? entry : entry?.title || entry?.name;
        return typeof title === 'string' ? title.trim() : '';
      })
      .filter(Boolean);
  });
};

const AdminMoviesPage = () => {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [status, setStatus] = useState('all');
  const [year, setYear] = useState('all');
  const [genre, setGenre] = useState('all');

  const loadMovies = async () => {
    setLoading(true);
    setLoadError('');
    try {
      setMovies(await fetchAdminContent());
    } catch (error) {
      console.error('Failed to load admin movies:', error);
      setMovies([]);
      setLoadError(error.message || 'Unable to load movies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovies();
  }, []);

  useEffect(() => {
    if (!searchOpen) return undefined;
    const closeWhenOutside = (event) => {
      if (!searchRef.current?.contains(event.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', closeWhenOutside);
    return () => document.removeEventListener('mousedown', closeWhenOutside);
  }, [searchOpen]);

  const years = useMemo(() => [...new Set(movies.map((movie) => movie.release_date?.slice(0, 4)).filter(Boolean))].sort().reverse(), [movies]);
  const genres = useMemo(() => [...new Set(movies.flatMap(getMovieGenreNames))].sort(), [movies]);
  const searchableMovies = useMemo(() => movies.map((movie) => ({
    movie,
    title: normalizeSearchText(movie.title || ''),
    alternateTitles: getAlternateTitles(movie).map(normalizeSearchText),
  })), [movies]);
  const suggestions = useMemo(() => {
    const query = normalizeSearchText(search);
    if (!query) return [];
    return searchableMovies
      .map((record) => {
        const titles = [record.title, ...record.alternateTitles];
        const score = Math.max(0, ...titles.map((title, index) => {
          if (!title) return 0;
          const weight = index === 0 ? 1 : 0.8;
          if (title === query) return 400 * weight;
          if (title.startsWith(query)) return 300 * weight;
          if (title.includes(query)) return 200 * weight;
          return 0;
        }));
        return { ...record, score };
      })
      .filter((record) => record.score > 0)
      .sort((first, second) => second.score - first.score
        || String(first.movie.title || '').localeCompare(String(second.movie.title || '')))
      .slice(0, 8)
      .map(({ movie }) => movie);
  }, [searchableMovies, search]);
  const filteredMovies = useMemo(() => movies.filter((movie) => {
    const query = normalizeSearchText(search);
    const movieGenres = getMovieGenreNames(movie);
    const searchableText = normalizeSearchText([
      movie.title,
      ...getAlternateTitles(movie),
      ...movieGenres,
      movie.language,
    ].join(' '));
    const matchesSearch = !query || searchableText.includes(query);
    const matchesStatus = status === 'all' || (status === 'published' ? movie.is_published === true : movie.is_published !== true);
    const matchesYear = year === 'all' || movie.release_date?.startsWith(year);
    const matchesGenre = genre === 'all' || movieGenres.some((name) => name.toLowerCase() === genre.toLowerCase());
    return matchesSearch && matchesStatus && matchesYear && matchesGenre;
  }), [movies, search, status, year, genre]);
  const publishedCount = movies.filter((movie) => movie.is_published === true).length;
  const draftCount = movies.length - publishedCount;

  const openMovie = (movie) => {
    setSearchOpen(false);
    setActiveSuggestion(-1);
    navigate(movie.record_type === 'tv_show'
      ? `/admin/tv-shows/edit/${encodeURIComponent(movie.id)}`
      : `/admin/movies/edit/${encodeURIComponent(movie.id)}`);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault();
      setSearchOpen(true);
      setActiveSuggestion((current) => Math.min(current + 1, suggestions.length - 1));
    } else if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault();
      setSearchOpen(true);
      setActiveSuggestion((current) => Math.max(current - 1, -1));
    } else if (event.key === 'Enter' && searchOpen && suggestions.length) {
      event.preventDefault();
      openMovie(suggestions[activeSuggestion >= 0 ? activeSuggestion : 0]);
    } else if (event.key === 'Escape') {
      setSearchOpen(false);
      setActiveSuggestion(-1);
    }
  };

  const handleDelete = async (movie) => {
    const confirmed = window.confirm(`Delete "${movie.title}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      if (!supabase) throw new Error('Movie deletion is unavailable because Supabase is not configured.');
      if (movie.record_type === 'tv_show') {
        await deleteTvShow(movie);
      } else {
        const { data: deletedMovies, error } = await supabase
          .from('movies')
          .delete()
          .eq('id', movie.id)
          .select('id');
        if (error) throw error;
        if (!deletedMovies?.length) {
          throw new Error('The movie was not deleted. Check your admin permissions and try again.');
        }
        await deleteMovieStorageAssets(movie);
      }
      invalidateCache('catalog:');
      setMovies((current) => current.filter((item) => (
        item.id !== movie.id || item.record_type !== movie.record_type
      )));
    } catch (error) {
      window.alert(error.message || 'Movie could not be deleted.');
    }
  };

  const handleTogglePublished = async (movie) => {
    if (!supabase) return;
    const nextPublished = movie.is_published !== true;
    const { error } = await supabase.from(movie.record_type === 'tv_show' ? 'tv_shows' : 'movies')
      .update({ is_published: nextPublished })
      .eq('id', movie.id);
    if (error) {
      window.alert(error.message || 'Unable to update publishing status.');
      return;
    }
    invalidateCache('catalog:');
    setMovies((current) => current.map((item) => (
      item.id === movie.id && item.record_type === movie.record_type
        ? { ...item, is_published: nextPublished }
        : item
    )));
  };

  return (
    <div className="admin-page-shell content-library-page">
      <div className="admin-header-row">
        <div>
          <p className="admin-kicker">Content library</p>
          <h1>Content library</h1>
          <p className="admin-header-copy">A clear view of every title, release, and publishing status.</p>
        </div>
        <Link to="/admin/movies/add" className="admin-button admin-button-primary"><Film size={16} /> Add a title</Link>
      </div>

      <div className="library-overview" aria-label="Content library overview">
        <article><span className="library-overview-icon"><Film size={18} /></span><div><strong>{movies.length}</strong><span>Total titles</span></div></article>
        <article><span className="library-overview-icon is-green"><CheckCircle size={18} /></span><div><strong>{publishedCount}</strong><span>Published</span></div></article>
        <article><span className="library-overview-icon is-gold"><Clock3 size={18} /></span><div><strong>{draftCount}</strong><span>Drafts</span></div></article>
        <article><span className="library-overview-icon is-blue"><Layers3 size={18} /></span><div><strong>{genres.length}</strong><span>Genres</span></div></article>
      </div>

      <div className="admin-filter-bar">
        <div className="admin-search-field-wrap" ref={searchRef}>
          <label className="admin-search-field">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setSearchOpen(true);
                setActiveSuggestion(-1);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search movies and TV Shows by title..."
              aria-label="Search movies and TV Shows by title"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={searchOpen && Boolean(search.trim())}
              aria-controls="admin-movie-search-suggestions"
              aria-activedescendant={activeSuggestion >= 0 ? `admin-movie-suggestion-${activeSuggestion}` : undefined}
            />
            <SearchClearButton value={search} onClear={() => { setSearch(''); setSearchOpen(false); setActiveSuggestion(-1); }} label="movie search" />
          </label>
          {searchOpen && search.trim() && (
            <div className="admin-movie-search-dropdown" id="admin-movie-search-suggestions" role="listbox" aria-label="Content suggestions">
              {suggestions.length ? suggestions.map((movie, index) => {
                const year = String(movie.release_date || '').match(/^\d{4}/)?.[0] || 'Year unavailable';
                const poster = movie.poster_path || movie.poster_url || movie.poster;
                return (
                  <button
                    type="button"
                    id={`admin-movie-suggestion-${index}`}
                    className={`admin-movie-search-suggestion ${activeSuggestion === index ? 'is-active' : ''}`}
                    role="option"
                    aria-selected={activeSuggestion === index}
                    key={`${movie.record_type || 'movie'}-${movie.id}`}
                    onMouseEnter={() => setActiveSuggestion(index)}
                    onClick={() => openMovie(movie)}
                  >
                    {poster
                      ? <CropImage src={poster} alt="" onError={(event) => {
                        if (event.currentTarget.dataset.fallback) {
                          event.currentTarget.hidden = true;
                          return;
                        }
                        event.currentTarget.dataset.fallback = 'true';
                        event.currentTarget.src = '/movie-assets/posters/default-poster.jpg';
                      }} />
                      : <span className="admin-movie-search-poster-fallback"><Film size={16} /></span>}
                    <span className="admin-movie-search-suggestion-copy"><strong>{movie.title || 'Untitled movie'}</strong><small>{year}</small></span>
                    {movie.is_published !== true && <span className="admin-movie-search-draft">Draft</span>}
                  </button>
                );
              }) : !loading ? (
                <div className="admin-movie-search-empty" role="status">No titles found</div>
              ) : (
                <div className="admin-movie-search-empty" role="status">Loading movies…</div>
              )}
            </div>
          )}
        </div>
        <label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All status</option><option value="published">Published</option><option value="draft">Drafts</option></select></label>
        <label><span>Genre</span><select value={genre} onChange={(event) => setGenre(event.target.value)}><option value="all">All genres</option>{genres.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span>Year</span><select value={year} onChange={(event) => setYear(event.target.value)}><option value="all">All years</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <span className="admin-filter-count"><Filter size={14} /> Showing {filteredMovies.length} of {movies.length}</span>
      </div>

      {loading ? (
        <div className="empty-state">        <h3>Loading content...</h3></div>
      ) : loadError ? (
        <div className="empty-state" role="alert">
          <h3>Unable to load movies</h3>
          <p>{loadError}</p>
          <button type="button" className="admin-button admin-button-secondary" onClick={() => void loadMovies()}>Try again</button>
        </div>
      ) : (
        <div className="admin-table-wrap library-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Poster</th>
                <th>Title</th>
                <th>Genre</th>
                <th>Release Date</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovies.map((movie) => {
                const movieGenres = getMovieGenreNames(movie);
                const visibleGenres = movieGenres.slice(0, 3);
                const remainingGenres = movieGenres.slice(3);

                return (
                  <tr key={`${movie.record_type || 'movie'}-${movie.id}`}>
                    <td>
                      <CropImage className="admin-poster-thumb" src={movie.poster_path || movie.poster_url || '/movie-assets/posters/default-poster.jpg'} alt={movie.title} />
                    </td>
                    <td>
                      <div className="admin-movie-cell">
                        {(movie.title_image_display_url || movie.title_image_url) && (
                          <CropImage
                            className="admin-title-image-thumb"
                            src={movie.title_image_display_url || movie.title_image_url}
                            alt=""
                            onError={(event) => { event.currentTarget.hidden = true; }}
                          />
                        )}
                        <div><strong>{movie.title}</strong><span>{movie.content_type === 'tv_show' ? `TV Show · ${movie.runtime || 0} min/episode` : `${movie.language || 'English'} · ${movie.runtime || 0} min`}</span></div>
                      </div>
                    </td>
                    <td>
                      {movieGenres.length > 0 ? (
                        <div className="admin-genre-list">
                          {visibleGenres.map((name) => <span className="admin-genre-chip" key={name}>{name}</span>)}
                          {remainingGenres.length > 0 && (
                            <span className="admin-genre-chip admin-genre-more" title={remainingGenres.join(', ')}>
                              +{remainingGenres.length}
                            </span>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td>{movie.release_date || '—'}</td>
                    <td><span className="admin-rating">★ {Number(movie.rating || movie.vote_average || 0).toFixed(1)}</span></td>
                    <td><span className={`admin-status ${movie.is_published !== true ? 'is-draft' : ''}`}>{movie.is_published === true ? <><CheckCircle size={11} /> Published</> : <><Circle size={11} /> Draft</>}</span></td>
                    <td>
                      <div className="admin-action-row">
                        <button className="admin-icon-btn" title="View" onClick={() => window.open(getMovieDetailRoute(movie), '_blank')}><Eye size={15} /></button>
                        <button className="admin-icon-btn" title="Edit" onClick={() => openMovie(movie)}><Pencil size={15} /></button>
                        <button className="admin-icon-btn" title={movie.is_published === true ? 'Unpublish' : 'Publish'} onClick={() => handleTogglePublished(movie)}>{movie.is_published === true ? <Circle size={15} /> : <CheckCircle size={15} />}</button>
                        <button className="admin-icon-btn danger" title="Delete" onClick={() => handleDelete(movie)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredMovies.length === 0 && <tr><td colSpan="7"><div className="admin-empty-state"><strong>No titles found</strong><span>Try a different search or add your first title.</span><Link to="/admin/movies/add" className="admin-button admin-button-primary">+ Add title</Link></div></td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminMoviesPage;

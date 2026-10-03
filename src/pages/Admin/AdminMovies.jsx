import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2, Search, Filter, Copy, CheckCircle, Circle, Film, Clock3, Layers3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LOCAL_MOVIES } from '../../data/localMovies';
import { fetchAdminMovies, getMovieDetailRoute } from '../../services/movieCatalog';
import { deleteMovieStorageAssets } from '../../services/movieStorage';
import { invalidateCache } from '../../services/requestCache';

const AdminMoviesPage = () => {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [year, setYear] = useState('all');
  const [genre, setGenre] = useState('all');

  const loadMovies = async () => {
    setLoading(true);
    try {
      setMovies(await fetchAdminMovies());
    } catch (error) {
      console.error('Failed to load admin movies:', error);
      setMovies(LOCAL_MOVIES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovies();
  }, []);

  const years = useMemo(() => [...new Set(movies.map((movie) => movie.release_date?.slice(0, 4)).filter(Boolean))].sort().reverse(), [movies]);
  const genres = useMemo(() => [...new Set(movies.flatMap((movie) => String(movie.genre || '').split(',').map((value) => value.trim()).filter(Boolean)))].sort(), [movies]);
  const filteredMovies = useMemo(() => movies.filter((movie) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${movie.title} ${movie.genre} ${movie.language}`.toLowerCase().includes(query);
    const matchesStatus = status === 'all' || (status === 'published' ? movie.is_published !== false : movie.is_published === false);
    const matchesYear = year === 'all' || movie.release_date?.startsWith(year);
    const matchesGenre = genre === 'all' || String(movie.genre || '').toLowerCase().includes(genre.toLowerCase());
    return matchesSearch && matchesStatus && matchesYear && matchesGenre;
  }), [movies, search, status, year, genre]);
  const publishedCount = movies.filter((movie) => movie.is_published !== false).length;
  const draftCount = movies.length - publishedCount;

  const handleDelete = async (movie) => {
    const confirmed = window.confirm(`Delete "${movie.title}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      if (supabase) {
        await deleteMovieStorageAssets(movie);
        const { error } = await supabase.from('movies').delete().eq('id', movie.id);
        if (error) throw error;
        invalidateCache('catalog:');
      }
      setMovies((current) => current.filter((item) => item.id !== movie.id));
    } catch (error) {
      window.alert(error.message || 'Movie could not be deleted.');
    }
  };

  const handleTogglePublished = async (movie) => {
    if (!supabase) return;
    const nextPublished = movie.is_published === false;
    const { error } = await supabase.from('movies').update({ is_published: nextPublished }).eq('id', movie.id);
    if (error) {
      window.alert(error.message || 'Unable to update publishing status.');
      return;
    }
    invalidateCache('catalog:');
    setMovies((current) => current.map((item) => item.id === movie.id ? { ...item, is_published: nextPublished } : item));
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
        <label className="admin-search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search movies, genres, languages..." /></label>
        <label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All status</option><option value="published">Published</option><option value="draft">Drafts</option></select></label>
        <label><span>Genre</span><select value={genre} onChange={(event) => setGenre(event.target.value)}><option value="all">All genres</option>{genres.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span>Year</span><select value={year} onChange={(event) => setYear(event.target.value)}><option value="all">All years</option>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <span className="admin-filter-count"><Filter size={14} /> Showing {filteredMovies.length} of {movies.length}</span>
      </div>

      {loading ? (
        <div className="empty-state"><h3>Loading movies...</h3></div>
      ) : (
        <div className="admin-table-wrap library-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Poster</th>
                <th>Movie</th>
                <th>Genre</th>
                <th>Release Date</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovies.map((movie) => (
                <tr key={movie.id}>
                  <td>
                    <img className="admin-poster-thumb" src={movie.poster_url || movie.poster_path || '/movie-assets/posters/default-poster.jpg'} alt={movie.title} />
                  </td>
                  <td>
                    <div className="admin-movie-cell"><div><strong>{movie.title}</strong><span>{movie.language || 'English'} · {movie.runtime || 0} min</span></div></div>
                  </td>
                  <td>{movie.genre || movie.genres?.[0]?.name || '—'}</td>
                  <td>{movie.release_date || '—'}</td>
                  <td><span className="admin-rating">★ {Number(movie.rating || movie.vote_average || 0).toFixed(1)}</span></td>
                  <td><span className={`admin-status ${movie.is_published === false ? 'is-draft' : ''}`}>{movie.is_published === false ? <><Circle size={11} /> Draft</> : <><CheckCircle size={11} /> Published</>}</span></td>
                  <td>
                    <div className="admin-action-row">
                      <button className="admin-icon-btn" title="View" onClick={() => window.open(getMovieDetailRoute(movie), '_blank')}><Eye size={15} /></button>
                      <button className="admin-icon-btn" title="Edit" onClick={() => navigate(`/admin/movies/edit/${movie.id}`)}><Pencil size={15} /></button>
                      <button className="admin-icon-btn" title="Duplicate" onClick={() => navigate('/admin/movies/add')}><Copy size={15} /></button>
                      <button className="admin-icon-btn" title={movie.is_published === false ? 'Publish' : 'Unpublish'} onClick={() => handleTogglePublished(movie)}>{movie.is_published === false ? <CheckCircle size={15} /> : <Circle size={15} />}</button>
                      <button className="admin-icon-btn danger" title="Delete" onClick={() => handleDelete(movie)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredMovies.length === 0 && <tr><td colSpan="7"><div className="admin-empty-state"><strong>No movies found</strong><span>Try a different search or add your first title.</span><Link to="/admin/movies/add" className="admin-button admin-button-primary">+ Add movie</Link></div></td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminMoviesPage;

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Search, ArrowUp, ArrowDown, Plus, Minus, Eye, Pencil } from 'lucide-react';
import { fetchAdminMovies, getMovieDetailRoute } from '../../services/movieCatalog';
import { supabase } from '../../lib/supabase';
import { invalidateCache } from '../../services/requestCache';

const SECTION_CONFIG = {
  trending: {
    label: 'Trending Now',
    key: 'trending_now',
    positionKey: 'trending_position',
  },
  'new-releases': {
    label: 'New Releases',
    key: 'new_releases',
    positionKey: 'new_releases_position',
  },
  'top-rated-masterpieces': {
    label: 'Top Rated Masterpieces',
    key: 'top_rated_masterpieces',
    positionKey: 'top_rated_masterpieces_position',
  },
  'hidden-gems': {
    label: 'Hidden Gems',
    key: 'hidden_gems',
    positionKey: 'hidden_gems_position',
  },
};

const AdminCuratedSectionPage = () => {
  const { section } = useParams();
  const navigate = useNavigate();
  const config = SECTION_CONFIG[section] || SECTION_CONFIG.trending;

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadMovies = async () => {
    setLoading(true);
    try {
      setMovies(await fetchAdminMovies());
    } catch (error) {
      console.error('Failed to load curated section movies:', error);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovies();
  }, [section]);

  const sectionMovies = useMemo(
    () => movies
      .filter((movie) => movie[config.key])
      .sort((first, second) => Number(first[config.positionKey] || 0) - Number(second[config.positionKey] || 0)),
    [movies, config],
  );

  const availableMovies = useMemo(
    () => movies.filter((movie) => !movie[config.key]),
    [movies, config],
  );

  const filteredMovies = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return availableMovies;

    return availableMovies.filter((movie) => (
      `${movie.title} ${movie.genre || ''} ${movie.language || ''}`.toLowerCase().includes(query)
    ));
  }, [availableMovies, search]);

  const updateSectionMembership = async (movie, addToSection) => {
    if (!supabase) {
      window.alert('Supabase is not configured.');
      return;
    }

    try {
      const basePayload = {
        [config.key]: addToSection,
      };

      if (addToSection) {
        basePayload[config.positionKey] = sectionMovies.length + 1;
      }

      const { error } = await supabase
        .from('movies')
        .update(basePayload)
        .eq('id', movie.id);

      if (error) throw error;
  invalidateCache('catalog:');
      await loadMovies();
    } catch (error) {
      console.error('Failed to update section membership:', error);
      window.alert(error.message || 'Unable to update section membership.');
    }
  };

  const moveMovie = async (movieId, direction) => {
    if (!supabase) {
      window.alert('Supabase is not configured.');
      return;
    }

    const sortedMovies = [...sectionMovies].sort((first, second) => Number(first[config.positionKey] || 0) - Number(second[config.positionKey] || 0));
    const currentIndex = sortedMovies.findIndex((movie) => movie.id === movieId);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= sortedMovies.length) {
      return;
    }

    const currentMovie = sortedMovies[currentIndex];
    const targetMovie = sortedMovies[nextIndex];

    try {
      const nextPositionForCurrent = Number(targetMovie[config.positionKey] || nextIndex + 1);
      const nextPositionForTarget = Number(currentMovie[config.positionKey] || currentIndex + 1);

      await Promise.all([
        supabase.from('movies').update({ [config.positionKey]: nextPositionForCurrent }).eq('id', currentMovie.id),
        supabase.from('movies').update({ [config.positionKey]: nextPositionForTarget }).eq('id', targetMovie.id),
      ]);

      invalidateCache('catalog:');
      await loadMovies();
    } catch (error) {
      console.error('Failed to reorder section movie:', error);
      window.alert(error.message || 'Unable to reorder the section.');
    }
  };

  return (
    <div className="admin-page-shell">
      <div className="admin-header-row">
        <div>
          <p className="admin-kicker">Curated sections</p>
          <h1>{config.label}</h1>
          <p className="admin-header-copy">Manage this public section from the central movie database without duplicating movie records.</p>
        </div>
        <Link to="/admin/movies" className="admin-button admin-button-secondary">View all movies</Link>
      </div>

      <div className="admin-metric-grid">
        <div className="admin-metric-card">
          <div className="admin-metric-icon"><Plus size={18} /></div>
          <div>
            <strong>{sectionMovies.length}</strong>
            <span>Selected movies</span>
          </div>
        </div>
        <div className="admin-metric-card">
          <div className="admin-metric-icon"><Search size={18} /></div>
          <div>
            <strong>{filteredMovies.length}</strong>
            <span>Available movies</span>
          </div>
        </div>
      </div>

      <div className="admin-filter-bar">
        <label className="admin-search-field">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search movies to add to ${config.label}`}
          />
        </label>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <span className="admin-panel-eyebrow">Section members</span>
            <h3>{config.label}</h3>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><h3>Loading section...</h3></div>
        ) : sectionMovies.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Poster</th>
                  <th>Movie</th>
                  <th>Release</th>
                  <th>Rating</th>
                  <th>Position</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sectionMovies.map((movie) => (
                  <tr key={movie.id}>
                    <td>
                      <img className="admin-poster-thumb" src={movie.poster_url || movie.poster_path || '/movie-assets/posters/default-poster.jpg'} alt={movie.title} />
                    </td>
                    <td>
                      <div className="admin-movie-cell">
                        <div>
                          <strong>{movie.title}</strong>
                          <span>{movie.language || 'English'} · {movie.genre || movie.genres?.[0]?.name || 'Genre'}</span>
                        </div>
                      </div>
                    </td>
                    <td>{movie.release_date || '—'}</td>
                    <td><span className="admin-rating">★ {Number(movie.rating || movie.vote_average || 0).toFixed(1)}</span></td>
                    <td>{Number(movie[config.positionKey] || 0)}</td>
                    <td>
                      <div className="admin-action-row">
                        <button className="admin-icon-btn" title="View" onClick={() => window.open(getMovieDetailRoute(movie), '_blank')}><Eye size={15} /></button>
                        <button className="admin-icon-btn" title="Edit" onClick={() => navigate(`/admin/movies/edit/${movie.id}`)}><Pencil size={15} /></button>
                        <button className="admin-icon-btn" title="Move up" onClick={() => moveMovie(movie.id, -1)} disabled={movie[config.positionKey] <= 1}><ArrowUp size={15} /></button>
                        <button className="admin-icon-btn" title="Move down" onClick={() => moveMovie(movie.id, 1)}><ArrowDown size={15} /></button>
                        <button className="admin-icon-btn danger" title="Remove" onClick={() => updateSectionMembership(movie, false)}><Minus size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state"><h3>No movies selected yet</h3><p>Add existing movies from the library below.</p></div>
        )}
      </div>

      <div className="admin-panel" style={{ marginTop: '24px' }}>
        <div className="admin-panel-header">
          <div>
            <span className="admin-panel-eyebrow">Movie library</span>
            <h3>Add existing movies</h3>
          </div>
          <span className="admin-filter-count">{filteredMovies.length} results</span>
        </div>

        {filteredMovies.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Poster</th>
                  <th>Movie</th>
                  <th>Genre</th>
                  <th>Rating</th>
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
                      <div className="admin-movie-cell">
                        <div>
                          <strong>{movie.title}</strong>
                          <span>{movie.language || 'English'} · {movie.release_date || 'No date'}</span>
                        </div>
                      </div>
                    </td>
                    <td>{movie.genre || movie.genres?.[0]?.name || '—'}</td>
                    <td><span className="admin-rating">★ {Number(movie.rating || movie.vote_average || 0).toFixed(1)}</span></td>
                    <td>
                      <div className="admin-action-row">
                        <button className="admin-icon-btn" title="Add to this section" onClick={() => updateSectionMembership(movie, true)}><Plus size={15} /></button>
                        <button className="admin-icon-btn" title="Edit movie" onClick={() => navigate(`/admin/movies/edit/${movie.id}`)}><Pencil size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state"><h3>No more movies available</h3><p>All current movies are already selected for this section.</p></div>
        )}
      </div>
    </div>
  );
};

export default AdminCuratedSectionPage;

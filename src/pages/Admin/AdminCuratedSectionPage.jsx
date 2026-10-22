import React, { useEffect, useMemo, useState } from 'react';
import CropImage from '../../components/CropImage';
import SearchClearButton from '../../components/SearchClearButton';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Search, ArrowUp, ArrowDown, Plus, Minus, Eye, Pencil } from 'lucide-react';
import { fetchAdminContent, fetchAdminMovies, getMovieDetailRoute, getMovieStatus, isRecentMovieRelease, PUBLIC_CATALOG_CACHE_KEY } from '../../services/movieCatalog';
import { supabase } from '../../lib/supabase';
import { invalidateCache } from '../../services/requestCache';
import { useLocalDate } from '../../hooks/useLocalDate';
import AdminPositionInput from '../../components/AdminPositionInput';
import { moveAdminItemToPosition } from '../../services/adminPositions';

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
  upcoming: {
    label: 'Coming Soon',
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
  const today = useLocalDate();
  const config = SECTION_CONFIG[section] || SECTION_CONFIG.trending;
  const isAutomaticSection = section === 'new-releases' || section === 'upcoming';

  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadMovies = async ({ showLoader = true } = {}) => {
    if (showLoader) setLoading(true);
    try {
      setMovies(['trending', 'new-releases', 'upcoming'].includes(section) ? await fetchAdminContent() : await fetchAdminMovies());
    } catch (error) {
      console.error('Failed to load curated section movies:', error);
      setMovies([]);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    loadMovies();
  }, [section]);

  const publishedMovies = useMemo(
    () => movies.filter((movie) => isAutomaticSection
      ? movie.is_published === true
      : movie.is_published !== false),
    [movies, isAutomaticSection],
  );

  const sectionMovies = useMemo(
    () => {
      const eligibleMovies = section === 'new-releases'
        ? publishedMovies.filter((movie) => isRecentMovieRelease(movie, today))
        : section === 'upcoming'
          ? publishedMovies.filter((movie) => getMovieStatus(movie) === 'upcoming')
          : publishedMovies
      .filter((movie) => movie[section === 'trending' && movie.record_type === 'tv_show' ? 'is_trending' : config.key])
      .sort((first, second) => {
        const firstPositionKey = section === 'trending' && first.record_type === 'tv_show' ? 'trending_position' : config.positionKey;
        const secondPositionKey = section === 'trending' && second.record_type === 'tv_show' ? 'trending_position' : config.positionKey;
        return Number(first[firstPositionKey] || 0) - Number(second[secondPositionKey] || 0);
      });
      if (!isAutomaticSection) return eligibleMovies;
      return eligibleMovies.sort((first, second) => {
        const firstDate = first.record_type === 'tv_show' ? first.first_air_date || first.release_date : first.release_date;
        const secondDate = second.record_type === 'tv_show' ? second.first_air_date || second.release_date : second.release_date;
        return section === 'upcoming'
          ? new Date(firstDate || 0) - new Date(secondDate || 0)
          : new Date(secondDate || 0) - new Date(firstDate || 0);
      });
    },
    [publishedMovies, config, section, today],
  );

  const availableMovies = useMemo(
    () => isAutomaticSection ? [] : publishedMovies.filter((movie) => (
      !movie[section === 'trending' && movie.record_type === 'tv_show' ? 'is_trending' : config.key]
    )),
    [publishedMovies, config, section, isAutomaticSection],
  );

  const filteredMovies = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return availableMovies;

    return availableMovies.filter((movie) => {
      const genres = Array.isArray(movie.genre)
        ? movie.genre.map((genre) => typeof genre === 'string' ? genre : genre?.name || '').join(' ')
        : movie.genre || movie.genres?.map((genre) => genre.name || genre).join(' ') || '';
      const languages = Array.isArray(movie.languages) ? movie.languages.join(' ') : movie.language || '';
      return `${movie.title} ${genres} ${languages} ${movie.record_type === 'tv_show' ? 'tv show series' : 'movie'}`.toLowerCase().includes(query);
    });
  }, [availableMovies, search]);

  const updateSectionMembership = async (movie, addToSection) => {
    if (isAutomaticSection) return;
    try {
      const basePayload = {
        [section === 'trending' && movie.record_type === 'tv_show' ? 'is_trending' : config.key]: addToSection,
      };

      if (addToSection) {
        const positionKey = section === 'trending' && movie.record_type === 'tv_show' ? 'trending_position' : config.positionKey;
        basePayload[positionKey] = Math.max(0, ...sectionMovies.map((item) => {
          const itemPositionKey = section === 'trending' && item.record_type === 'tv_show' ? 'trending_position' : config.positionKey;
          return Number(item[itemPositionKey] || 0);
        })) + 1;
      }

      const { error } = await supabase
        .from(section === 'trending' && movie.record_type === 'tv_show' ? 'tv_shows' : 'movies')
        .update(basePayload)
        .eq('id', movie.id);

      if (error) throw error;
      invalidateCache(PUBLIC_CATALOG_CACHE_KEY);
      invalidateCache('catalog:home-hero');
      invalidateCache('catalog:');
      await loadMovies({ showLoader: false });
    } catch (error) {
      console.error('Failed to update section membership:', error);
      window.alert(error.message || 'Unable to update section membership.');
    }
  };

  const moveMovie = async (movie, direction) => {
    if (isAutomaticSection) return;
    if (!supabase) {
      window.alert('Supabase is not configured.');
      return;
    }

    const sortedMovies = [...sectionMovies].sort((first, second) => {
      const firstPositionKey = section === 'trending' && first.record_type === 'tv_show' ? 'trending_position' : config.positionKey;
      const secondPositionKey = section === 'trending' && second.record_type === 'tv_show' ? 'trending_position' : config.positionKey;
      return Number(first[firstPositionKey] || 0) - Number(second[secondPositionKey] || 0);
    });
    const currentIndex = sortedMovies.findIndex((item) => item.id === movie.id && item.record_type === movie.record_type);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= sortedMovies.length) {
      return;
    }

    try {
      await moveMovieToPosition(movie, nextIndex + 1);
    } catch (error) {
      console.error('Failed to reorder section movie:', error);
      window.alert(error.message || 'Unable to reorder the section.');
    }
  };

  const moveMovieToPosition = async (movie, position) => {
    const scope = section === 'trending'
      ? 'curated:trending'
      : `curated:${section === 'top-rated-masterpieces' ? 'top-rated-masterpieces' : 'hidden-gems'}`;
    await moveAdminItemToPosition({
      scope,
      itemId: movie.id,
      position,
      recordType: movie.record_type === 'tv_show' ? 'tv_show' : 'movie',
    });
    await loadMovies({ showLoader: false });
  };

  return (
    <div className="admin-page-shell">
      <div className="admin-header-row">
        <div>
          <p className="admin-kicker">Curated sections</p>
          <h1>{config.label}</h1>
          <p className="admin-header-copy">{section === 'new-releases' ? 'This section is filled automatically with published movies and TV shows released within the last 60 days.' : section === 'upcoming' ? 'Published movies and TV shows with future release dates appear here automatically.' : 'Manage this public section from the central content library without duplicating records.'}</p>
        </div>
        <Link to="/admin/movies" className="admin-button admin-button-secondary">View all movies</Link>
      </div>

      <div className="admin-metric-grid">
        <div className="admin-metric-card">
          <div className="admin-metric-icon"><Plus size={18} /></div>
          <div>
            <strong>{sectionMovies.length}</strong>
            <span>{section === 'new-releases' ? 'Eligible releases' : section === 'upcoming' ? 'Upcoming titles' : `Selected ${section === 'trending' ? 'titles' : 'movies'}`}</span>
          </div>
        </div>
        {!isAutomaticSection && <div className="admin-metric-card">
          <div className="admin-metric-icon"><Search size={18} /></div>
          <div>
            <strong>{filteredMovies.length}</strong>
            <span>Available {section === 'trending' ? 'titles' : 'movies'}</span>
          </div>
        </div>}
      </div>

      {!isAutomaticSection && section !== 'trending' && <div className="admin-filter-bar">
        <label className="admin-search-field">
          <Search size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${section === 'trending' ? 'movies and TV shows' : 'movies'} to add to ${config.label}`}
          />
          <SearchClearButton value={search} onClear={() => setSearch('')} label="movie search" />
        </label>
      </div>}

      <div className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <span className="admin-panel-eyebrow">{isAutomaticSection ? 'Automatically eligible content' : 'Section members'}</span>
            <h3>{section === 'new-releases' ? 'Released in the last 60 days' : config.label}</h3>
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
                  <th>{['trending', 'upcoming'].includes(section) ? 'Title' : 'Movie'}</th>
                  <th>Release</th>
                  <th>Rating</th>
                  {!isAutomaticSection && <th>Position</th>}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sectionMovies.map((movie, index) => {
                  return (
                    <tr key={`${movie.record_type || 'movie'}-${movie.id}`}>
                      <td>
                        <CropImage className="admin-poster-thumb" src={movie.poster_url || movie.poster_path || '/movie-assets/posters/default-poster.jpg'} alt={movie.title} />
                      </td>
                      <td>
                        <div className="admin-movie-cell">
                          <div>
                            <strong>{movie.title} {movie.record_type === 'tv_show' ? '(TV Show)' : ''}</strong>
                            <span>{movie.language || 'English'} · {movie.genre || movie.genres?.[0]?.name || 'Genre'}</span>
                          </div>
                        </div>
                      </td>
                      <td>{(movie.record_type === 'tv_show' ? movie.first_air_date || movie.release_date : movie.release_date) || '—'}</td>
                      <td><span className="admin-rating">★ {Number(movie.rating || movie.vote_average || 0).toFixed(1)}</span></td>
                      {!isAutomaticSection && <td><AdminPositionInput label={movie.title} position={index + 1} onSave={(position) => moveMovieToPosition(movie, position)} /></td>}
                      <td>
                        <div className="admin-action-row">
                          <button className="admin-icon-btn" title="View" onClick={() => window.open(getMovieDetailRoute(movie), '_blank')}><Eye size={15} /></button>
                          <button className="admin-icon-btn" title="Edit" onClick={() => navigate(movie.record_type === 'tv_show' ? `/admin/tv-shows/edit/${movie.id}` : `/admin/movies/edit/${movie.id}`)}><Pencil size={15} /></button>
                          {!isAutomaticSection && (
                            <>
                              <button className="admin-icon-btn" title="Move up" onClick={() => moveMovie(movie, -1)} disabled={index === 0}><ArrowUp size={15} /></button>
                              <button className="admin-icon-btn" title="Move down" onClick={() => moveMovie(movie, 1)}><ArrowDown size={15} /></button>
                              <button className="admin-icon-btn danger" title="Remove" onClick={() => updateSectionMembership(movie, false)}><Minus size={15} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state"><h3>{isAutomaticSection ? `No ${section === 'upcoming' ? 'upcoming titles' : 'eligible releases'}` : `No ${section === 'trending' ? 'titles' : 'movies'} selected yet`}</h3><p>{section === 'new-releases' ? 'Published movies and TV shows released within the last 60 days will appear here automatically.' : section === 'upcoming' ? 'Published content with a future release date will appear here automatically.' : 'Add existing content from the library below.'}</p></div>
        )}
      </div>

      {!isAutomaticSection && <div className="admin-panel" style={{ marginTop: '24px' }}>
        {section === 'trending' && <div className="admin-filter-bar">
          <label className="admin-search-field">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search movies and TV shows to add to ${config.label}`}
            />
            <SearchClearButton value={search} onClear={() => setSearch('')} label="movie search" />
          </label>
        </div>}
        <div className="admin-panel-header">
          <div>
            <span className="admin-panel-eyebrow">Movie library</span>
            <h3>Add existing {section === 'trending' ? 'titles' : 'movies'}</h3>
          </div>
          <span className="admin-filter-count">{filteredMovies.length} results</span>
        </div>

        {filteredMovies.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Poster</th>
                  <th>{section === 'trending' ? 'Title' : 'Movie'}</th>
                  <th>Genre</th>
                  <th>Rating</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovies.map((movie) => (
                  <tr key={`${movie.record_type || 'movie'}-${movie.id}`}>
                    <td>
                      <CropImage className="admin-poster-thumb" src={movie.poster_url || movie.poster_path || '/movie-assets/posters/default-poster.jpg'} alt={movie.title} />
                    </td>
                    <td>
                      <div className="admin-movie-cell">
                        <div>
                          <strong>{movie.title} {movie.record_type === 'tv_show' ? '(TV Show)' : ''}</strong>
                          <span>{movie.language || 'English'} · {movie.release_date || 'No date'}</span>
                        </div>
                      </div>
                    </td>
                    <td>{movie.genre || movie.genres?.[0]?.name || '—'}</td>
                    <td><span className="admin-rating">★ {Number(movie.rating || movie.vote_average || 0).toFixed(1)}</span></td>
                    <td>
                      <div className="admin-action-row">
                        <button className="admin-icon-btn" title="Add to this section" onClick={() => updateSectionMembership(movie, true)}><Plus size={15} /></button>
                        <button className="admin-icon-btn" title={`Edit ${movie.record_type === 'tv_show' ? 'TV show' : 'movie'}`} onClick={() => navigate(movie.record_type === 'tv_show' ? `/admin/tv-shows/edit/${movie.id}` : `/admin/movies/edit/${movie.id}`)}><Pencil size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state"><h3>No more {section === 'trending' ? 'titles' : 'movies'} available</h3><p>All current content is already selected for this section.</p></div>
        )}
      </div>}
    </div>
  );
};

export default AdminCuratedSectionPage;

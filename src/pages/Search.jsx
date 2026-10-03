import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Film, User } from 'lucide-react';
import { fetchSearchMulti, getProfileUrl } from '../services/tmdb';
import MovieCard from '../components/MovieCard';
import SkeletonCard from '../components/SkeletonCard';
import { dedupeMovies, fetchPublicMovies } from '../services/movieCatalog';
import { normalizeSearchText, rankMovies } from '../utils/movieSearch';

const SearchPage = ({ onPlayTrailer }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';

  const [inputVal, setInputVal] = useState(queryParam);
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('mythichq:search:tab') || 'all'); // 'all', 'movie', 'person'
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    sessionStorage.setItem('mythichq:search:tab', activeTab);
  }, [activeTab]);

  const executeSearch = async (term) => {
    setLoading(true);
    setSearched(true);

    let localMovies = [];

    try {
      const catalog = await fetchPublicMovies();
      localMovies = rankMovies(catalog, term).map((movie) => ({ ...movie, media_type: 'movie' }));
    } catch (catalogError) {
      console.error('Failed to load public catalog for search:', catalogError);
      localMovies = [];
    }

    try {
      const data = await fetchSearchMulti(term, 1);
      const apiMovies = rankMovies(data.results || [], term);
      const apiPeople = (data.results || []).filter((item) => item.media_type === 'person');
      const combinedMovies = dedupeMovies([...apiMovies, ...localMovies]);
      setResults([...rankMovies(combinedMovies, term), ...apiPeople]);
    } catch (err) {
      console.error(err);
      setResults(localMovies);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setInputVal(queryParam);
    if (normalizeSearchText(queryParam).length >= 2) {
      const timer = setTimeout(() => executeSearch(queryParam), 240);
      return () => clearTimeout(timer);
    }
    setResults([]);
    setSearched(false);
  }, [queryParam]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (inputVal.trim()) {
      setSearchParams({ q: inputVal.trim() });
    }
  };

  const moviesList = results.filter((item) => item.media_type === 'movie');
  const peopleList = results.filter((item) => item.media_type === 'person');

  const filteredResults =
    activeTab === 'movie'
      ? moviesList
      : activeTab === 'person'
      ? peopleList
      : results.filter((item) => item.media_type === 'movie' || item.media_type === 'person');

  return (
    <div className="page-container search-page">
      <div className="search-hero">
        <h1>Powerful Movie & Cast Search</h1>
        <p>Find movies by title, actors, directors, or franchise names.</p>

        <form onSubmit={handleSearchSubmit} className="search-hero-form">
          <SearchIcon size={22} className="search-hero-icon" />
          <input
            type="text"
            placeholder="Search 'Inception', 'Christopher Nolan', 'Margot Robbie'..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="search-hero-input"
          />
          <button type="submit" className="search-hero-btn">
            Search
          </button>
        </form>
      </div>

      {searched && (
        <div className="search-results-section">
          {/* Tab Filters */}
          <div className="search-tabs">
            <button
              className={`tab-pill ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Results ({results.length})
            </button>
            <button
              className={`tab-pill ${activeTab === 'movie' ? 'active' : ''}`}
              onClick={() => setActiveTab('movie')}
            >
              <Film size={16} />
              <span>Movies ({moviesList.length})</span>
            </button>
            <button
              className={`tab-pill ${activeTab === 'person' ? 'active' : ''}`}
              onClick={() => setActiveTab('person')}
            >
              <User size={16} />
              <span>Actors & Directors ({peopleList.length})</span>
            </button>
          </div>

          {loading ? (
            <div className="movies-grid">
              <SkeletonCard count={8} />
            </div>
          ) : filteredResults.length > 0 ? (
            <div className="search-grid">
              {filteredResults.map((item) => {
                if (item.media_type === 'movie') {
                  return <MovieCard key={`movie-${item.id}`} movie={item} onPlayTrailer={onPlayTrailer} />;
                } else if (item.media_type === 'person') {
                  const profileUrl = getProfileUrl(item.profile_path);
                  return (
                    <div key={`person-${item.id}`} className="person-card">
                      <div className="person-avatar-box">
                        {profileUrl ? (
                          <img src={profileUrl} alt={item.name} className="person-avatar" />
                        ) : (
                          <div className="person-avatar-fallback">👤</div>
                        )}
                      </div>
                      <div className="person-info">
                        <h3>{item.name}</h3>
                        <span className="person-dept">{item.known_for_department || 'Film Industry'}</span>
                        <div className="person-known-for">
                          <small>Known for:</small>
                          <p>
                            {item.known_for
                              ?.map((k) => k.title || k.name)
                              .filter(Boolean)
                              .join(', ') || 'Various projects'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">🔎</div>
              <h3>No Matches Found for "{queryParam}"</h3>
              <p>Try searching for a different movie title, actor, or director name.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchPage;

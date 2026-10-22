import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Film, Search as SearchIcon, Sparkles, Tv, UserRound } from 'lucide-react';
import { fetchSearchMulti, getPosterDisplayUrl, getProfileUrl } from '../services/tmdb';
import MovieCard from '../components/MovieCard';
import MovieRail from '../components/MovieRail';
import SkeletonCard from '../components/SkeletonCard';
import CropImage from '../components/CropImage';
import { fetchPublicMovies, getMovieDetailRoute } from '../services/movieCatalog';
import { getMovieSuggestions, normalizeSearchText, rankMovies } from '../utils/movieSearch';
import SearchClearButton from '../components/SearchClearButton';

const SearchPage = ({ onPlayTrailer }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const [inputDraft, setInputDraft] = useState({ query: queryParam, value: queryParam });
  const inputVal = inputDraft.query === queryParam ? inputDraft.value : queryParam;
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem('mythichq:search:tab') || 'all');
  const [catalog, setCatalog] = useState([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const [peopleState, setPeopleState] = useState({ query: '', items: [] });
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  useEffect(() => {
    sessionStorage.setItem('mythichq:search:tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    setActiveTab('all');
  }, [queryParam]);

  useEffect(() => {
    let active = true;
    fetchPublicMovies()
      .then((titles) => {
        if (active) setCatalog(titles);
      })
      .catch((error) => {
        console.error('Failed to load the public catalog for search:', error);
        if (active) setCatalog([]);
      })
      .finally(() => {
        if (active) setCatalogReady(true);
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    const normalizedQuery = normalizeSearchText(queryParam);
    if (normalizedQuery.length < 2 || !catalogReady) return undefined;

    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const data = await fetchSearchMulti(queryParam, 1);
        if (active) {
          const people = (data.results || []).filter((item) => item.media_type === 'person');
          setPeopleState({ query: queryParam, items: people });
        }
      } catch (error) {
        console.error('People search is unavailable:', error);
        if (active) setPeopleState({ query: queryParam, items: [] });
      }
    }, 180);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [queryParam, catalog, catalogReady]);

  const suggestions = useMemo(
    () => getMovieSuggestions(catalog, inputVal, 6),
    [catalog, inputVal],
  );

  const searched = normalizeSearchText(queryParam).length >= 2;
  const loading = searched && (!catalogReady || peopleState.query !== queryParam);
  const localResults = useMemo(() => rankMovies(catalog, queryParam).map((title) => ({
    ...title,
    media_type: title.record_type === 'tv_show' || title.content_type === 'tv_show' ? 'tv' : 'movie',
  })), [catalog, queryParam]);
  const results = [...localResults, ...(peopleState.query === queryParam ? peopleState.items : [])];
  const recentMovies = useMemo(() => catalog
    .filter((title) => title.record_type !== 'tv_show' && title.content_type !== 'tv_show')
    .sort((first, second) => new Date(second.created_at || 0) - new Date(first.created_at || 0))
    .slice(0, 10), [catalog]);
  const movieResults = results.filter((item) => item.media_type === 'movie');
  const tvResults = results.filter((item) => item.media_type === 'tv');
  const peopleResults = results.filter((item) => item.media_type === 'person');
  const filteredResults = activeTab === 'movie'
    ? movieResults
    : activeTab === 'tv'
      ? tvResults
      : activeTab === 'person'
        ? peopleResults
        : results;

  const submitSearch = (event) => {
    event.preventDefault();
    const term = inputVal.trim();
    setSuggestionsOpen(false);
    if (normalizeSearchText(term).length >= 2) setSearchParams({ q: term });
  };

  const clearSearch = () => {
    setInputDraft({ query: queryParam, value: '' });
    setSuggestionsOpen(false);
    setSearchParams({});
  };

  const chooseSuggestion = (title) => {
    setSuggestionsOpen(false);
    navigate(getMovieDetailRoute(title));
  };

  return (
    <div className="page-container search-page">
      <section className="search-hero">
        <div className="search-hero-copy">
          <span className="search-hero-kicker"><Sparkles size={14} /> MYTHICHQ SEARCH</span>
          <h1>Find your next <span>favorite story.</span></h1>
          <p>Search movies, TV shows, actors, and filmmakers across MythicHQ.</p>
        </div>

        <form onSubmit={submitSearch} className="search-hero-form" role="search">
          <div className="search-field-wrap">
            <SearchIcon size={21} className="search-hero-icon" aria-hidden="true" />
            <input
              type="text"
              placeholder="Try a title, actor, or filmmaker…"
              value={inputVal}
              onChange={(event) => setInputDraft({ query: queryParam, value: event.target.value })}
              onFocus={() => setSuggestionsOpen(true)}
              onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 140)}
              className="search-hero-input"
              aria-label="Search movies, TV shows, actors, and filmmakers"
              aria-autocomplete="list"
              aria-expanded={suggestionsOpen && normalizeSearchText(inputVal).length >= 2 && suggestions.length > 0}
              aria-controls="search-suggestions"
            />
            <SearchClearButton value={inputVal} onClear={clearSearch} label="search query" />
            <button type="submit" className="search-hero-btn" aria-label="Search">
              <span>Search</span><ArrowRight size={17} aria-hidden="true" />
            </button>

            {suggestionsOpen && normalizeSearchText(inputVal).length >= 2 && suggestions.length > 0 && (
              <div className="search-suggestions" id="search-suggestions" role="listbox" aria-label="Title suggestions">
                {suggestions.map((title) => {
                  const isTv = title.record_type === 'tv_show' || title.content_type === 'tv_show';
                  const poster = getPosterDisplayUrl(title.poster_path, 'w92');
                  return (
                    <button
                      key={`${isTv ? 'tv' : 'movie'}-${title.id}`}
                      type="button"
                      role="option"
                      aria-selected="false"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => chooseSuggestion(title)}
                    >
                      {poster ? <img src={poster} alt="" /> : <span className="search-suggestion-fallback"><Film size={17} /></span>}
                      <span className="search-suggestion-copy">
                        <strong>{title.title || title.name}</strong>
                        <small>{isTv ? 'TV show' : 'Movie'}{title.release_date ? ` · ${title.release_date.slice(0, 4)}` : ''}</small>
                      </span>
                      <SearchIcon size={15} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </form>

        {!queryParam && (
          <div className="search-quick-links" aria-label="Explore MythicHQ">
            <span>Or explore</span>
            <Link to="/trending">Trending</Link>
            <Link to="/top-rated">Top rated</Link>
            <Link to="/discovery">Hidden gems</Link>
          </div>
        )}
      </section>

      {catalogReady && recentMovies.length > 0 && (
        <section className="search-recent-section" aria-labelledby="recent-movies-heading">
          <div className="search-recent-heading">
            <div>
              <span>FRESH FROM THE CATALOG</span>
              <h2 id="recent-movies-heading">Recently added movies</h2>
              <p>New stories added to MythicHQ, ready for your watchlist.</p>
            </div>
            <Link to="/movies" className="search-recent-link">Browse movies <ArrowRight size={16} /></Link>
          </div>
          <MovieRail hideScrollbar>
            {recentMovies.map((movie) => (
              <MovieCard key={`recent-${movie.id}`} movie={movie} onPlayTrailer={onPlayTrailer} />
            ))}
          </MovieRail>
        </section>
      )}

      {searched && (
        <section className="search-results-section" aria-live="polite">
          <div className="search-results-heading">
            <div>
              <span>SEARCH RESULTS</span>
              <h2>Results for <strong>“{queryParam}”</strong></h2>
            </div>
            {!loading && <p>{results.length} {results.length === 1 ? 'match' : 'matches'}</p>}
          </div>

          <div className="search-tabs" role="tablist" aria-label="Filter search results">
            <button type="button" role="tab" aria-selected={activeTab === 'all'} className={`tab-pill ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
              All <span>{results.length}</span>
            </button>
            <button type="button" role="tab" aria-selected={activeTab === 'movie'} className={`tab-pill ${activeTab === 'movie' ? 'active' : ''}`} onClick={() => setActiveTab('movie')}>
              <Film size={15} /> Movies <span>{movieResults.length}</span>
            </button>
            <button type="button" role="tab" aria-selected={activeTab === 'tv'} className={`tab-pill ${activeTab === 'tv' ? 'active' : ''}`} onClick={() => setActiveTab('tv')}>
              <Tv size={15} /> TV Shows <span>{tvResults.length}</span>
            </button>
            <button type="button" role="tab" aria-selected={activeTab === 'person'} className={`tab-pill ${activeTab === 'person' ? 'active' : ''}`} onClick={() => setActiveTab('person')}>
              <UserRound size={15} /> People <span>{peopleResults.length}</span>
            </button>
          </div>

          {loading ? (
            <div className="movies-grid"><SkeletonCard count={8} /></div>
          ) : filteredResults.length > 0 ? (
            <div className="search-grid">
              {filteredResults.map((item) => {
                if (item.media_type === 'movie' || item.media_type === 'tv') {
                  return <MovieCard key={`${item.media_type}-${item.id}`} movie={item} onPlayTrailer={onPlayTrailer} />;
                }

                const profileUrl = getProfileUrl(item.profile_path);
                return (
                  <article key={`person-${item.id}`} className="person-card">
                    <div className="person-avatar-box">
                      {profileUrl ? <CropImage src={profileUrl} alt={item.name} className="person-avatar" /> : <div className="person-avatar-fallback"><UserRound size={28} /></div>}
                    </div>
                    <div className="person-info">
                      <h3>{item.name}</h3>
                      <span className="person-dept">{item.known_for_department || 'Film Industry'}</span>
                      <div className="person-known-for">
                        <small>Known for</small>
                        <p>{item.known_for?.map((title) => title.title || title.name).filter(Boolean).join(', ') || 'Various projects'}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state search-empty-state">
              <div className="empty-icon"><SearchIcon size={23} /></div>
              <h3>No matches found for “{queryParam}”</h3>
              <p>Try another title, TV show, actor, or filmmaker.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default SearchPage;

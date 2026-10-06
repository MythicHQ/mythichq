// TMDB API Service Layer for MythicHQ

import { cachedRequest } from './requestCache';

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
const REQUEST_TIMEOUT_MS = 12000;

// Default TMDB v3 API Key fallback to ensure seamless out-of-the-box experience
// Users can also set VITE_TMDB_API_KEY in .env or via the built-in UI settings modal
const DEFAULT_API_KEY = 'e67c80efbd397ffad28cfa17b4c6e944'; // Working public TMDB key

export const getApiKey = () => {
  const customKey = localStorage.getItem('mythichq_tmdb_key');
  if (customKey && customKey.trim().length > 0) return customKey.trim();
  return import.meta.env.VITE_TMDB_API_KEY || DEFAULT_API_KEY;
};

export const setCustomApiKey = (key) => {
  if (key) {
    localStorage.setItem('mythichq_tmdb_key', key.trim());
  } else {
    localStorage.removeItem('mythichq_tmdb_key');
  }
};

// Image URL Resolvers
export const getImageUrl = (path, size = 'w500') => {
  if (!path) return null;
  return `${IMAGE_BASE_URL}/${size}${path}`;
};

export const getPosterDisplayUrl = (path, size = 'w500') => {
  if (!path || path === '/movie-assets/posters/default-poster.jpg') return null;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  if (path.startsWith('/movie-assets/')) return path;
  return getImageUrl(path.startsWith('/') ? path : `/${path}`, size);
};

export const getBackdropUrl = (path, size = 'w1280') => {
  if (!path) return null;
  return `${IMAGE_BASE_URL}/${size}${path}`;
};

export const getBackdropDisplayUrl = (path, size = 'original') => {
  if (!path || path === '/movie-assets/backdrops/default-backdrop.jpg') return null;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  if (path.startsWith('/movie-assets/')) return path;
  return getBackdropUrl(path.startsWith('/') ? path : `/${path}`, size);
};

export const getProfileUrl = (path, size = 'w185') => {
  if (!path) return null;
  return `${IMAGE_BASE_URL}/${size}${path}`;
};

// Generic Fetch Wrapper
const fetchFromTMDB = async (endpoint, params = {}) => {
  const apiKey = getApiKey();
  const queryParams = new URLSearchParams({
    api_key: apiKey,
    include_adult: 'false',
    language: 'en-US',
    ...params,
  });

  const url = `${BASE_URL}${endpoint}?${queryParams.toString()}`;

  return cachedRequest(`tmdb:${url}`, async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid TMDB API Key. Please update your API key in settings.');
        }
        throw new Error(`TMDB API Error: ${response.statusText} (${response.status})`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      if (error.name === 'AbortError' || error.name === 'TypeError') {
        throw new Error('TMDB is unreachable. Check your internet connection, VPN, firewall, or ad blocker and try again.');
      }
      throw error;
    }
  });
};

// API Methods

// 1. Trending Movies
export const fetchTrending = async (timeWindow = 'day', page = 1) => {
  return await fetchFromTMDB(`/trending/movie/${timeWindow}`, { page });
};

// 2. New Releases (Now Playing)
export const fetchNowPlaying = async (page = 1) => {
  return await fetchFromTMDB('/movie/now_playing', { page });
};

// 3. Top Rated Movies
export const fetchTopRated = async (page = 1) => {
  return await fetchFromTMDB('/movie/top_rated', { page });
};

// 4. Upcoming Movies (Coming Soon)
export const fetchUpcoming = async (page = 1) => {
  return await fetchFromTMDB('/movie/upcoming', { page });
};

// 5. Popular Movies
export const fetchPopular = async (page = 1) => {
  return await fetchFromTMDB('/movie/popular', { page });
};

// 6. Hidden Gems (High rating >= 7.0, decent vote count >= 100, but moderate/lower popularity)
export const fetchHiddenGems = async (page = 1) => {
  return await fetchFromTMDB('/discover/movie', {
    'vote_average.gte': 7.0,
    'vote_count.gte': 100,
    'popularity.lte': 40,
    sort_by: 'vote_average.desc',
    page,
  });
};

// 7. Genre List
export const fetchGenres = async () => {
  return await fetchFromTMDB('/genre/movie/list');
};

// 8. Discover Movies with custom filters & sorting
export const fetchDiscover = async ({
  genre = '',
  year = '',
  minRating = 0,
  language = '',
  sortBy = 'popularity.desc',
  page = 1,
} = {}) => {
  const params = {
    sort_by: sortBy,
    page,
  };

  if (genre) params.with_genres = genre;
  if (year) params.primary_release_year = year;
  if (minRating > 0) params['vote_average.gte'] = minRating;
  if (language) params.with_original_language = language;

  return await fetchFromTMDB('/discover/movie', params);
};

// 9. Search Multi (Movies & People)
export const fetchSearchMulti = async (query, page = 1) => {
  if (!query || !query.trim()) return { results: [] };
  return await fetchFromTMDB('/search/multi', { query: query.trim(), page });
};

// 10. Search Movies
export const fetchSearchMovies = async (query, page = 1) => {
  if (!query || !query.trim()) return { results: [] };
  return await fetchFromTMDB('/search/movie', { query: query.trim(), page });
};

// 11. Movie Details (with append_to_response for efficiency)
export const fetchMovieDetails = async (movieId) => {
  return await fetchFromTMDB(`/movie/${movieId}`, {
    append_to_response: 'credits,videos,similar,recommendations',
  });
};

// 12. Person Movie Credits (for searching directors/actors)
export const fetchPersonCredits = async (personId) => {
  return await fetchFromTMDB(`/person/${personId}/movie_credits`);
};

// 13. Pick a Random Movie based on Genre & Minimum Rating
export const fetchRandomMovie = async (genreId = '', minRating = 7.0) => {
  const params = {
    'vote_average.gte': minRating,
    'vote_count.gte': 50,
    sort_by: 'popularity.desc',
  };
  if (genreId) params.with_genres = genreId;

  // Pick a random page from 1 to 5
  const randomPage = Math.floor(Math.random() * 5) + 1;
  params.page = randomPage;

  const data = await fetchFromTMDB('/discover/movie', params);
  if (!data.results || data.results.length === 0) {
    // Retry without page offset if no results
    delete params.page;
    const fallbackData = await fetchFromTMDB('/discover/movie', params);
    if (!fallbackData.results || fallbackData.results.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * fallbackData.results.length);
    return fallbackData.results[randomIndex];
  }

  const randomIndex = Math.floor(Math.random() * data.results.length);
  return data.results[randomIndex];
};

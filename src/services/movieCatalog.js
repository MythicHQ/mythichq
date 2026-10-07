import { LOCAL_MOVIES } from '../data/localMovies';
import { supabase } from '../lib/supabase';
import { resolveMovieMediaPathsList } from './movieStorage';
import { cachedRequest, getCachedRequest, invalidateCache } from './requestCache';
import { GENRES_MAP } from '../utils/helpers';

const normalizeCast = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((actor) => (typeof actor === 'string' ? actor.trim() : actor?.name || actor?.original_name || ''))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const getYouTubeKey = (value = '') => {
  if (!value || typeof value !== 'string') return '';
  if (/^[A-Za-z0-9_-]{6,}$/.test(value.trim())) return value.trim();

  const match = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/i);
  return match?.[1] || '';
};

const normalizeGenreName = (value, fallbackId = null) => {
  const rawName = typeof value === 'object' && value !== null
    ? value.name ?? value.id ?? fallbackId
    : value ?? fallbackId;
  if (rawName == null) return '';
  const text = String(rawName).trim();
  if (!text) return '';
  if (/^\d+$/.test(text)) return GENRES_MAP[text] || '';
  return text;
};

const normalizeGenres = (movie) => {
  const source = Array.isArray(movie.genre) && movie.genre.length
    ? movie.genre
    : Array.isArray(movie.genres) && movie.genres.length
      ? movie.genres
      : Array.isArray(movie.genre_ids)
        ? movie.genre_ids
        : typeof movie.genre === 'string'
          ? movie.genre.split(',')
          : [];
  return source
    .map((genre, index) => normalizeGenreName(genre, movie.genre_ids?.[index]))
    .filter(Boolean);
};

const normalizeLanguages = (movie) => {
  if (Array.isArray(movie.languages)) {
    return movie.languages.map((language) => String(language).trim()).filter(Boolean);
  }
  if (Array.isArray(movie.language)) {
    return movie.language.map((language) => String(language).trim()).filter(Boolean);
  }
  if (typeof movie.language === 'string') {
    return movie.language
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeOttPlatforms = (movie) => {
  if (Array.isArray(movie.otts)) {
    return movie.otts.map((platform) => String(platform).trim()).filter(Boolean);
  }
  if (Array.isArray(movie.ott)) {
    return movie.ott.map((platform) => String(platform).trim()).filter(Boolean);
  }
  if (typeof movie.ott === 'string') {
    return movie.ott
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', '1', 'yes'].includes(value.toLowerCase());
  return fallback;
};

const movieKey = (movie) => String(movie.title || '').trim().toLowerCase();
const REMOVED_MOVIE_TITLES = new Set(['rakkayie']);
const excludeRemovedMovies = (movies = []) => movies.filter(
  (movie) => !REMOVED_MOVIE_TITLES.has(String(movie?.title || '').trim().toLowerCase()),
);

export const slugifyMovieTitle = (title = '') => {
  const value = title.toString().trim();

  if (!value) {
    return 'movie';
  }

  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'movie';
};

const ensureUniqueSlugs = (movies = []) => {
  const usedSlugs = new Map();

  return movies.map((movie) => {
    const title = movie.title || 'Untitled Movie';
    let slug = slugifyMovieTitle(title);

    if (!slug) {
      slug = 'movie';
    }

    const originalSlug = slug;
    let suffix = 2;

    while (usedSlugs.has(slug)) {
      slug = `${originalSlug}-${suffix}`;
      suffix += 1;
    }

    usedSlugs.set(slug, true);

    return {
      ...movie,
      slug,
    };
  });
};

export const dedupeMovies = (movies = []) => {
  const uniqueMovies = new Map();

  movies.forEach((movie) => {
    if (!movie) return;

    const key = String(movie.title || '').trim().toLowerCase();
    const releaseKey = String(movie.release_date || '').trim();

    if (!key) {
      const fallbackKey = `__fallback_${movie.id || Math.random().toString(16).slice(2)}`;
      if (!uniqueMovies.has(fallbackKey)) {
        uniqueMovies.set(fallbackKey, movie);
      }
      return;
    }

    const lookupKey = `${key}|${releaseKey || 'no-date'}`;

    if (!uniqueMovies.has(lookupKey)) {
      uniqueMovies.set(lookupKey, movie);
    }
  });

  return [...uniqueMovies.values()];
};

export const getMovieSlug = (movie = {}) => {
  if (movie.slug) return movie.slug;
  return slugifyMovieTitle(movie.title || 'movie');
};

export const getMovieDetailRoute = (movie = {}) => `/movie/${encodeURIComponent(getMovieSlug(movie))}`;

const getReleaseDateValue = (movie = {}) => movie.release_date || movie.releaseDate || null;

const getStatusFromReleaseDate = (releaseDate) => {
  if (!releaseDate || releaseDate === 'TBD') return 'tba';

  const releaseAt = new Date(`${releaseDate}T00:00:00`);
  if (Number.isNaN(releaseAt.getTime())) return 'tba';

  return releaseAt <= new Date() ? 'released' : 'upcoming';
};

export const getMovieStatus = (movieOrDate) => {
  if (movieOrDate && typeof movieOrDate === 'object') {
    return getStatusFromReleaseDate(getReleaseDateValue(movieOrDate));
  }

  return getStatusFromReleaseDate(movieOrDate);
};

export const getPublicMovieSections = (movies = []) => {
  const publishedMovies = [...movies]
    .map((movie) => normalizeMovieRecord(movie))
    .filter((movie) => movie.is_published !== false);

  const released = [...publishedMovies]
    .filter((movie) => movie.status === 'released')
    .sort((first, second) => new Date(second.release_date || 0) - new Date(first.release_date || 0));

  const upcoming = [...publishedMovies]
    .filter((movie) => movie.status === 'upcoming')
    .sort((first, second) => new Date(first.release_date || 0) - new Date(second.release_date || 0));

  const topRated = [...publishedMovies]
    .sort((first, second) => Number(second.vote_average) - Number(first.vote_average));

  const defaultTrending = [...publishedMovies]
    .sort((first, second) => Number(second.vote_average) - Number(first.vote_average)
      || new Date(second.release_date || 0) - new Date(first.release_date || 0));

  const curatedTrending = [...publishedMovies]
    .filter((movie) => movie.trending_now)
    .sort((first, second) => Number(first.trending_position || 0) - Number(second.trending_position || 0));

  const curatedNewReleases = [...publishedMovies]
    .filter((movie) => movie.new_releases)
    .sort((first, second) => Number(first.new_releases_position || 0) - Number(second.new_releases_position || 0));

  const curatedTopRatedMasterpieces = [...publishedMovies]
    .filter((movie) => movie.top_rated_masterpieces)
    .sort((first, second) => Number(first.top_rated_masterpieces_position || 0) - Number(second.top_rated_masterpieces_position || 0));

  const curatedHiddenGems = [...publishedMovies]
    .filter((movie) => movie.hidden_gems)
    .sort((first, second) => Number(first.hidden_gems_position || 0) - Number(second.hidden_gems_position || 0));

  const hiddenGems = curatedHiddenGems.length > 0
    ? curatedHiddenGems
    : [...released]
      .filter((movie) => Number(movie.vote_average) >= 8.5)
      .slice(0, 10);

  return {
    catalog: publishedMovies,
    released,
    upcoming,
    topRated,
    trending: curatedTrending.length > 0 ? curatedTrending : defaultTrending,
    newReleases: curatedNewReleases.length > 0 ? curatedNewReleases : released,
    topRatedMasterpieces: curatedTopRatedMasterpieces.length > 0 ? curatedTopRatedMasterpieces : topRated,
    hiddenGems,
    curated: {
      trending: curatedTrending,
      newReleases: curatedNewReleases,
      topRatedMasterpieces: curatedTopRatedMasterpieces,
      hiddenGems: curatedHiddenGems,
    },
  };
};

const toMoviePayload = (movie) => {
  const normalizedGenres = normalizeGenres(movie);
  const normalizedLanguages = normalizeLanguages(movie);
  const normalizedOttPlatforms = normalizeOttPlatforms(movie);

  return {
    title: movie.title,
    title_image_url: movie.title_image_url || '',
    description: movie.description || movie.overview || '',
    poster_url: movie.poster_url || movie.poster_path || movie.poster || '',
    backdrop_url: movie.backdrop_url || movie.backdrop_path || movie.backdrop || '',
    trailer_url: movie.trailer_url || (movie.trailer_key ? `https://www.youtube.com/watch?v=${movie.trailer_key}` : ''),
    genre: normalizedGenres.join(', '),
    genres: normalizedGenres,
    release_date: movie.release_date || null,
    director: movie.director || '',
    cast: Array.isArray(movie.cast) ? movie.cast.join(', ') : movie.cast || '',
    content_type: movie.content_type || movie.media_type || 'movie',
    language: normalizedLanguages.join(', ') || movie.language || 'English',
    languages: normalizedLanguages,
    ott: normalizedOttPlatforms.join(', ') || movie.ott || '',
    otts: normalizedOttPlatforms,
    runtime: Number(movie.runtime || 0),
    rating: Number(movie.rating ?? movie.vote_average ?? 0),
    vote_count: Number(movie.vote_count || 0),
    is_published: movie.is_published !== false,
  };
};

export const normalizeMovieRecord = (movie = {}) => {
  const id = movie.id ?? movie.tmdb_id ?? Date.now();
  const genres = normalizeGenres(movie);
  const languages = normalizeLanguages(movie);
  const ottPlatforms = normalizeOttPlatforms(movie);
  const releaseDate = movie.release_date || movie.releaseDate || null;
  const status = getStatusFromReleaseDate(releaseDate);

  return {
    ...movie,
    id: Number.isFinite(Number(id)) && !String(id).includes('-') ? Number(id) : id,
    title: movie.title || 'Untitled Movie',
    title_image_url: movie.title_image_url || '',
    slug: getMovieSlug(movie),
    overview: movie.description || movie.overview || 'No description available.',
    release_date: releaseDate,
    releaseDate,
    status,
    genre: genres,
    genres: genres.map((name, index) => ({
      id: Number(movie.genre_ids?.[index]) || index + 1,
      name,
    })),
    genre_ids: Array.isArray(movie.genre_ids)
      ? movie.genre_ids
      : genres.map((name, index) => Number(Object.keys(GENRES_MAP).find((genreId) => GENRES_MAP[genreId] === name)) || index + 1),
    poster_path: movie.poster_url || movie.poster_path || movie.poster || '/movie-assets/posters/default-poster.jpg',
    backdrop_path: movie.backdrop_url || movie.backdrop_path || movie.backdrop || '/movie-assets/backdrops/default-backdrop.jpg',
    vote_average: Number(movie.vote_average ?? movie.rating ?? 0),
    vote_count: Number(movie.vote_count ?? movie.ratings_count ?? 0),
    runtime: Number(movie.runtime ?? 0),
    tagline: movie.tagline || '',
    country: movie.country || '',
    age_rating: movie.age_rating || '',
    writer: movie.writer || '',
    production_company: movie.production_company || '',
    imdb_rating: movie.imdb_rating == null ? null : Number(movie.imdb_rating),
    budget: movie.budget == null ? null : Number(movie.budget),
    box_office: movie.box_office == null ? null : Number(movie.box_office),
    movie_status: movie.movie_status || '',
    initial_hype: movie.initial_hype == null ? null : Number(movie.initial_hype),
    cast_crew: Array.isArray(movie.cast_crew) ? movie.cast_crew : [],
    watch_providers: Array.isArray(movie.watch_providers) ? movie.watch_providers : [],
    badges: Array.isArray(movie.badges) ? movie.badges : [],
    language: languages.length ? languages.join(', ') : (movie.language || 'English'),
    languages,
    ott: ottPlatforms.join(', ') || (movie.ott || ''),
    otts: ottPlatforms,
    director: movie.director || 'Unknown',
    cast: normalizeCast(movie.cast),
    content_type: movie.content_type || movie.media_type || 'movie',
    trailer_url: movie.trailer_url || movie.trailerUrl || '',
    trailer_key: movie.trailer_key || getYouTubeKey(movie.trailer_url || movie.trailerUrl || ''),
    description: movie.description || movie.overview || 'No description available.',
    created_at: movie.created_at || new Date().toISOString(),
    trending_now: normalizeBoolean(movie.trending_now ?? movie.trendingNow ?? movie.trending),
    new_releases: normalizeBoolean(movie.new_releases ?? movie.newReleases),
    top_rated_masterpieces: normalizeBoolean(movie.top_rated_masterpieces ?? movie.topRatedMasterpieces),
    hidden_gems: normalizeBoolean(movie.hidden_gems ?? movie.hiddenGems),
    featured: normalizeBoolean(movie.featured),
    popular: normalizeBoolean(movie.popular),
    recommended: normalizeBoolean(movie.recommended),
    homepage: normalizeBoolean(movie.homepage),
    trending_position: Number(movie.trending_position ?? movie.trendingPosition ?? 0),
    new_releases_position: Number(movie.new_releases_position ?? movie.newReleasesPosition ?? 0),
    top_rated_masterpieces_position: Number(movie.top_rated_masterpieces_position ?? movie.topRatedMasterpiecesPosition ?? 0),
    hidden_gems_position: Number(movie.hidden_gems_position ?? movie.hiddenGemsPosition ?? 0),
  };
};

const loadLocalMovies = async () => ensureUniqueSlugs(
  dedupeMovies(await resolveMovieMediaPathsList(LOCAL_MOVIES.map(normalizeMovieRecord))),
);

export const getCachedPublicMovies = () => getCachedRequest('catalog:public');

export const fetchPublicMovies = async () => {
  try {
    return await cachedRequest('catalog:public', async () => {
      if (!supabase) return loadLocalMovies();

      const { data, error } = await supabase.from('movies').select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
      if (error) throw error;

      return ensureUniqueSlugs(excludeRemovedMovies(dedupeMovies(await resolveMovieMediaPathsList((data || []).map(normalizeMovieRecord)))));
    });
  } catch (error) {
    console.error('Error fetching movies from Supabase:', error);
    const cachedMovies = getCachedPublicMovies();
    return cachedMovies === undefined ? loadLocalMovies() : cachedMovies;
  }
};

export const fetchHeroMovies = async () => cachedRequest('catalog:hero', async () => {
  if (!supabase) return [];

    const { data, error } = await supabase
      .from('hero_movies')
      .select(`
        id,
        movie_id,
        position,
        movie:movies (*)
      `)
      .order('position', { ascending: true });

    if (error) throw error;

    const heroMovies = (data || [])
      .map((entry) => {
        const movie = entry.movie;
        if (!movie) return null;

        return {
          ...normalizeMovieRecord(movie),
          hero_position: entry.position,
          hero_row_id: entry.id,
        };
    })
      .filter(Boolean)
      .filter((movie) => movie.is_published !== false)
      .sort((first, second) => Number(first.hero_position || 0) - Number(second.hero_position || 0));

    return ensureUniqueSlugs(excludeRemovedMovies(dedupeMovies(await resolveMovieMediaPathsList(heroMovies))));
});

export const fetchAdminMovies = async () => {
  if (!supabase) return ensureUniqueSlugs(dedupeMovies(await resolveMovieMediaPathsList(LOCAL_MOVIES.map(normalizeMovieRecord))));

  const { data: remoteData, error: remoteError } = await supabase.from('movies').select('*').order('created_at', { ascending: false });
  if (remoteError) throw remoteError;

  const remoteMovies = ensureUniqueSlugs(excludeRemovedMovies(dedupeMovies(await resolveMovieMediaPathsList((remoteData || []).map(normalizeMovieRecord)))));
  const remoteByKey = new Map(remoteMovies.map((movie) => [movieKey(movie), movie]));
  const missingLocalMovies = LOCAL_MOVIES.filter((movie) => !remoteByKey.has(movieKey(movie)));

  if (missingLocalMovies.length > 0) {
    const { data: insertedMovies, error: insertError } = await supabase
      .from('movies')
      .insert(missingLocalMovies.map(toMoviePayload).map((movie) => ({ ...movie, created_by: null })))
      .select('*');
    if (insertError) throw insertError;
    remoteMovies.push(...(insertedMovies || []).map(normalizeMovieRecord));
  }

  return remoteMovies.sort((first, second) => new Date(second.created_at) - new Date(first.created_at));
};

export const fetchMovieById = async (movieIdentifier) => {
  if (!movieIdentifier) return null;

  const cacheKey = `catalog:movie:${String(movieIdentifier).trim()}`;
  return cachedRequest(cacheKey, async () => {
    if (supabase) {
      const normalizedIdentifier = String(movieIdentifier).trim();
      const numericId = Number(normalizedIdentifier);

      if (Number.isInteger(numericId) && numericId > 0) {
        const { data, error } = await supabase.from('movies').select('*').eq('id', numericId).maybeSingle();
        if (!error && data && data.is_published !== false && !REMOVED_MOVIE_TITLES.has(String(data.title || '').trim().toLowerCase())) {
          const [resolvedMovie] = await resolveMovieMediaPathsList([normalizeMovieRecord(data)]);
          return resolvedMovie;
        }
      }

      const allMovies = await fetchPublicMovies();
      return allMovies.find((item) => item.slug === normalizedIdentifier || String(item.id) === String(normalizedIdentifier)) || null;
    }

    const allLocalMovies = await loadLocalMovies();
    return allLocalMovies.find(
      (item) => item.slug === String(movieIdentifier).trim() || String(item.id) === String(movieIdentifier),
    ) || null;
  });
};

export const saveMovieToSupabase = async (payload) => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const movieData = toMoviePayload(payload);

  const { data, error } = await supabase.from('movies').insert(movieData).select();
  if (error) throw error;

  const movie = Array.isArray(data) ? data[0] : data;
  if (!movie) {
    throw new Error('Unable to save movie.');
  }

  invalidateCache('catalog:public');
  return normalizeMovieRecord(movie);
};

export const fetchAdminStats = async () => {
  if (!supabase) {
    return {
      totalMovies: LOCAL_MOVIES.length,
      totalUsers: 0,
      totalReviews: 0,
      averageRating: 0,
      recentMovies: LOCAL_MOVIES.slice(0, 5),
      recentReviews: [],
    };
  }

  const [{ data: movieRows = [] }, { data: users = [] }, { data: reviews = [] }] = await Promise.all([
    supabase.from('movies').select('*').order('created_at', { ascending: false }).limit(10),
    supabase.from('profiles').select('id').limit(1000),
    supabase.from('reviews').select('*').order('created_at', { ascending: false }).limit(10),
  ]);

  const movies = excludeRemovedMovies(movieRows);

  const totalMovies = movies.length;
  const totalUsers = users.length;
  const totalReviews = reviews.length;
  const averageRating = totalMovies > 0
    ? (movies.reduce((sum, movie) => sum + Number(movie.rating || movie.vote_average || 0), 0) / totalMovies).toFixed(1)
    : '0.0';

  const publishedMovies = (movies || []).filter((movie) => movie.is_published !== false);

  return {
    totalMovies,
    totalUsers,
    totalReviews,
    averageRating,
    publishedMovies: publishedMovies.length,
    draftMovies: totalMovies - publishedMovies.length,
    trendingNow: (movies || []).filter((movie) => movie.trending_now).length,
    newReleases: (movies || []).filter((movie) => movie.new_releases).length,
    topRatedMasterpieces: (movies || []).filter((movie) => movie.top_rated_masterpieces).length,
    hiddenGems: (movies || []).filter((movie) => movie.hidden_gems).length,
    featuredMovies: (movies || []).filter((movie) => movie.featured).length,
    popularMovies: (movies || []).filter((movie) => movie.popular).length,
    recentMovies: (movies || []).map(normalizeMovieRecord),
    recentReviews: reviews || [],
  };
};

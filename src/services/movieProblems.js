import { LOCAL_MOVIES } from '../data/localMovies';
import { supabase } from '../lib/supabase';
import { GENRES_MAP } from '../utils/helpers';
import { normalizeMovieRecord } from './movieCatalog';
import { getSignedMovieAssetUrl, isSupabaseStoragePath } from './movieStorage';
import { invalidateCache } from './requestCache';

const REMOVED_MOVIE_TITLES = new Set(['rakkayie']);
const IMAGE_CHECK_TIMEOUT_MS = 10000;
const PUBLIC_CONTENT_TYPES = new Set(['movie', 'tv_show']);
const AUDIT_PAGE_SIZE = 500;
const CREDIT_MOVIE_ID_BATCH_SIZE = 300;

const movieDuplicateIdentity = (movie) => {
  const title = String(movie.title || '').trim().toLocaleLowerCase();
  return title ? `${title}|${String(movie.release_date || '').trim() || 'no-date'}` : `__missing_title_${movie.id}`;
};
const movieIdentity = (movie) => movieDuplicateIdentity(movie);

const compareNewestMovies = (first, second) => {
  const dateDifference = (Date.parse(second.created_at || '') || 0) - (Date.parse(first.created_at || '') || 0);
  if (dateDifference) return dateDifference;
  return Number(second.id) - Number(first.id);
};

const findDuplicateMovieIds = (movies) => {
  const groups = new Map();
  movies.forEach((movie) => {
    const identity = movieDuplicateIdentity(movie);
    if (!identity) return;
    const group = groups.get(identity) || [];
    group.push(movie);
    groups.set(identity, group);
  });

  return [...groups.values()].flatMap((group) => group
    .sort(compareNewestMovies)
    .slice(1)
    .map((movie) => movie.id));
};

const getGenreValues = (movie) => {
  const raw = Array.isArray(movie.genre) && movie.genre.length
    ? movie.genre
    : Array.isArray(movie.genres) && movie.genres.length
      ? movie.genres
      : movie.genre ?? movie.genres;
  const values = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : raw == null ? [] : [raw];
  return values.filter((value) => {
    if (typeof value === 'string') return Boolean(value.trim());
    if (value && typeof value === 'object') return Boolean(String(value.name ?? value.id ?? '').trim());
    return value != null;
  });
};

const isValidGenre = (genre) => {
  if (typeof genre === 'string') {
    const value = genre.trim();
    return Boolean(value) && (!/^\d+$/.test(value) || Boolean(GENRES_MAP[value]));
  }
  if (genre && typeof genre === 'object') {
    const value = genre.name ?? genre.id;
    return value != null && isValidGenre(value);
  }
  return false;
};

const isValidDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
};

const isValidHttpUrl = (value) => {
  try {
    const url = new URL(String(value));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const fetchAllRows = async (createQuery) => {
  const rows = [];
  for (let offset = 0; ; offset += AUDIT_PAGE_SIZE) {
    const { data, error } = await createQuery().range(offset, offset + AUDIT_PAGE_SIZE - 1);
    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < AUDIT_PAGE_SIZE) return rows;
  }
};

const fetchCreditRows = async (table, movieIds) => {
  const rows = [];
  const fields = table === 'movie_cast'
    ? 'movie_id, person_name, actor_name, cast_member_id'
    : 'movie_id, person_name, department';
  for (let index = 0; index < movieIds.length; index += CREDIT_MOVIE_ID_BATCH_SIZE) {
    const batch = movieIds.slice(index, index + CREDIT_MOVIE_ID_BATCH_SIZE);
    const pageRows = await fetchAllRows(() => supabase
      .from(table)
      .select(fields)
      .in('movie_id', batch)
      .order('movie_id', { ascending: true }));
    rows.push(...pageRows);
  }
  return rows;
};

const checkImage = (url) => new Promise((resolve) => {
  if (typeof url !== 'string' || !url.trim()) {
    resolve('missing');
    return;
  }

  const value = url.trim();
  if (!/^(https?:\/\/|\/|data:image\/)/i.test(value)) {
    resolve('invalid');
    return;
  }

  const image = new Image();
  let settled = false;
  const timeoutId = window.setTimeout(() => finish('unverified'), IMAGE_CHECK_TIMEOUT_MS);
  const finish = (result) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timeoutId);
    image.onload = null;
    image.onerror = null;
    resolve(result);
  };

  image.onload = () => finish('valid');
  image.onerror = () => finish('broken');
  image.src = value;
  if (image.complete) finish(image.naturalWidth > 0 ? 'valid' : 'broken');
});

const checkImages = async (movies) => {
  const results = new Map();
  const queue = [...movies];
  const workers = Array.from({ length: Math.min(6, queue.length) }, async () => {
    while (queue.length) {
      const movie = queue.shift();
      if (!movie) return;
      const [poster, backdrop] = await Promise.all([
        checkImage(movie.poster_url || movie.poster_path || movie.poster),
        checkImage(movie.backdrop_url || movie.backdrop_path || movie.backdrop),
      ]);
      results.set(String(movie.id), {
        poster,
        backdrop,
        posterUrl: movie.poster_url || movie.poster_path || movie.poster || '',
        backdropUrl: movie.backdrop_url || movie.backdrop_path || movie.backdrop || '',
      });
    }
  });
  await Promise.all(workers);
  return results;
};

const makeIssue = (movie, code, severity, problem, why, field, solution, detectedAt) => ({
  key: `${movie.id}:${code}`,
  movieId: movie.id,
  movieTitle: String(movie.title || '').trim() || 'Untitled movie',
  poster: movie.poster_url || movie.poster_path || movie.poster || '',
  code,
  severity,
  problem,
  why,
  field,
  solution,
  detectedAt,
  status: 'active',
  movieStatus: movie.is_published === true || (!supabase && movie.is_published !== false)
    ? 'Published'
    : 'Draft / not published',
});

const getPublicRows = async () => {
  if (!supabase) {
    const localRows = LOCAL_MOVIES.map(normalizeMovieRecord);
    const seen = new Set();
    return localRows.filter((movie) => {
      if (REMOVED_MOVIE_TITLES.has(String(movie.title || '').trim().toLocaleLowerCase())) return false;
      const key = movieIdentity(movie);
      if (seen.has(key)) return false;
      seen.add(key);
      return movie.is_published !== false;
    });
  }

  const data = await fetchAllRows(() => supabase
    .from('movies')
    .select('id, title, release_date')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false }));

  const seen = new Set();
  return (data || []).filter((movie) => {
    if (REMOVED_MOVIE_TITLES.has(String(movie.title || '').trim().toLocaleLowerCase())) return false;
    const key = movieIdentity(movie);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const auditMoviesForProblems = async ({ movieId } = {}) => {
  let rawMovies;
  let source = 'Database';
  let publicRows;
  let creditWarning = '';
  let invalidCastMovieIds = new Set();
  let invalidCrewMovieIds = new Set();
  let publicDetailAvailable = null;

  if (supabase) {
    rawMovies = await fetchAllRows(() => supabase
      .from('movies')
      .select('*')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }));
    publicRows = await getPublicRows();
  } else {
    source = 'Local preview data';
    rawMovies = LOCAL_MOVIES;
    publicRows = await getPublicRows();
  }

  const auditedMovies = movieId == null
    ? rawMovies
    : rawMovies.filter((movie) => String(movie.id) === String(movieId));
  if (movieId != null && auditedMovies.length === 0) {
    throw new Error(`Movie ${movieId} could not be found in the database.`);
  }
  if (supabase && movieId != null) {
    const { data, error } = await supabase
      .from('movies')
      .select('id')
      .eq('id', Number(movieId))
      .eq('is_published', true)
      .maybeSingle();
    if (error) throw error;
    publicDetailAvailable = Boolean(data);
  }
  if (supabase && auditedMovies.length) {
    const movieIds = auditedMovies.map((movie) => movie.id).filter((id) => id != null);
    if (movieIds.length) {
      const results = await Promise.allSettled([
        fetchCreditRows('movie_cast', movieIds),
        fetchCreditRows('movie_crew', movieIds),
      ]);
      if (results[0].status === 'fulfilled') {
        invalidCastMovieIds = new Set(results[0].value
          .filter((row) => !String(row.person_name || row.actor_name || '').trim() && !row.cast_member_id)
          .map((row) => String(row.movie_id)));
      }
      if (results[1].status === 'fulfilled') {
        invalidCrewMovieIds = new Set(results[1].value
          .filter((row) => !String(row.person_name || '').trim())
          .map((row) => String(row.movie_id)));
      }
      const errors = results
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason);
      if (errors.length) {
        console.error('Could not verify movie cast and crew data:', errors);
        creditWarning = `Cast and crew tables could not be checked: ${errors.map((error) => error.message).join('; ')}`;
      }
    }
  }

  const publicIds = new Set(publicRows.map((movie) => String(movie.id)));
  const duplicates = new Set(findDuplicateMovieIds(
    rawMovies.filter((movie) => movie.is_published === true || !supabase),
  ).map(String));
  const visibility = auditedMovies.map((movie) => {
    const movieIdString = String(movie.id);
    const published = movie.is_published === true || (!supabase && movie.is_published !== false);
    const duplicate = duplicates.has(movieIdString);
    if (!published) return { movieId: movie.id, status: 'draft', reason: 'The movie is marked as a draft, which the public catalog intentionally excludes.' };
    if (REMOVED_MOVIE_TITLES.has(String(movie.title || '').trim().toLocaleLowerCase())) {
      return { movieId: movie.id, status: 'excluded', reason: 'The public catalog filters out this title.' };
    }
    if (duplicate) return { movieId: movie.id, status: 'duplicate', reason: 'Another movie with the same title and release date is selected by the public catalog.' };
    if (!publicIds.has(movieIdString)) {
      return { movieId: movie.id, status: 'missing-from-catalog', reason: 'The published database record was not returned by the public movie query.' };
    }
    if (publicDetailAvailable === false) {
      return { movieId: movie.id, status: 'detail-unavailable', reason: 'The movie appears in the public catalog query but cannot be retrieved by the public ID-based detail query.' };
    }
    return { movieId: movie.id, status: 'visible', reason: 'The published movie is returned by the public catalog and can be retrieved by ID.' };
  });

  const preparedMovies = new Array(auditedMovies.length);
  let movieIndex = 0;
  const mediaWorkers = Array.from({ length: Math.min(6, auditedMovies.length) }, async () => {
    while (movieIndex < auditedMovies.length) {
      const index = movieIndex;
      movieIndex += 1;
      const movie = auditedMovies[index];
      const normalized = normalizeMovieRecord(movie);
      const [posterUrl, backdropUrl] = await Promise.all([
        getSignedMovieAssetUrl(movie.poster_url || movie.poster_path || movie.poster || ''),
        getSignedMovieAssetUrl(movie.backdrop_url || movie.backdrop_path || movie.backdrop || ''),
      ]);
      preparedMovies[index] = {
        ...normalized,
        poster_url: posterUrl || '',
        backdrop_url: backdropUrl || '',
        poster_path: posterUrl || '',
        backdrop_path: backdropUrl || '',
      };
    }
  });
  await Promise.all(mediaWorkers);
  const imageResults = await checkImages(preparedMovies);
  const detectedAt = new Date().toISOString();
  const issues = [];

  auditedMovies.forEach((movie) => {
    const normalized = normalizeMovieRecord(movie);
    const title = String(movie.title || '').trim();
    const genres = getGenreValues(movie);
    const publishStateValid = typeof movie.is_published === 'boolean';
    const movieIsPublished = movie.is_published === true || (!supabase && movie.is_published !== false);
    const publicVisible = publicIds.has(String(movie.id));
    const imageState = imageResults.get(String(movie.id)) || {};
    const issueMovie = {
      ...normalized,
      poster_url: imageState.posterUrl || normalized.poster_url,
      backdrop_url: imageState.backdropUrl || normalized.backdrop_url,
    };
    const add = (...args) => issues.push(makeIssue(issueMovie, ...args, detectedAt));

    if (!publishStateValid && supabase) {
      add('invalid_publication_state', 'warning', 'Publication state is missing or invalid', 'The website public catalog only queries rows where is_published is exactly true.', 'is_published', 'Choose Publish now or Save as draft in the movie editor.');
    }
    if (movieIsPublished && REMOVED_MOVIE_TITLES.has(title.toLocaleLowerCase())) {
      add('excluded_from_public', 'critical', 'Movie is excluded from the public catalog', 'The public catalog explicitly filters out this movie title.', 'title', 'Review the title and remove the exclusion in the catalog service if this title should be public.');
    } else if (movieIsPublished && (!publicVisible || publicDetailAvailable === false) && !duplicates.has(String(movie.id))) {
      const problem = publicDetailAvailable === false
        ? 'Movie is not visible on the website'
        : 'Published movie is missing from the public catalog';
      const reason = publicDetailAvailable === false
        ? 'The movie is in the public list query, but the public movie detail query could not retrieve it by ID.'
        : 'The movie is published in the database but was not returned by the public catalog query.';
      add('missing_from_public_catalog', 'critical', problem, reason, 'is_published', 'Check publication status, public query filters, row-level security, database permissions, and the movie ID.');
    }
    if (!title) {
      add('missing_title', 'warning', 'Movie title is missing', 'The public page uses a generic fallback title, so viewers cannot identify the movie.', 'title', 'Enter the movie title.');
    }
    if (!String(movie.description || movie.overview || '').trim()) {
      add('missing_description', 'warning', 'Movie description is missing', 'The movie detail page has no saved synopsis and will show a generic placeholder.', 'description', 'Add a short synopsis in Story & media.');
    }
    if (invalidCastMovieIds.has(String(movie.id))) {
      add('invalid_cast', 'warning', 'Movie has invalid cast data', 'At least one saved cast credit is missing a person name and cannot be displayed correctly.', 'cast_crew', 'Edit or remove cast credits that have no person name, then save the movie.');
    }
    if (invalidCrewMovieIds.has(String(movie.id))) {
      add('invalid_crew', 'warning', 'Movie has invalid crew data', 'At least one saved crew credit is missing a person name and cannot be displayed correctly.', 'cast_crew', 'Edit or remove crew credits that have no person name, then save the movie.');
    }
    if (!genres.length) {
      add('missing_genre', 'warning', 'Movie has no genre', 'Genre-based browsing and filtering cannot include this movie.', 'genre', 'Choose at least one genre.');
    } else if (genres.some((genre) => !isValidGenre(genre))) {
      add('invalid_genre', 'warning', 'Movie has invalid genre data', 'One or more genre values are empty, malformed, or use an unsupported numeric genre id.', 'genre', 'Replace invalid values with a genre name available in the movie editor.');
    }
    const contentType = movie.content_type || movie.media_type;
    if (contentType && !PUBLIC_CONTENT_TYPES.has(String(contentType).toLowerCase())) {
      add('invalid_content_type', 'warning', 'Movie category is invalid', `The saved content type “${contentType}” is not a supported movie or TV show category.`, 'content_type', 'Set Content Type to Movie or TV Show.');
    }
    if (movie.release_date && movie.release_date !== 'TBD' && !isValidDate(movie.release_date)) {
      add('invalid_release_date', 'warning', 'Release date is invalid', 'The saved release date is not a valid YYYY-MM-DD calendar date and may sort incorrectly on the website.', 'release_date', 'Choose a valid release date or clear the field.');
    }
    if (!String(movie.language || '').trim() && !(Array.isArray(movie.languages) && movie.languages.some((language) => String(language).trim()))) {
      add('missing_language', 'warning', 'Movie language is missing', 'The saved movie does not have a language value for language-based browsing.', 'language', 'Set a language in Basic Information.');
    }
    if (movie.trailer_url && !isValidHttpUrl(movie.trailer_url)) {
      add('invalid_trailer_url', 'warning', 'Trailer URL is invalid', 'The trailer link is not a valid HTTP or HTTPS URL.', 'trailer_url', 'Enter a valid HTTP or HTTPS trailer URL.');
    }
    const providers = Array.isArray(movie.watch_providers) ? movie.watch_providers : [];
    if (movie.watch_providers != null && !Array.isArray(movie.watch_providers)) {
      add('invalid_provider_data', 'warning', 'Streaming provider data is invalid', 'The saved provider data is not a list, so the movie detail page cannot render providers.', 'watch_providers', 'Save provider entries using the Where to Watch editor.');
    }
    providers.forEach((provider, index) => {
      if (!provider || typeof provider !== 'object' || Array.isArray(provider)) {
        add(`invalid_provider_${index}`, 'warning', `Provider ${index + 1} data is invalid`, 'A saved provider entry is not a provider object.', 'watch_providers', 'Remove or replace the invalid provider entry.');
        return;
      }
      if (provider.url && !isValidHttpUrl(provider.url)) {
        add(`invalid_provider_url_${index}`, 'warning', `${provider.name || `Provider ${index + 1}`} URL is invalid`, 'The saved provider link is not a valid HTTP or HTTPS URL.', 'watch_providers', 'Enter a valid HTTP or HTTPS provider URL.');
      }
      if (provider.logo_url && !isValidHttpUrl(provider.logo_url) && !isSupabaseStoragePath(provider.logo_url)) {
        add(`invalid_provider_logo_${index}`, 'warning', `${provider.name || `Provider ${index + 1}`} logo URL is invalid`, 'The provider logo is not a valid HTTP or HTTPS URL or movie storage path.', 'watch_providers', 'Enter a valid provider logo URL or upload the logo to movie storage.');
      }
    });
    if (movie.cast_crew != null && !Array.isArray(movie.cast_crew)) {
      add('invalid_legacy_credits', 'warning', 'Legacy cast and crew data is invalid', 'The saved cast_crew value is not a list and cannot be parsed by the movie detail page.', 'cast_crew', 'Replace the invalid legacy value with structured cast and crew entries.');
    }
    if (duplicates.has(String(movie.id))) {
      add('duplicate_movie', 'critical', 'Movie is not visible on the website', 'The public catalog suppresses this duplicate title and release date in favor of the other matching record.', 'title', 'Review the matching records and correct the title or release date so this movie has a unique catalog identity.');
    }
    if (imageState.poster === 'missing') {
      add('missing_poster', 'warning', 'Movie poster is missing', 'The website will use its default poster instead of movie artwork.', 'poster_url', 'Upload a poster or add a working poster URL.');
    } else if (imageState.poster === 'invalid' || imageState.poster === 'broken') {
      add('broken_poster', 'warning', 'Movie poster URL is invalid or failed to load', 'The poster image could not be loaded by the browser.', 'poster_url', 'Replace the poster with a valid public image URL or upload a new image.');
    } else if (imageState.poster === 'unverified') {
      add('unverified_poster', 'warning', 'Movie poster could not be verified', 'The image did not finish loading during the audit, so its availability could not be confirmed.', 'poster_url', 'Check the image host and run the audit again.');
    }
    if (imageState.backdrop === 'missing') {
      add('missing_backdrop', 'warning', 'Movie backdrop is missing', 'The website will use its default backdrop instead of movie artwork.', 'backdrop_url', 'Upload a backdrop or add a working backdrop URL.');
    } else if (imageState.backdrop === 'invalid' || imageState.backdrop === 'broken') {
      add('broken_backdrop', 'warning', 'Movie backdrop URL is invalid or failed to load', 'The backdrop image could not be loaded by the browser.', 'backdrop_url', 'Replace the backdrop with a valid public image URL or upload a new image.');
    } else if (imageState.backdrop === 'unverified') {
      add('unverified_backdrop', 'warning', 'Movie backdrop could not be verified', 'The image did not finish loading during the audit, so its availability could not be confirmed.', 'backdrop_url', 'Check the image host and run the audit again.');
    }
  });

  return {
    issues,
    source,
    creditWarning,
    auditedAt: detectedAt,
    movieCount: rawMovies.length,
    duplicateCount: findDuplicateMovieIds(rawMovies).length,
    visibility,
  };
};

export const recheckMovieProblems = async (movieId) => {
  if (movieId == null || !String(movieId).trim()) {
    throw new Error('Save the movie before checking its database and public visibility.');
  }
  return auditMoviesForProblems({ movieId });
};

export const removeDuplicateMovies = async () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Duplicate records cannot be deleted from local preview data.');
  }

  const movies = await fetchAllRows(() => supabase
    .from('movies')
    .select('id, title, release_date, created_at')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false }));
  const duplicateIds = findDuplicateMovieIds(movies);
  if (!duplicateIds.length) return { deletedCount: 0, duplicateCount: 0 };

  let deletedCount = 0;
  for (let index = 0; index < duplicateIds.length; index += CREDIT_MOVIE_ID_BATCH_SIZE) {
    const batch = duplicateIds.slice(index, index + CREDIT_MOVIE_ID_BATCH_SIZE);
    const { data, error } = await supabase
      .from('movies')
      .delete()
      .in('id', batch)
      .select('id');
    if (error) {
      throw new Error(`Deleted ${deletedCount} of ${duplicateIds.length} duplicate movies before the database returned an error: ${error.message}`);
    }
    deletedCount += (data || []).length;
    if ((data || []).length !== batch.length) {
      throw new Error(`Only ${deletedCount} of ${duplicateIds.length} duplicate movies were deleted. Some records may be blocked by permissions or database references.`);
    }
  }

  invalidateCache('catalog:');
  return { deletedCount, duplicateCount: duplicateIds.length };
};

const HISTORY_KEY = 'mythichq:movie-problem-history:v1';
const HISTORY_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;

export const updateMovieProblemHistory = (issues) => {
  const now = Date.now();
  let history = [];
  try {
    const stored = window.localStorage.getItem(HISTORY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) history = parsed;
      else console.warn('Movie problem history was not a list and has been reset.');
    }
  } catch (error) {
    console.warn('Could not read movie problem history:', error);
  }

  const activeByKey = new Map(issues.map((issue) => [issue.key, issue]));
  const updated = history.map((previous) => {
    const current = activeByKey.get(previous.key);
    if (current) {
      activeByKey.delete(previous.key);
      return { ...current, detectedAt: previous.detectedAt || current.detectedAt, status: 'active', resolvedAt: '' };
    }
    if (previous.status === 'active') return { ...previous, status: 'resolved', resolvedAt: new Date(now).toISOString() };
    return previous;
  });
  updated.push(...activeByKey.values());
  const recent = updated.filter((issue) => {
    const timestamp = Date.parse(issue.resolvedAt || issue.detectedAt);
    return Number.isFinite(timestamp) && now - timestamp <= HISTORY_MAX_AGE_MS;
  }).slice(-500);

  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(recent));
  } catch (error) {
    console.warn('Could not save movie problem history:', error);
  }
  return recent;
};

import { supabase } from '../lib/supabase';

export const STORAGE_BUCKET_NAME = 'POSTER';

export const isSupabaseStoragePath = (value) => {
  if (!value || typeof value !== 'string') return false;

  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/') || value.startsWith('data:')) {
    return false;
  }

  return value.includes('movies/') || value.includes('poster/') || value.includes('backdrop/');
};

const getSignedMovieAssetUrl = async (assetPath) => {
  if (!assetPath || !supabase || !isSupabaseStoragePath(assetPath)) {
    return assetPath || null;
  }

  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET_NAME)
      .createSignedUrl(assetPath, 60 * 60 * 24);

    if (error) {
      throw error;
    }

    return data?.signedUrl || assetPath;
  } catch (error) {
    console.error('Failed to create signed URL for movie asset:', error);
    return assetPath;
  }
};

export const resolveMovieMediaPaths = async (movie) => {
  if (!movie) return movie;

  const [posterPath, backdropPath] = await Promise.all([
    getSignedMovieAssetUrl(movie.poster_path || movie.poster_url || movie.poster || ''),
    getSignedMovieAssetUrl(movie.backdrop_path || movie.backdrop_url || movie.backdrop || ''),
  ]);

  return {
    ...movie,
    poster_path: posterPath || movie.poster_path || movie.poster_url || movie.poster || '',
    backdrop_path: backdropPath || movie.backdrop_path || movie.backdrop_url || movie.backdrop || '',
    poster_url: movie.poster_url || posterPath || movie.poster_path || movie.poster || '',
    backdrop_url: movie.backdrop_url || backdropPath || movie.backdrop_path || movie.backdrop || '',
  };
};

export const resolveMovieMediaPathsList = async (movies = []) => {
  if (!Array.isArray(movies) || movies.length === 0) {
    return movies;
  }

  const results = await Promise.all(movies.map((movie) => resolveMovieMediaPaths(movie)));
  return results;
};

export const ensureAuthenticatedUserId = async () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user?.id) {
    throw new Error('You must be logged in to upload movie media.');
  }

  return data.user.id;
};

export const uploadMovieAsset = async ({ file, movieId, mediaType, currentStoragePath }) => {
  if (!file) return '';

  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  if (!movieId) {
    throw new Error('A movie id is required before uploading a movie asset.');
  }

  const userId = await ensureAuthenticatedUserId();
  const extension = file.name.includes('.')
    ? file.name.split('.').pop() || 'jpg'
    : 'jpg';

  if (currentStoragePath && isSupabaseStoragePath(currentStoragePath)) {
    try {
      await supabase.storage.from(STORAGE_BUCKET_NAME).remove([currentStoragePath]);
    } catch (error) {
      console.warn('Could not remove old movie storage file before upload:', error);
    }
  }

  const storagePath = `${userId}/movies/${movieId}/${mediaType}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET_NAME)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadError) {
    throw uploadError;
  }

  return storagePath;
};

export const deleteMovieStorageAsset = async (assetPath) => {
  if (!assetPath || !supabase || !isSupabaseStoragePath(assetPath)) {
    return;
  }

  try {
    await supabase.storage.from(STORAGE_BUCKET_NAME).remove([assetPath]);
  } catch (error) {
    console.warn('Could not remove movie storage file:', error);
  }
};

export const deleteMovieStorageAssets = async (movie = {}) => {
  const assets = [movie.poster_url || movie.poster_path || movie.poster, movie.backdrop_url || movie.backdrop_path || movie.backdrop]
    .filter(Boolean)
    .filter((value) => isSupabaseStoragePath(value));

  if (assets.length === 0) return;

  await Promise.all(assets.map((asset) => deleteMovieStorageAsset(asset)));
};

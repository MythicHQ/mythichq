import { supabase } from '../lib/supabase';
import { deleteMovieStorageAsset, ensureAuthenticatedUserId, getSignedMovieAssetUrl, isSupabaseStoragePath, STORAGE_BUCKET_NAME } from './movieStorage';

const PROFILE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
};

export const fetchMovieCredits = async (movieId) => {
  const client = requireSupabase();
  const [{ data: castRows, error: castError }, { data: crewRows, error: crewError }] = await Promise.all([
    client.from('movie_cast').select('*').eq('movie_id', movieId).order('display_order', { ascending: true }),
    client.from('movie_crew').select('*').eq('movie_id', movieId).order('display_order', { ascending: true }),
  ]);

  if (castError) throw castError;
  if (crewError) throw crewError;

  const [cast, crew] = await Promise.all([
    Promise.all((castRows || []).map(async (person) => ({
      ...person,
      person_name: person.person_name || person.actor_name || '',
      display_order: person.display_order ?? person.credit_order ?? 0,
      image_url: await getSignedMovieAssetUrl(person.image_url),
      storage_path: person.image_url || '',
    }))),
    Promise.all((crewRows || []).map(async (person) => ({
      ...person,
      image_url: await getSignedMovieAssetUrl(person.image_url),
      storage_path: person.image_url || '',
    }))),
  ]);

  return { cast, crew };
};

export const uploadMovieCreditImage = async ({ file, movieId, creditType }) => {
  const client = requireSupabase();
  if (!file) return '';
  if (!PROFILE_IMAGE_TYPES.has(file.type)) {
    throw new Error('Choose a JPG, PNG, or WEBP profile image.');
  }
  if (file.size > MAX_PROFILE_IMAGE_SIZE) {
    throw new Error('Profile images must be 5 MB or smaller.');
  }
  if (!movieId) {
    throw new Error('Save the movie before uploading cast or crew images.');
  }

  const userId = await ensureAuthenticatedUserId();
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
  const storagePath = `${userId}/movies/${movieId}/${creditType}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from(STORAGE_BUCKET_NAME).upload(storagePath, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return storagePath;
};

const syncCastTable = async ({ movieId, entries }) => {
  const client = requireSupabase();
  const uniqueEntries = new Map();
  entries.forEach((entry) => {
    const personName = String(entry.person_name || '').trim();
    const characterName = String(entry.character_name || '').trim();
    if (!personName) return;
    const key = `${personName.toLocaleLowerCase()}\u0000${characterName.toLocaleLowerCase()}`;
    uniqueEntries.set(key, { ...entry, person_name: personName, character_name: characterName });
  });

  const castEntries = [...uniqueEntries.values()].map((entry, displayOrder) => ({
    person_name: entry.person_name,
    character_name: entry.character_name,
    image_url: entry.storage_path || entry.image_url || '',
    display_order: displayOrder,
  }));
  const { error } = await client.rpc('save_movie_cast_entries', {
    p_movie_id: movieId,
    p_cast: castEntries,
  });
  if (error) throw error;
};

const syncCrewTable = async ({ movieId, entries, existingEntries }) => {
  const client = requireSupabase();
  const existing = existingEntries || [];
  const savedIds = new Set();

  for (const [index, entry] of entries.entries()) {
    const record = {
      movie_id: movieId,
      person_name: entry.person_name.trim(),
      image_url: entry.storage_path || entry.image_url || '',
      display_order: index,
      department: entry.department?.trim() || 'Other',
      job: entry.job?.trim() || '',
      updated_at: new Date().toISOString(),
    };
    const matched = existing.find((person) => UUID_PATTERN.test(String(entry.id || '')) && person.id === entry.id);
    const result = matched
      ? await client.from('movie_crew').update(record).eq('id', matched.id).select('id').single()
      : await client.from('movie_crew').insert(record).select('id').single();
    if (result.error) throw result.error;
    if (result.data?.id) savedIds.add(result.data.id);
  }

  const removeIds = existing
    .map((entry) => entry.id)
    .filter((id) => UUID_PATTERN.test(String(id || '')) && !savedIds.has(id));
  if (removeIds.length) {
    const { error } = await client.from('movie_crew').delete().in('id', removeIds);
    if (error) throw error;
  }
};

export const saveMovieCredits = async ({ movieId, cast, crew, existingCast, existingCrew, saveCast = true }) => {
  if (saveCast) {
    await syncCastTable({
      movieId,
      entries: cast,
    });
  }
  await syncCrewTable({
    movieId,
    entries: crew,
    existingEntries: existingCrew,
  });

  const retainedPaths = new Set([...cast, ...crew]
    .map((entry) => entry.storage_path || entry.image_url)
    .filter(Boolean));
  const previousPaths = new Set([...existingCast, ...existingCrew]
    .map((entry) => entry.storage_path || entry.image_url)
    .filter((path) => path && isSupabaseStoragePath(path)));
  await Promise.all([...previousPaths]
    .filter((path) => !retainedPaths.has(path))
    .map((path) => deleteMovieStorageAsset(path)));
};

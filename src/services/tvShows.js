import { supabase } from '../lib/supabase';
import { copyImageCropSettings } from './imageCrops';
import { getSignedMovieAssetUrl, isSupabaseStoragePath, resolveMovieMediaPathsList, STORAGE_BUCKET_NAME } from './movieStorage';
import { cachedRequest, invalidateCache } from './requestCache';

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
};

const slugify = (title = '') => String(title)
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'tv-show';

const getYouTubeKey = (value = '') => {
  const match = String(value).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/i);
  return match?.[1] || '';
};

export const normalizeTvShowRecord = (show = {}) => {
  const genres = Array.isArray(show.genres)
    ? show.genres.map((genre) => (typeof genre === 'string' ? genre : genre?.name || '')).filter(Boolean)
    : [];
  const languages = Array.isArray(show.languages) ? show.languages : [];
  const rating = Number(show.user_rating ?? show.tmdb_rating ?? 0);
  return {
    ...show,
    record_type: 'tv_show',
    id: Number(show.id),
    title: show.title || 'Untitled TV Show',
    slug: show.slug || slugify(show.title),
    content_type: 'tv_show',
    release_date: show.premiere_date || show.first_air_date || null,
    description: show.description || show.short_description || '',
    overview: show.description || show.short_description || '',
    genre: genres,
    genres: genres.map((name, index) => ({ id: index + 1, name })),
    languages,
    language: languages.join(', '),
    ott: (show.watch_providers || []).map((provider) => provider.name).filter(Boolean).join(', '),
    otts: (show.watch_providers || []).map((provider) => provider.name).filter(Boolean),
    watch_providers: Array.isArray(show.watch_providers) ? show.watch_providers : [],
    poster_path: show.poster_url || '/movie-assets/posters/default-poster.jpg',
    backdrop_path: show.backdrop_url || '/movie-assets/backdrops/default-backdrop.jpg',
    rating,
    vote_average: rating,
    vote_count: Number(show.vote_count || 0),
    runtime: Number(show.average_episode_runtime || 0),
    trailer_key: getYouTubeKey(show.trailer_url || ''),
    trending_now: show.is_trending === true,
    popular: show.is_popular === true,
    new_releases: show.is_new === true,
    top_rated_masterpieces: show.is_top_rated === true,
    featured: show.editors_pick === true,
    is_published: show.is_published === true,
    badges: Array.isArray(show.badges) ? show.badges : [],
  };
};

export const fetchPublicTvShows = async () => cachedRequest('catalog:tv-shows', async () => {
  const client = requireSupabase();
  const { data, error } = await client.from('tv_shows')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });
  if (error) throw error;
  const shows = (data || []).filter((show) => show.is_published === true).map(normalizeTvShowRecord);
  return resolveMovieMediaPathsList(shows);
});

export const fetchHeroTvShows = async () => cachedRequest('catalog:hero:tv-shows', async () => {
  const client = requireSupabase();
  const { data, error } = await client.from('hero_tv_shows')
    .select('id, tv_show_id, position, tv_show:tv_shows(*)')
    .order('position', { ascending: true });
  if (error) throw error;

  const selectedShows = (data || [])
    .filter((entry) => entry.tv_show?.is_published === true)
    .map((entry) => ({
      ...normalizeTvShowRecord(entry.tv_show),
      hero_position: entry.position,
      hero_row_id: entry.id,
    }));

  const resolvedShows = await resolveMovieMediaPathsList(selectedShows);
  return Promise.all(resolvedShows.map(async (show) => ({
    ...show,
    title_image_display_url: await getSignedMovieAssetUrl(show.title_image_url),
  })));
});

export const fetchAdminTvShows = async () => {
  const client = requireSupabase();
  const { data, error } = await client.from('tv_shows').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return Promise.all((data || []).map(resolveTvShowMedia));
};

const resolveTvShowMedia = async (show) => {
  const resolved = await resolveMovieMediaPathsList([normalizeTvShowRecord(show)]);
  const [item] = resolved;
  return {
    ...item,
    poster_url: show.poster_url || '',
    backdrop_url: show.backdrop_url || '',
    title_image_url: show.title_image_url || '',
    title_image_display_url: await getSignedMovieAssetUrl(show.title_image_url),
    banner_url: show.banner_url || '',
    thumbnail_url: show.thumbnail_url || '',
    banner_display_url: await getSignedMovieAssetUrl(show.banner_url),
    thumbnail_display_url: await getSignedMovieAssetUrl(show.thumbnail_url),
  };
};

export const fetchTvShowForAdmin = async (showId) => {
  const client = requireSupabase();
  const { data: show, error: showError } = await client.from('tv_shows').select('*').eq('id', Number(showId)).maybeSingle();
  if (showError) throw showError;
  if (!show) throw new Error('TV Show not found.');

  const [{ data: seasons, error: seasonsError }, { data: castRows, error: castError }, { data: crew, error: crewError }] = await Promise.all([
    client.from('tv_show_seasons').select('*, episodes:tv_show_episodes(*)').eq('tv_show_id', Number(showId)).order('display_order'),
    client.from('tv_show_cast').select('cast_member_id, character_name, cast_order, cast_members(id, full_name, profession, profile_image)').eq('tv_show_id', Number(showId)).order('cast_order'),
    client.from('tv_show_crew').select('*').eq('tv_show_id', Number(showId)).order('display_order'),
  ]);
  if (seasonsError) throw seasonsError;
  if (castError) throw castError;
  if (crewError) throw crewError;

  const resolvedSeasons = await Promise.all((seasons || []).map(async (season) => ({
    ...season,
    poster_display_url: await getSignedMovieAssetUrl(season.poster_url),
    episodes: await Promise.all((season.episodes || []).sort((a, b) => a.display_order - b.display_order).map(async (episode) => ({
      ...episode,
      still_display_url: await getSignedMovieAssetUrl(episode.still_url),
    }))),
  })));
  const centralCast = await Promise.all((castRows || []).filter((row) => row.cast_members).map(async (row) => ({
    ...row.cast_members,
    id: row.cast_member_id,
    cast_member_id: row.cast_member_id,
    character_name: row.character_name || '',
    display_order: row.cast_order,
    profile_image_url: await getSignedMovieAssetUrl(row.cast_members.profile_image),
  })));
  const resolvedCrew = await Promise.all((crew || []).map(async (person) => ({
    ...person,
    image_url: await getSignedMovieAssetUrl(person.image_url),
    storage_path: person.image_url || '',
  })));
  const resolvedShow = await resolveTvShowMedia(show);
  return { ...resolvedShow, seasons: resolvedSeasons, centralCast, crew: resolvedCrew };
};

export const fetchPublicTvShowDetails = async (identifier) => {
  const normalized = String(identifier || '').trim();
  if (!normalized) return null;
  const client = requireSupabase();
  let request = client.from('tv_shows').select('*').eq('is_published', true);
  if (/^\d+$/.test(normalized)) request = request.eq('id', Number(normalized));
  else {
    const { data, error } = await client.from('tv_shows').select('*').eq('is_published', true);
    if (error) throw error;
    const match = (data || []).find((show) => slugify(show.title) === normalized);
    if (!match) return null;
    request = client.from('tv_shows').select('*').eq('id', match.id).eq('is_published', true);
  }
  const { data: show, error } = await request.maybeSingle();
  if (error) throw error;
  if (!show) return null;

  const [{ data: seasons, error: seasonsError }, { data: castRows, error: castError }, { data: crew, error: crewError }] = await Promise.all([
    client.from('tv_show_seasons').select('*, episodes:tv_show_episodes(*)').eq('tv_show_id', show.id).order('display_order'),
    client.from('tv_show_cast').select('cast_order, character_name, cast_members(id, full_name, profession, profile_image)').eq('tv_show_id', show.id).order('cast_order'),
    client.from('tv_show_crew').select('*').eq('tv_show_id', show.id).order('display_order'),
  ]);
  if (seasonsError) throw seasonsError;
  if (castError) throw castError;
  if (crewError) throw crewError;
  const resolvedShow = await resolveTvShowMedia(show);
  return {
    ...resolvedShow,
    seasons: await Promise.all((seasons || []).map(async (season) => ({
      ...season,
      poster_display_url: await getSignedMovieAssetUrl(season.poster_url),
      episodes: await Promise.all((season.episodes || []).sort((a, b) => a.display_order - b.display_order).map(async (episode) => ({
        ...episode,
        still_display_url: await getSignedMovieAssetUrl(episode.still_url),
      }))),
    }))),
    centralCast: await Promise.all((castRows || []).filter((row) => row.cast_members).map(async (row) => ({
      ...row.cast_members,
      character_name: row.character_name || '',
      profile_image_url: await getSignedMovieAssetUrl(row.cast_members.profile_image),
    }))),
    crew: await Promise.all((crew || []).map(async (person) => ({
      ...person,
      image_url: await getSignedMovieAssetUrl(person.image_url),
    }))),
  };
};

export const uploadTvShowAsset = async ({ file, showId, mediaType }) => {
  if (!file) return '';
  const client = requireSupabase();
  const { data, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!data?.user?.id) throw new Error('Sign in with an admin account before uploading TV show media.');
  if (!showId) throw new Error('Save the TV Show before uploading media.');
  const extension = file.name.includes('.') ? file.name.split('.').pop() || 'jpg' : 'jpg';
  const path = `${data.user.id}/tv-shows/${showId}/${mediaType}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from(STORAGE_BUCKET_NAME).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  return path;
};

export const uploadTvShowCrewImage = async ({ file, showId }) => {
  if (!file) return '';
  const client = requireSupabase();
  const { data, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!data?.user?.id) throw new Error('Sign in with an admin account before uploading crew images.');
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1] || 'jpg';
  const path = `${data.user.id}/tv-shows/${showId}/crew/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from(STORAGE_BUCKET_NAME).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
};

export const saveTvShowRecord = async (payload, showId = null) => {
  const client = requireSupabase();
  const request = showId
    ? client.from('tv_shows').update(payload).eq('id', Number(showId))
    : client.from('tv_shows').insert(payload);
  const { data, error } = await request.select('*').single();
  if (error) throw error;
  if (!data?.id) throw new Error('The TV Show was saved, but the database did not return its ID.');
  return data;
};

export const saveTvShowSeasons = async (showId, seasons) => {
  const { error } = await requireSupabase().rpc('save_tv_show_seasons', {
    p_tv_show_id: Number(showId),
    p_seasons: seasons,
  });
  if (error) throw error;
};

export const saveTvShowCast = async (showId, cast) => {
  const normalized = cast.filter((member) => member.id).map((member, castOrder) => ({
    cast_member_id: member.id,
    character_name: String(member.character_name || '').trim(),
    cast_order: castOrder,
  }));
  const { error } = await requireSupabase().rpc('save_tv_show_cast', {
    p_tv_show_id: Number(showId),
    p_cast: normalized,
  });
  if (error) throw error;
};

export const saveTvShowCrew = async (showId, entries) => {
  const client = requireSupabase();
  const { data: existing, error: loadError } = await client.from('tv_show_crew').select('*').eq('tv_show_id', Number(showId));
  if (loadError) throw loadError;
  const savedIds = new Set();
  const nextPaths = new Set();
  const uploadedPaths = [];
  for (const [displayOrder, entry] of entries.entries()) {
    const personName = String(entry.person_name || '').trim();
    if (!personName) continue;
    let imageUrl = entry.removeImage ? '' : (entry.storage_path || entry.image_url || '');
    if (entry.imageFile) {
      imageUrl = await uploadTvShowCrewImage({ file: entry.imageFile, showId });
      uploadedPaths.push(imageUrl);
      if (entry.imagePreview) await copyImageCropSettings(entry.imagePreview, imageUrl);
    }
    const payload = {
      tv_show_id: Number(showId),
      person_name: personName,
      department: String(entry.department || 'Other').trim() || 'Other',
      job: String(entry.job || '').trim(),
      image_url: imageUrl,
      display_order: displayOrder,
      updated_at: new Date().toISOString(),
    };
    const existingEntry = existing?.find((item) => item.id === entry.id);
    const request = existingEntry
      ? client.from('tv_show_crew').update(payload).eq('id', existingEntry.id)
      : client.from('tv_show_crew').insert(payload);
    const { data, error } = await request.select('id').single();
    if (error) throw error;
    if (data?.id) savedIds.add(data.id);
    if (imageUrl) nextPaths.add(imageUrl);
  }
  const removeIds = (existing || []).map((entry) => entry.id).filter((entryId) => !savedIds.has(entryId));
  const removedPaths = (existing || [])
    .filter((entry) => removeIds.includes(entry.id) || (entry.image_url && !nextPaths.has(entry.image_url)))
    .map((entry) => entry.image_url)
    .filter((path) => path && isSupabaseStoragePath(path));
  if (removeIds.length) {
    const { error } = await client.from('tv_show_crew').delete().in('id', removeIds);
    if (error) {
      await Promise.all(uploadedPaths.map((path) => client.storage.from(STORAGE_BUCKET_NAME).remove([path])));
      throw error;
    }
  }
  for (const path of removedPaths) {
    const { error } = await client.storage.from(STORAGE_BUCKET_NAME).remove([path]);
    if (error) console.warn('TV Show crew was saved, but an old crew image could not be removed:', error);
  }
};

export const deleteTvShow = async (show) => {
  const client = requireSupabase();
  const [{ data: seasons, error: seasonError }, { data: crew, error: crewError }] = await Promise.all([
    client.from('tv_show_seasons').select('id, poster_url').eq('tv_show_id', Number(show.id)),
    client.from('tv_show_crew').select('image_url').eq('tv_show_id', Number(show.id)),
  ]);
  if (seasonError) throw seasonError;
  if (crewError) throw crewError;
  const seasonIds = (seasons || []).map((season) => season.id);
  let episodeStillUrls = [];
  if (seasonIds.length) {
    const { data: episodes, error: episodesError } = await client.from('tv_show_episodes').select('still_url').in('season_id', seasonIds);
    if (episodesError) throw episodesError;
    episodeStillUrls = (episodes || []).map((episode) => episode.still_url);
  }
  const { data, error } = await client.from('tv_shows').delete().eq('id', Number(show.id)).select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('The TV Show was not deleted. Check your admin permissions and try again.');

  const assets = [
    show.poster_url,
    show.backdrop_url,
    show.title_image_url,
    show.banner_url,
    show.thumbnail_url,
    ...(seasons || []).map((season) => season.poster_url),
    ...episodeStillUrls,
    ...(crew || []).map((member) => member.image_url),
  ].filter((path) => path && isSupabaseStoragePath(path));
  if (assets.length) {
    const { error: storageError } = await client.storage.from(STORAGE_BUCKET_NAME).remove(assets);
    if (storageError) console.warn('TV Show was deleted, but some media assets could not be removed:', storageError);
  }
  invalidateCache('catalog:');
};

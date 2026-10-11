import { supabase } from '../lib/supabase';
import { deleteMovieStorageAsset, ensureAuthenticatedUserId, getSignedMovieAssetUrl, STORAGE_BUCKET_NAME } from './movieStorage';

const requireClient = () => {
  if (!supabase) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  return supabase;
};

const normalizeDraft = (draft) => {
  const fullName = String(draft.full_name || '').trim();
  if (!fullName) throw new Error('Full name is required.');
  return {
    full_name: fullName,
    profession: String(draft.profession || 'Actor').trim() || 'Actor',
    biography: String(draft.biography || '').trim(),
    date_of_birth: draft.date_of_birth || null,
    nationality: String(draft.nationality || '').trim(),
    instagram_url: String(draft.instagram_url || '').trim(),
    x_url: String(draft.x_url || '').trim(),
    facebook_url: String(draft.facebook_url || '').trim(),
    website_url: String(draft.website_url || '').trim(),
    other_social_links: String(draft.other_social_links || '').trim(),
    profile_image: String(draft.profile_image || '').trim(),
  };
};

const resolveCastMember = async (member) => ({
  ...member,
  profile_image_url: await getSignedMovieAssetUrl(member.profile_image),
  movie_count: Number(member.movie_count ?? member.movie_cast?.[0]?.count ?? member.movie_cast?.count ?? 0)
    + Number(member.tv_show_count ?? member.tv_show_cast?.[0]?.count ?? member.tv_show_cast?.count ?? 0),
});

export const searchCastMembers = async (query = '', { limit = 12 } = {}) => {
  const client = requireClient();
  const normalized = query.trim();
  if (!normalized) return [];
  const [nameResult, characterResult, tvCharacterResult] = await Promise.all([
    client.from('cast_members').select('*, movie_cast(count), tv_show_cast(count)').ilike('full_name', `%${normalized}%`).order('full_name').limit(limit),
    client.from('movie_cast').select('cast_members!inner(*, movie_cast(count), tv_show_cast(count))').ilike('character_name', `%${normalized}%`).limit(limit),
    client.from('tv_show_cast').select('cast_members!inner(*, movie_cast(count), tv_show_cast(count))').ilike('character_name', `%${normalized}%`).limit(limit),
  ]);
  if (nameResult.error) throw nameResult.error;
  if (characterResult.error) throw characterResult.error;
  if (tvCharacterResult.error) throw tvCharacterResult.error;
  const byId = new Map();
  [...(nameResult.data || []), ...(characterResult.data || []).map((row) => row.cast_members).filter(Boolean), ...(tvCharacterResult.data || []).map((row) => row.cast_members).filter(Boolean)]
    .forEach((member) => byId.set(member.id, member));
  return Promise.all([...byId.values()].slice(0, limit).map(resolveCastMember));
};

export const loadCastMembers = async ({ page = 0, pageSize = 24, query = '' } = {}) => {
  const client = requireClient();
  const from = page * pageSize;
  let request = client.from('cast_members')
    .select('*, movie_cast(count), tv_show_cast(count)', { count: 'exact' })
    .order('full_name')
    .range(from, from + pageSize - 1);
  if (query.trim()) request = request.ilike('full_name', `%${query.trim()}%`);
  const { data, error, count } = await request;
  if (error) throw error;
  return { members: await Promise.all((data || []).map(resolveCastMember)), count: count || 0 };
};

export const getCastMember = async (id) => {
  const client = requireClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(id || ''));
  const { data, error } = await client.from('cast_members').select('*')
    .eq(isUuid ? 'id' : 'full_name', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Cast member not found.');
  return resolveCastMember(data);
};

export const saveCastMember = async (draft, id = null) => {
  const client = requireClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Sign in with an admin account before saving cast members.');

  const normalized = normalizeDraft(draft);
  const request = id
    ? client.from('cast_members').update(normalized).eq('id', id)
    : client.from('cast_members').insert(normalized);
  const { data, error } = await request.select('*').single();
  if (error?.code === '23505') {
    throw new Error(`A cast member named "${normalized.full_name}" already exists. Search the Cast directory and edit the existing profile instead.`);
  }
  if (error) throw error;
  return resolveCastMember(data);
};

export const deleteCastMember = async (id) => {
  const client = requireClient();
  const member = await getCastMember(id);
  const { error } = await client.from('cast_members').delete().eq('id', id);
  if (error) throw error;
  if (member.profile_image?.includes('/cast/')) await deleteMovieStorageAsset(member.profile_image);
};

export const uploadCastMemberImage = async (file, previousPath = '') => {
  if (!file) return previousPath;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Choose a JPG, PNG, or WEBP profile image.');
  }
  if (file.size > 5 * 1024 * 1024) throw new Error('Profile images must be 5 MB or smaller.');
  const client = requireClient();
  const userId = await ensureAuthenticatedUserId();
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
  const path = `${userId}/cast/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from(STORAGE_BUCKET_NAME).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  if (previousPath && previousPath.includes('/cast/')) await deleteMovieStorageAsset(previousPath);
  return path;
};

export const fetchMovieCastMembers = async (movieId) => {
  const client = requireClient();
  const { data, error } = await client.from('movie_cast')
    .select('id, movie_id, cast_member_id, character_name, cast_order, cast_members(id, full_name, profession, profile_image)')
    .eq('movie_id', movieId)
    .not('cast_member_id', 'is', null)
    .order('cast_order', { ascending: true });
  if (error) throw error;
  return Promise.all((data || []).filter((row) => row.cast_members).map(async (row) => ({
    ...row.cast_members,
    id: row.cast_member_id,
    cast_member_id: row.cast_member_id,
    character_name: row.character_name || '',
    display_order: row.cast_order,
    image_url: await getSignedMovieAssetUrl(row.cast_members.profile_image),
  })));
};

export const saveMovieCastMembers = async (movieId, members) => {
  const client = requireClient();
  const unique = [];
  const seen = new Set();
  members.forEach((member) => {
    if (!member.id || seen.has(member.id)) return;
    seen.add(member.id);
    unique.push({
      cast_member_id: member.id,
      character_name: String(member.character_name || '').trim(),
      cast_order: unique.length,
    });
  });
  const { error } = await client.rpc('save_movie_cast_members', { p_movie_id: movieId, p_cast: unique });
  if (error) throw error;
};

export const loadCastMemberMovies = async (castMemberId, { publishedOnly = false } = {}) => {
  const client = requireClient();
  const [movieLinksResult, tvLinksResult] = await Promise.all([
    client.from('movie_cast').select('id, movie_id, cast_member_id, character_name, cast_order').eq('cast_member_id', castMemberId).order('cast_order'),
    client.from('tv_show_cast').select('id, tv_show_id, cast_member_id, character_name, cast_order').eq('cast_member_id', castMemberId).order('cast_order'),
  ]);
  if (movieLinksResult.error) throw movieLinksResult.error;
  if (tvLinksResult.error) throw tvLinksResult.error;

  const movieLinks = movieLinksResult.data || [];
  const tvLinks = tvLinksResult.data || [];
  const [moviesResult, tvShowsResult] = await Promise.all([
    movieLinks.length
      ? (() => {
        let query = client.from('movies').select('id, title, release_date, poster_url, movie_status, is_published').in('id', [...new Set(movieLinks.map((link) => link.movie_id))]);
        if (publishedOnly) query = query.eq('is_published', true);
        return query;
      })()
      : Promise.resolve({ data: [], error: null }),
    tvLinks.length
      ? (() => {
        let query = client.from('tv_shows').select('id, title, premiere_date, poster_url, show_status, is_published').in('id', [...new Set(tvLinks.map((link) => link.tv_show_id))]);
        if (publishedOnly) query = query.eq('is_published', true);
        return query;
      })()
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (moviesResult.error) throw moviesResult.error;
  if (tvShowsResult.error) throw tvShowsResult.error;
  const movieById = new Map((moviesResult.data || []).map((movie) => [String(movie.id), movie]));
  const tvShowById = new Map((tvShowsResult.data || []).map((show) => [String(show.id), show]));
  const resolvedMovies = await Promise.all(movieLinks.filter((link) => movieById.has(String(link.movie_id))).map(async (link) => {
    const record = movieById.get(String(link.movie_id));
    const posterUrl = await getSignedMovieAssetUrl(record.poster_url || '');
    return { ...link, movie: posterUrl, movie_record: { ...record, poster_url: posterUrl, content_type: 'movie' }, content_type: 'movie' };
  }));
  const resolvedTvShows = await Promise.all(tvLinks.filter((link) => tvShowById.has(String(link.tv_show_id))).map(async (link) => {
    const record = tvShowById.get(String(link.tv_show_id));
    const posterUrl = await getSignedMovieAssetUrl(record.poster_url || '');
    return {
      ...link,
      id: `tv-${link.id}`,
      movie: posterUrl,
      movie_record: {
        ...record,
        release_date: record.premiere_date,
        movie_status: record.show_status,
        poster_url: posterUrl,
        content_type: 'tv_show',
      },
      content_type: 'tv_show',
    };
  }));
  return [...resolvedMovies, ...resolvedTvShows];
};

export const searchMoviesForCast = async (query, { limit = 12 } = {}) => {
  const client = requireClient();
  const normalized = String(query || '').trim();
  if (normalized.length < 2) return [];
  const { data, error } = await client.from('movies')
    .select('id, title, release_date, poster_url, movie_status, is_published')
    .ilike('title', `%${normalized}%`)
    .order('release_date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return Promise.all((data || []).map(async (movie) => ({
    ...movie,
    poster_display_url: await getSignedMovieAssetUrl(movie.poster_url || ''),
  })));
};

export const addCastMemberToMovie = async (castMember, movieId) => {
  const client = requireClient();
  const { data: existing, error: existingError } = await client.from('movie_cast')
    .select('id')
    .eq('movie_id', movieId)
    .eq('cast_member_id', castMember.id)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) throw new Error('This cast member is already linked to that movie.');

  const { data: existingLinks, error: linksError } = await client.from('movie_cast')
    .select('cast_order')
    .eq('movie_id', movieId)
    .order('cast_order', { ascending: true });
  if (linksError) throw linksError;
  const { error } = await client.from('movie_cast').insert({
    movie_id: movieId,
    cast_member_id: castMember.id,
    actor_name: castMember.full_name,
    person_name: castMember.full_name,
    character_name: '',
    cast_order: existingLinks?.length || 0,
    display_order: existingLinks?.length || 0,
    credit_order: existingLinks?.length || 0,
  });
  if (error?.code === '23505') throw new Error('This cast member or character is already linked to that movie.');
  if (error) throw error;
};

export const updateCastMovieLink = async (linkId, updates) => {
  const client = requireClient();
  const { error } = await client.from('movie_cast').update(updates).eq('id', linkId);
  if (error?.code === '23505') throw new Error('That cast member and character are already linked to this movie.');
  if (error) throw error;
};

export const removeCastMemberFromMovie = async (link) => {
  const client = requireClient();
  const { error } = await client.from('movie_cast').delete().eq('id', link.id);
  if (error) throw error;
};

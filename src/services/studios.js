import { supabase } from '../lib/supabase';
import { copyImageCropSettings } from './imageCrops';
import { cachedRequest, getCachedRequest, invalidateCache } from './requestCache';

const TABLE = 'studios';
const SETTINGS_TABLE = 'studio_home_settings';
const BUCKET = 'studio-images';
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const STUDIO_FIELDS = 'id, name, slug, description, website_url, logo_url, logo_path, background_url, background_path, background_color, overlay_opacity, logo_position, text_position, display_order, is_featured, is_active, created_at, updated_at';
const DEFAULT_SETTINGS = { featured_limit: 6 };
export const PUBLIC_STUDIOS_CACHE_KEY = 'catalog:studios:active';
const PUBLIC_STUDIOS_TTL = 5 * 60 * 1000;
let studiosChannelSequence = 0;
export const getStudioContentCacheKey = (studioId) => `catalog:studio-content:${studioId}`;

const missingTable = (error) => ['42P01', 'PGRST205'].includes(error?.code);
const showError = (error) => missingTable(error)
  || ['PGRST202', 'PGRST204', '42883', '42703'].includes(error?.code)
  ? new Error('The Studios database migration is out of date. Run the latest supabase/studios.sql in the Supabase SQL Editor.')
  : error;

export const createStudioSlug = (value) => String(value || '').normalize('NFKD').toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const fetchStudiosFromSupabase = async ({ includeInactive = false } = {}) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  let query = supabase.from(TABLE).select(STUDIO_FIELDS).order('display_order', { ascending: true }).order('name');
  if (!includeInactive) query = query.eq('is_active', true);
  const [studiosResult, settingsResult] = await Promise.all([
    query,
    supabase.from(SETTINGS_TABLE).select('featured_limit').eq('id', true).maybeSingle(),
  ]);
  if (studiosResult.error) throw showError(studiosResult.error);
  if (settingsResult.error && !missingTable(settingsResult.error)) throw settingsResult.error;
  return { studios: studiosResult.data || [], settings: settingsResult.data || DEFAULT_SETTINGS };
};

export const getCachedStudios = () => getCachedRequest(PUBLIC_STUDIOS_CACHE_KEY);

export const fetchStudios = async ({ includeInactive = false } = {}) => includeInactive
  ? fetchStudiosFromSupabase({ includeInactive })
  : cachedRequest(PUBLIC_STUDIOS_CACHE_KEY, () => fetchStudiosFromSupabase(), { ttl: PUBLIC_STUDIOS_TTL });

export const fetchFeaturedStudios = async () => {
  const { studios, settings } = await fetchStudios();
  return studios.filter((studio) => studio.is_featured).slice(0, Math.min(6, Math.max(4, Number(settings.featured_limit) || 6)));
};

export const subscribeToStudios = (callback) => {
  if (!supabase) return () => {};
  const handleChange = (event) => {
    if (event.table === TABLE || event.table === SETTINGS_TABLE) {
      invalidateCache(PUBLIC_STUDIOS_CACHE_KEY);
    }
    if (event.table === 'content_studio_assignments') {
      invalidateCache('catalog:studio-content:');
      invalidateCache('catalog:studio-titles:');
    }
    callback(event);
  };
  const channel = supabase.channel(`studios-live-${Date.now()}-${++studiosChannelSequence}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, handleChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: SETTINGS_TABLE }, handleChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'content_studio_assignments' }, handleChange)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
};

const uploadAsset = async (file, userId, slug, kind) => {
  if (!file) return null;
  const extension = IMAGE_TYPES[file.type];
  if (!extension) throw new Error('Choose a PNG, JPEG, or WebP image.');
  if (file.size > MAX_IMAGE_SIZE) throw new Error('Studio images must be 8 MB or smaller.');
  const path = `${userId}/${slug}/${kind}-${crypto.randomUUID()}.${extension}`;
  const bucket = supabase.storage.from(BUCKET);
  const { error } = await bucket.upload(path, file, { cacheControl: '3600', contentType: file.type, upsert: false });
  if (error) throw error;
  return { path, url: bucket.getPublicUrl(path).data.publicUrl };
};

const validateImageUrl = (value, label) => {
  const url = String(value || '').trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    return parsed.href;
  } catch {
    throw new Error(`${label} must be a valid HTTP or HTTPS image URL.`);
  }
};

export const saveStudio = async ({ values, files, imageUrls = {}, cropSources = {}, previous, userId, removeAssets = {} }) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  if (!userId) throw new Error('Your admin session has expired. Sign in again.');
  const name = values.name.trim();
  const slug = createStudioSlug(values.slug || name);
  if (!name || !slug) throw new Error('Add a studio name before saving.');
  const uploaded = [];
  try {
    const logoUrl = validateImageUrl(imageUrls.logo, 'Studio logo link');
    const backgroundUrl = validateImageUrl(imageUrls.background, 'Background image link');
    const websiteUrl = validateImageUrl(values.website_url, 'Studio website');
    const logo = await uploadAsset(files.logo, userId, slug, 'logo');
    const background = await uploadAsset(files.background, userId, slug, 'background');
    if (logo) uploaded.push(logo.path);
    if (background) uploaded.push(background.path);
    const payload = {
      name, slug, description: values.description.trim(), website_url: websiteUrl,
      logo_url: logo?.url || logoUrl || (removeAssets.logo ? null : previous?.logo_url || null), logo_path: logo?.path || (logoUrl || removeAssets.logo ? null : previous?.logo_path || null),
      background_url: background?.url || backgroundUrl || (removeAssets.background ? null : previous?.background_url || null), background_path: background?.path || (backgroundUrl || removeAssets.background ? null : previous?.background_path || null),
      background_color: values.background_color || '#171a24', overlay_opacity: Math.max(0, Math.min(0.9, Number(values.overlay_opacity) || 0.48)),
      logo_position: values.logo_position, text_position: values.text_position, display_order: Math.max(0, Number(values.display_order) || 0),
      is_featured: Boolean(values.is_featured), is_active: Boolean(values.is_active), updated_at: new Date().toISOString(),
    };

    const query = previous?.id ? supabase.from(TABLE).update(payload).eq('id', previous.id) : supabase.from(TABLE).insert(payload);
    const { data, error } = await query.select(STUDIO_FIELDS).single();
    if (error) throw error;
    const cropResults = await Promise.allSettled([
      cropSources.logo?.startsWith('blob:') && data.logo_url
        ? copyImageCropSettings(cropSources.logo, data.logo_url)
        : Promise.resolve(),
      cropSources.background?.startsWith('blob:') && data.background_url
        ? copyImageCropSettings(cropSources.background, data.background_url)
        : Promise.resolve(),
    ]);
    const cropErrors = cropResults
      .filter((result) => result.status === 'rejected')
      .map((result) => result.reason?.message || 'An image crop could not be applied.');
    const old = [previous?.logo_path, previous?.background_path].filter((path) => path && path !== data.logo_path && path !== data.background_path);
    if (old.length) { const { error: removeError } = await supabase.storage.from(BUCKET).remove(old); if (removeError) console.warn('Saved studio but could not remove replaced images:', removeError); }
    invalidateCache(PUBLIC_STUDIOS_CACHE_KEY);
    return cropErrors.length
      ? { ...data, cropWarning: `Studio saved, but image crop settings could not be transferred: ${cropErrors.join(' ')}` }
      : data;
  } catch (error) {
    if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded);
    throw showError(error);
  }
};

export const fetchContentStudioIds = async (contentType, contentId) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const column = contentType === 'movie' ? 'movie_id' : contentType === 'tv_show' ? 'tv_show_id' : null;
  if (!column || !contentId) throw new Error('A valid title type and ID are required to load studio assignments.');
  const { data, error } = await supabase.from('content_studio_assignments')
    .select('studio_id').eq(column, Number(contentId));
  if (error) throw showError(error);
  return [...new Set((data || []).map((row) => row.studio_id))];
};

export const fetchContentStudios = async (contentType, contentId) => {
  const studioIds = await fetchContentStudioIds(contentType, contentId);
  if (!studioIds.length) return [];

  const { data, error } = await supabase.from(TABLE)
    .select('id, name, slug, logo_url, display_order')
    .in('id', studioIds)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw showError(error);
  return data || [];
};

export const saveContentStudioAssignments = async (contentType, contentId, studioIds) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.rpc('set_content_studio_assignments', {
    p_content_type: contentType,
    p_content_id: Number(contentId),
    p_studio_ids: [...new Set((studioIds || []).filter(Boolean))],
  });
  if (error) throw showError(error);
  invalidateCache('catalog:studio-content:');
  invalidateCache('catalog:studio-titles:');
};

export const fetchStudioContentAssignments = async (studioId) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  return cachedRequest(getStudioContentCacheKey(studioId), async () => {
    const { data, error } = await supabase.from('content_studio_assignments')
      .select('movie_id, tv_show_id').eq('studio_id', studioId);
    if (error) throw showError(error);
    return data || [];
  }, { ttl: PUBLIC_STUDIOS_TTL });
};

export const saveStudioSettings = async (featuredLimit) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.from(SETTINGS_TABLE).upsert({ id: true, featured_limit: Math.min(6, Math.max(4, Number(featuredLimit) || 6)), updated_at: new Date().toISOString() }).select('featured_limit').single();
  if (error) throw showError(error);
  invalidateCache(PUBLIC_STUDIOS_CACHE_KEY);
  return data;
};

export const deleteStudio = async (studio) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from(TABLE).delete().eq('id', studio.id);
  if (error) throw error;
  invalidateCache(PUBLIC_STUDIOS_CACHE_KEY);
  invalidateCache(getStudioContentCacheKey(studio.id));
  const paths = [studio.logo_path, studio.background_path].filter(Boolean);
  if (paths.length) { const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths); if (removeError) console.warn('Studio removed but some images remain:', removeError); }
};

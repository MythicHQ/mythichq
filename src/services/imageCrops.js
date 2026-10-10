import { supabase } from '../lib/supabase';

const SETTINGS_TABLE = 'image_crop_settings';
const ASSET_EVENT = 'mythichq:image-crop-updated';
const cropSettingsCache = new Map();
let allSettingsRequest;
let settingsLoaded = false;

export const DEFAULT_CROP_SETTINGS = Object.freeze({
  x: 50,
  y: 50,
  zoom: 1,
  aspectRatio: 'original',
});

export const getCanonicalImageKey = (source) => {
  if (typeof source !== 'string' || !source.trim()) return '';
  const value = source.trim();
  if (!/^https?:\/\//i.test(value) && !value.startsWith('/') && !value.startsWith('blob:') && !value.startsWith('data:')) {
    return `storage:POSTER:${value}`;
  }
  try {
    const url = new URL(value, window.location.origin);
    const storageMatch = url.pathname.match(/\/storage\/v1\/object\/(?:sign|public)\/([^/]+)\/(.+)$/);
    if (storageMatch) return `storage:${storageMatch[1]}:${decodeURIComponent(storageMatch[2])}`;
    url.search = '';
    url.hash = '';
    return url.origin === window.location.origin ? `${url.pathname}${url.search}` : url.toString();
  } catch {
    return value;
  }
};

export const getImageCropSettings = async (source) => {
  const key = getCanonicalImageKey(source);
  if (!key) return DEFAULT_CROP_SETTINGS;
  if (cropSettingsCache.has(key)) return cropSettingsCache.get(key);
  if (!supabase) return DEFAULT_CROP_SETTINGS;

  if (!allSettingsRequest && !settingsLoaded) {
    allSettingsRequest = supabase
      .from(SETTINGS_TABLE)
      .select('image_key, settings')
      .then(({ data, error }) => {
        if (error) throw error;
        for (const row of data || []) cropSettingsCache.set(row.image_key, row.settings);
        settingsLoaded = true;
        return data || [];
      })
      .catch((error) => {
        allSettingsRequest = null;
        console.error('Failed to load image crop settings:', error);
        throw error;
      });
  }

  if (allSettingsRequest) await allSettingsRequest;
  return cropSettingsCache.get(key) || DEFAULT_CROP_SETTINGS;
};

export const saveImageCropSettings = async (source, settings) => {
  const key = getCanonicalImageKey(source);
  if (!key) throw new Error('Choose an image before saving crop settings.');
  if (!supabase) throw new Error('Supabase is not configured. Image crop settings could not be saved.');

  const normalized = {
    x: Math.max(0, Math.min(100, Number(settings.x) || 0)),
    y: Math.max(0, Math.min(100, Number(settings.y) || 0)),
    zoom: Math.max(1, Math.min(3, Number(settings.zoom) || 1)),
    aspectRatio: String(settings.aspectRatio || 'original'),
    ...(settings.aspectRatio === 'custom' && settings.customRatio
      ? { customRatio: { width: Math.max(1, Number(settings.customRatio.width) || 1), height: Math.max(1, Number(settings.customRatio.height) || 1) } }
      : {}),
    ...(settings.aspectRatio === 'freeform' && settings.freeformRatio
      ? { freeformRatio: { width: Math.max(1, Number(settings.freeformRatio.width) || 1), height: Math.max(1, Number(settings.freeformRatio.height) || 1) } }
      : {}),
  };
  const { error } = await supabase
    .from(SETTINGS_TABLE)
    .upsert({ image_key: key, settings: normalized, updated_at: new Date().toISOString() });
  if (error) throw error;

  cropSettingsCache.set(key, normalized);
  window.dispatchEvent(new CustomEvent(ASSET_EVENT, { detail: { key, settings: normalized } }));
  return normalized;
};

export const resetImageCropSettings = async (source) => {
  const key = getCanonicalImageKey(source);
  if (!key) return;
  if (!supabase) throw new Error('Supabase is not configured. Image crop settings could not be reset.');
  const { error } = await supabase.from(SETTINGS_TABLE).delete().eq('image_key', key);
  if (error) throw error;
  cropSettingsCache.set(key, DEFAULT_CROP_SETTINGS);
  window.dispatchEvent(new CustomEvent(ASSET_EVENT, { detail: { key, settings: DEFAULT_CROP_SETTINGS } }));
};

export const copyImageCropSettings = async (source, destination) => {
  const sourceKey = getCanonicalImageKey(source);
  const destinationKey = getCanonicalImageKey(destination);
  if (!sourceKey || !destinationKey || sourceKey === destinationKey) return;
  const settings = await getImageCropSettings(source);
  if (settings !== DEFAULT_CROP_SETTINGS) await saveImageCropSettings(destination, settings);
  if (typeof source === 'string' && source.startsWith('blob:')) {
    if (!supabase) throw new Error('Supabase is not configured. Image crop settings could not be moved to the uploaded image.');
    const { error } = await supabase.from(SETTINGS_TABLE).delete().eq('image_key', sourceKey);
    if (error) throw error;
    cropSettingsCache.delete(sourceKey);
  }
};

export const subscribeToImageCropSettings = (callback) => {
  window.addEventListener(ASSET_EVENT, callback);
  return () => window.removeEventListener(ASSET_EVENT, callback);
};

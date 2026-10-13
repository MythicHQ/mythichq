import { supabase } from '../lib/supabase';

const TABLE = 'language_card_images';
const BUCKET = 'language-card-images';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const isMissingTableError = (error) => ['42P01', 'PGRST205'].includes(error?.code);

export const fetchLanguageCardImages = async ({ requireTable = false } = {}) => {
  if (!supabase) {
    if (requireTable) throw new Error('Supabase is not configured. Add the Supabase environment variables to manage language images.');
    return {};
  }
  const { data, error } = await supabase.from(TABLE).select('language_slug, image_url, storage_path, updated_at');
  if (error) {
    if (!requireTable && isMissingTableError(error)) return {};
    if (isMissingTableError(error)) throw new Error('Language image storage is not set up. Run supabase/language_card_images.sql in the Supabase SQL Editor.');
    throw error;
  }
  return Object.fromEntries((data || []).map((row) => [row.language_slug, row]));
};

const validateImage = (file) => {
  const extension = IMAGE_TYPES[file?.type];
  if (!extension) throw new Error('Choose a PNG, JPEG, or WebP image.');
  if (file.size > MAX_IMAGE_SIZE) throw new Error('Language images must be 5 MB or smaller.');
  return extension;
};

const normalizeImageUrl = (value) => {
  try {
    const parsed = new URL(String(value || '').trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
    return parsed.href;
  } catch {
    throw new Error('Enter a valid public image URL beginning with http:// or https://.');
  }
};

const removePreviousStoredImage = async (bucket, previousImage, message) => {
  if (!previousImage?.storage_path || previousImage.storage_path.startsWith('external:')) return;
  const { error } = await bucket.remove([previousImage.storage_path]);
  if (error) console.error(message, error);
};

export const saveLanguageCardImage = async ({ languageSlug, file, imageUrl, userId, previousImage }) => {
  if (!supabase) throw new Error('Supabase is not configured. Add the Supabase environment variables to manage language images.');
  if (!userId) throw new Error('Your admin session has expired. Sign in again to upload an image.');
  if (imageUrl) {
    const normalizedUrl = normalizeImageUrl(imageUrl);
    const { data, error } = await supabase.from(TABLE).upsert({
      language_slug: languageSlug,
      image_url: normalizedUrl,
      storage_path: `external:${crypto.randomUUID()}`,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'language_slug' }).select('language_slug, image_url, storage_path, updated_at').single();
    if (error) throw error;
    await removePreviousStoredImage(supabase.storage.from(BUCKET), previousImage, 'Saved language image URL, but could not remove its replaced file:');
    return data;
  }
  const extension = validateImage(file);
  const storagePath = `${userId}/${languageSlug}/${crypto.randomUUID()}.${extension}`;
  const bucket = supabase.storage.from(BUCKET);
  const { error: uploadError } = await bucket.upload(storagePath, file, { cacheControl: '3600', contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;
  const { data: publicUrl } = bucket.getPublicUrl(storagePath);
  const { data, error } = await supabase.from(TABLE).upsert({
    language_slug: languageSlug,
    image_url: publicUrl.publicUrl,
    storage_path: storagePath,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'language_slug' }).select('language_slug, image_url, storage_path, updated_at').single();
  if (error) {
    const { error: cleanupError } = await bucket.remove([storagePath]);
    if (cleanupError) console.error('Failed to clean up an unsaved language image:', cleanupError);
    throw error;
  }
  if (previousImage?.storage_path !== storagePath) await removePreviousStoredImage(bucket, previousImage, 'Saved language image, but could not remove its replaced file:');
  return data;
};

export const resetLanguageCardImage = async (languageSlug, previousImage) => {
  if (!supabase) throw new Error('Supabase is not configured. Add the Supabase environment variables to manage language images.');
  const { error } = await supabase.from(TABLE).delete().eq('language_slug', languageSlug);
  if (error) throw error;
  if (previousImage?.storage_path && !previousImage.storage_path.startsWith('external:')) {
    const { error: removeError } = await supabase.storage.from(BUCKET).remove([previousImage.storage_path]);
    if (removeError) console.error('Reset the language image, but could not remove its stored file:', removeError);
  }
};

export const subscribeToLanguageCardImages = (onChange) => {
  if (!supabase) return () => {};
  const channel = supabase.channel('language-card-images-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
};

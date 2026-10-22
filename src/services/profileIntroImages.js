import { supabase } from '../lib/supabase';

const TABLE = 'profile_intro_images';
const BUCKET = 'profile-intro-images';
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const showDatabaseSetupError = (error) => {
  if (['42P01', 'PGRST205', 'PGRST204', '42703'].includes(error?.code)) {
    return new Error('Profile Intro Images storage is not set up yet. Run supabase/profile_intro_images.sql in the Supabase SQL Editor.');
  }
  return error;
};

const cleanupUploadedFiles = async (paths) => {
  if (!paths.length || !supabase) return;
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) console.error('Could not clean up unsaved profile intro images:', error);
};

export const fetchProfileIntroImages = async () => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, desktop_image_url, desktop_storage_path, mobile_image_url, mobile_storage_path, welcoming_image_url, welcoming_storage_path, updated_at')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw showDatabaseSetupError(error);
  return data;
};

const uploadImage = async (file, userId, device) => {
  if (!file) return null;
  const extension = IMAGE_TYPES[file.type];
  if (!extension) throw new Error('Choose a PNG, JPEG, or WebP image.');
  if (file.size > MAX_IMAGE_SIZE) throw new Error('Profile intro images must be 8 MB or smaller.');

  const path = `${userId}/${device}/${crypto.randomUUID()}.${extension}`;
  const bucket = supabase.storage.from(BUCKET);
  const { error } = await bucket.upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return { path, url: bucket.getPublicUrl(path).data.publicUrl };
};

export const saveProfileIntroImages = async ({ files, imageLinks, previous, userId }) => {
  if (!supabase) throw new Error('Supabase is not configured. Add the Supabase environment variables to manage profile intro images.');
  if (!userId) throw new Error('Your admin session has expired. Sign in again to save these images.');

  const uploadedPaths = [];
  try {
    const desktop = await uploadImage(files.desktop, userId, 'desktop');
    if (desktop) uploadedPaths.push(desktop.path);
    const mobile = await uploadImage(files.mobile, userId, 'mobile');
    if (mobile) uploadedPaths.push(mobile.path);
    const welcoming = await uploadImage(files.welcoming, userId, 'welcoming');
    if (welcoming) uploadedPaths.push(welcoming.path);

    const next = {
      desktop_image_url: desktop?.url || imageLinks.desktop.trim() || null,
      desktop_storage_path: desktop?.path || (imageLinks.desktop.trim() === (previous?.desktop_image_url || '') ? previous?.desktop_storage_path : null) || null,
      mobile_image_url: mobile?.url || imageLinks.mobile.trim() || null,
      mobile_storage_path: mobile?.path || (imageLinks.mobile.trim() === (previous?.mobile_image_url || '') ? previous?.mobile_storage_path : null) || null,
      welcoming_image_url: welcoming?.url || imageLinks.welcoming.trim() || null,
      welcoming_storage_path: welcoming?.path || (imageLinks.welcoming.trim() === (previous?.welcoming_image_url || '') ? previous?.welcoming_storage_path : null) || null,
      updated_at: new Date().toISOString(),
    };

    let saved;
    if (!next.desktop_image_url && !next.mobile_image_url && !next.welcoming_image_url) {
      if (previous?.id) {
        const { error } = await supabase.from(TABLE).delete().eq('id', 1);
        if (error) throw error;
      }
      saved = null;
    } else {
      const { data, error } = await supabase
        .from(TABLE)
        .upsert({ id: 1, ...next }, { onConflict: 'id' })
      .select('id, desktop_image_url, desktop_storage_path, mobile_image_url, mobile_storage_path, welcoming_image_url, welcoming_storage_path, updated_at')
        .single();
      if (error) throw error;
      saved = data;
    }

    const replacedPaths = [
      previous?.desktop_storage_path && previous.desktop_storage_path !== saved?.desktop_storage_path ? previous.desktop_storage_path : null,
      previous?.mobile_storage_path && previous.mobile_storage_path !== saved?.mobile_storage_path ? previous.mobile_storage_path : null,
      previous?.welcoming_storage_path && previous.welcoming_storage_path !== saved?.welcoming_storage_path ? previous.welcoming_storage_path : null,
    ].filter(Boolean);
    if (replacedPaths.length) {
      const { error } = await supabase.storage.from(BUCKET).remove(replacedPaths);
      if (error) console.warn('Saved profile intro images, but could not remove replaced files:', error);
    }
    return saved;
  } catch (error) {
    await cleanupUploadedFiles(uploadedPaths);
    throw showDatabaseSetupError(error);
  }
};

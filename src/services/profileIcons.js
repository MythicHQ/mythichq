import { supabase } from '../lib/supabase';

const PROFILE_ICON_BUCKET = 'profile-icons';
const MAX_PROFILE_ICON_SIZE = 5 * 1024 * 1024;
const PROFILE_ICON_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
export const DEFAULT_PROFILE_AVATAR_URL = '/profile-image/BambooBlush.jpg';

export const getProfileAvatarUrl = (profile, user) => (
  profile?.avatar_url
  || user?.user_metadata?.avatar_url
  || DEFAULT_PROFILE_AVATAR_URL
);

const BUNDLED_PROFILE_ICONS = [
  { id: 'bundled-bamboo-blush', name: 'Bamboo Blush', image_url: '/profile-image/BambooBlush.jpg' },
  { id: 'bundled-tony', name: 'Tony', image_url: '/profile-image/Tony.jpg' },
  { id: 'bundled-kitty', name: 'Kitty', image_url: '/profile-image/Kitty.jpg' },
  { id: 'bundled-web-whisper', name: 'Web Whisper', image_url: '/profile-image/WebWhisper.jpg' },
];

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
};

export const loadProfileIcons = async ({ useBundledFallback = false } = {}) => {
  if (!supabase) {
    if (useBundledFallback) return BUNDLED_PROFILE_ICONS;
    requireSupabase();
  }

  const client = supabase;
  const { data, error } = await client
    .from('profile_icons')
    .select('id, name, image_url, storage_path, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    if (useBundledFallback && ['42P01', 'PGRST205'].includes(error.code)) {
      return BUNDLED_PROFILE_ICONS;
    }
    throw error;
  }
  return data || [];
};

export const checkProfileUsernameAvailability = async (username) => {
  const client = requireSupabase();
  const { data, error } = await client.rpc('is_profile_username_available', {
    candidate: username,
  });

  if (error) throw error;
  return data === true;
};

export const uploadProfileIcon = async (userId, file, name) => {
  const client = requireSupabase();
  const extension = PROFILE_ICON_TYPES[file?.type];

  if (!extension) {
    throw new Error('Choose a PNG, JPEG, WebP, or GIF image.');
  }
  if (file.size > MAX_PROFILE_ICON_SIZE) {
    throw new Error('Profile icons must be 5 MB or smaller.');
  }
  if (!userId) {
    throw new Error('Your admin session has expired. Sign in again to upload an icon.');
  }

  const storagePath = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await client.storage
    .from(PROFILE_ICON_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: publicUrl } = client.storage
    .from(PROFILE_ICON_BUCKET)
    .getPublicUrl(storagePath);

  const { data, error } = await client
    .from('profile_icons')
    .insert({
      name: name.trim() || 'Profile icon',
      image_url: publicUrl.publicUrl,
      storage_path: storagePath,
    })
    .select('id, name, image_url, storage_path, created_at')
    .single();

  if (error) {
    const { error: cleanupError } = await client.storage
      .from(PROFILE_ICON_BUCKET)
      .remove([storagePath]);
    if (cleanupError) {
      console.error('Failed to clean up an unlisted profile icon upload:', cleanupError);
    }
    throw error;
  }

  return data;
};

export const deleteProfileIcon = async (iconId) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from('profile_icons')
    .delete()
    .eq('id', iconId)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('This profile icon is no longer available. Refresh the list and try again.');
};

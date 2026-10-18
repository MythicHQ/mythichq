import { supabase } from '../lib/supabase';

export const MAX_VIEWER_PROFILES = 5;

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
};

const requireUserId = (userId) => {
  if (!userId) throw new Error('Sign in again to manage your viewing profiles.');
};

const normalizeName = (name) => {
  const normalizedName = name?.trim();
  if (!normalizedName) throw new Error('Enter a profile name.');
  if (normalizedName.length > 24) throw new Error('Profile names must be 24 characters or fewer.');
  return normalizedName;
};

export const loadViewerProfiles = async (userId) => {
  requireUserId(userId);
  const client = requireSupabase();
  const { data, error } = await client
    .from('viewer_profiles')
    .select('id, user_id, name, avatar_url, is_kids, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const createViewerProfile = async (userId, profile) => {
  requireUserId(userId);
  const client = requireSupabase();
  const { data, error } = await client
    .from('viewer_profiles')
    .insert({
      user_id: userId,
      name: normalizeName(profile.name),
      avatar_url: profile.avatar_url || 'avatar:ember',
      is_kids: profile.is_kids === true,
    })
    .select('id, user_id, name, avatar_url, is_kids, created_at, updated_at')
    .single();

  if (error) throw error;
  return data;
};

export const updateViewerProfile = async (userId, profileId, profile) => {
  requireUserId(userId);
  const client = requireSupabase();
  const { data, error } = await client
    .from('viewer_profiles')
    .update({
      name: normalizeName(profile.name),
      avatar_url: profile.avatar_url || 'avatar:ember',
      is_kids: profile.is_kids === true,
    })
    .eq('user_id', userId)
    .eq('id', profileId)
    .select('id, user_id, name, avatar_url, is_kids, created_at, updated_at')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('This profile is no longer available. Refresh and try again.');
  return data;
};

export const deleteViewerProfile = async (userId, profileId) => {
  requireUserId(userId);
  const client = requireSupabase();
  const { data, error } = await client
    .from('viewer_profiles')
    .delete()
    .eq('user_id', userId)
    .eq('id', profileId)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('This profile is no longer available. Refresh and try again.');
};

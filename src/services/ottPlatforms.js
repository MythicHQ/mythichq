import { supabase } from '../lib/supabase';

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
};

export const fetchOttPlatforms = async ({ includeDisabled = false } = {}) => {
  let request = requireSupabase().from('ott_platforms').select('*').order('name');
  if (!includeDisabled) request = request.eq('is_active', true);
  const { data, error } = await request;
  if (error) throw error;
  return data || [];
};

export const saveOttPlatform = async (payload, platformId = null) => {
  const client = requireSupabase();
  const request = platformId
    ? client.from('ott_platforms').update(payload).eq('id', Number(platformId))
    : client.from('ott_platforms').insert(payload);
  const { data, error } = await request.select('*').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('The OTT platform was not saved. Check your admin permissions and try again.');
  return data;
};

export const deleteOttPlatform = async (platformId) => {
  const { data, error } = await requireSupabase().from('ott_platforms')
    .delete()
    .eq('id', Number(platformId))
    .select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('The OTT platform was not deleted. Check your admin permissions and try again.');
};

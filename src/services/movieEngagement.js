import { supabase } from '../lib/supabase';

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  return supabase;
};

const requireUserId = (userId) => {
  if (!userId) throw new Error('Sign in to save your movie response.');
};

export const loadMovieEngagement = async (movieId, userId) => {
  const client = requireSupabase();
  const [signalResult, reactionResult, likeResult] = await Promise.all([
    client.rpc('get_movie_public_signals', { target_movie_id: Number(movieId) }),
    userId
      ? client.from('movie_reactions').select('reaction').eq('movie_id', Number(movieId)).eq('user_id', userId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    userId
      ? client.from('movie_likes').select('id').eq('movie_id', Number(movieId)).eq('user_id', userId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (signalResult.error) throw signalResult.error;
  if (reactionResult.error) throw reactionResult.error;
  if (likeResult.error) throw likeResult.error;

  const signals = Array.isArray(signalResult.data) ? signalResult.data[0] : signalResult.data;
  return {
    hypePercentage: Number(signals?.hype_percentage || 0),
    trendingBadge: signals?.trending_badge || '',
    reaction: reactionResult.data?.reaction || '',
    liked: Boolean(likeResult.data),
  };
};

export const saveMovieReaction = async ({ movieId, userId, reaction }) => {
  requireUserId(userId);
  const client = requireSupabase();
  if (!reaction) {
    const { error } = await client.from('movie_reactions')
      .delete().eq('movie_id', Number(movieId)).eq('user_id', userId);
    if (error) throw error;
    return '';
  }

  const { data, error } = await client.from('movie_reactions')
    .upsert({
      movie_id: Number(movieId),
      user_id: userId,
      reaction,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'movie_id,user_id' })
    .select('reaction')
    .single();

  if (error) throw error;
  return data.reaction;
};

export const setMovieLiked = async ({ movieId, userId, liked }) => {
  requireUserId(userId);
  const client = requireSupabase();
  if (!liked) {
    const { error } = await client.from('movie_likes')
      .delete().eq('movie_id', Number(movieId)).eq('user_id', userId);
    if (error) throw error;
    return false;
  }

  const { error } = await client.from('movie_likes')
    .upsert({ movie_id: Number(movieId), user_id: userId }, { onConflict: 'movie_id,user_id', ignoreDuplicates: true });
  if (error) throw error;
  return true;
};

export const recordMovieView = async ({ movieId, userId }) => {
  if (!userId || !supabase) return;
  const { error } = await supabase.from('movie_views')
    .upsert({
      movie_id: Number(movieId),
      user_id: userId,
      viewed_on: new Date().toISOString().slice(0, 10),
    }, { onConflict: 'movie_id,user_id,viewed_on', ignoreDuplicates: true });
  if (error) throw error;
};

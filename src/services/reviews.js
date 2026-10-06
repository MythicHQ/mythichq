import { supabase } from '../lib/supabase';

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
};

export const loadUserReviews = async (userId) => {
  requireSupabase();
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const createReview = async ({ userId, movieId, rating, comment }) => {
  requireSupabase();
  const { data, error } = await supabase
    .from('reviews')
    .insert({ user_id: userId, movie_id: Number(movieId), rating: Number(rating), comment: comment || '' })
    .select();
  if (error) throw error;

  const review = Array.isArray(data) ? data[0] : data;
  if (!review) {
    throw new Error('Unable to create review.');
  }

  return review;
};

export const updateReview = async (reviewId, updates) => {
  requireSupabase();
  const { data, error } = await supabase
    .from('reviews')
    .update({ rating: Number(updates.rating), comment: updates.comment || '', updated_at: new Date().toISOString() })
    .eq('id', reviewId)
    .select();
  if (error) throw error;

  const review = Array.isArray(data) ? data[0] : data;
  if (!review) {
    throw new Error('Unable to update review.');
  }

  return review;
};

export const deleteReview = async (reviewId) => {
  requireSupabase();
  const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
  if (error) throw error;
};

export const loadMovieReviews = async (movieId) => {
  requireSupabase();
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('movie_id', Number(movieId))
    .order('created_at', { ascending: false });
  if (error) throw error;

  const reviews = data || [];
  const userIds = [...new Set(reviews.map((review) => review.user_id).filter(Boolean))];
  if (userIds.length === 0) return reviews;

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);
  if (profileError) {
    console.error('Failed to load reviewer profiles:', profileError);
    return reviews;
  }

  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  return reviews.map((review) => ({ ...review, profile: profileById.get(review.user_id) || null }));
};
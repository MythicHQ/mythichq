import { supabase } from '../lib/supabase';

export const DEFAULT_USER_SETTINGS = {
  appearance: {
    theme: 'system',
    accent: 'crimson',
    language: 'en',
    layout: 'grid',
    trailerAutoplay: false,
    reducedMotion: false,
  },
  notifications: {
    reviewReplies: true,
    reviewReactions: true,
    newFollowers: true,
    recommendations: true,
    announcements: true,
  },
  privacy: {
    profilePublic: true,
    reviewsPublic: true,
  },
  movies: {
    genres: [],
    languages: [],
    categories: [],
    personalizedRecommendations: true,
  },
};

const mergeSettings = (settings) => ({
  appearance: {
    ...DEFAULT_USER_SETTINGS.appearance,
    ...settings?.appearance,
    theme: settings?.appearance?.theme === 'light' ? 'cinema' : (settings?.appearance?.theme || DEFAULT_USER_SETTINGS.appearance.theme),
  },
  notifications: { ...DEFAULT_USER_SETTINGS.notifications, ...settings?.notifications },
  privacy: { ...DEFAULT_USER_SETTINGS.privacy, ...settings?.privacy },
  movies: { ...DEFAULT_USER_SETTINGS.movies, ...settings?.movies },
});

const requireClientAndUser = (userId) => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
  if (!userId) throw new Error('Sign in again to manage your settings.');
  return supabase;
};

export const loadUserSettings = async (userId) => {
  const client = requireClientAndUser(userId);
  const { data, error } = await client
    .from('user_settings')
    .select('appearance, notifications, privacy, movies')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return mergeSettings(data);
};

export const saveUserSettings = async (userId, settings) => {
  const client = requireClientAndUser(userId);
  const values = mergeSettings(settings);
  const { data, error } = await client
    .from('user_settings')
    .upsert({
      user_id: userId,
      ...values,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('appearance, notifications, privacy, movies')
    .single();

  if (error) throw error;
  return mergeSettings(data);
};

export const applyAppearanceSettings = (appearance) => {
  const root = document.documentElement;
  const theme = appearance?.theme || 'system';
  const resolvedTheme = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : theme;

  root.dataset.theme = resolvedTheme;
  root.dataset.accent = appearance?.accent || 'crimson';
  root.dataset.reducedMotion = String(appearance?.reducedMotion === true);
  root.dataset.layout = appearance?.layout || 'grid';
};

export const USER_SETTINGS_UPDATED_EVENT = 'mythichq:user-settings-updated';

export const loadCachedAppearance = () => {
  try {
    const stored = window.localStorage.getItem('mythichq:user-settings');
    return stored ? mergeSettings(JSON.parse(stored)).appearance : DEFAULT_USER_SETTINGS.appearance;
  } catch (error) {
    console.error('Saved appearance settings could not be read:', error);
    return DEFAULT_USER_SETTINGS.appearance;
  }
};

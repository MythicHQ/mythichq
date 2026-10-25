import { supabase } from '../lib/supabase';

// One palette drives the Settings selector and the shared CSS accent tokens.
export const ACCENT_COLOR_OPTIONS = [
  { value: 'crimson', label: 'Crimson', color: '#e33b46', bright: '#ff6470', rgb: '227, 59, 70', brightRgb: '255, 100, 112', glow: 0.4, contrast: '#080a0e' },
  { value: 'violet', label: 'Violet', color: '#8b5cf6', bright: '#a78bfa', rgb: '139, 92, 246', brightRgb: '167, 139, 250', glow: 0.24, contrast: '#080a0e' },
  { value: 'teal', label: 'Teal', color: '#14b8a6', bright: '#2dd4bf', rgb: '20, 184, 166', brightRgb: '45, 212, 191', glow: 0.22, contrast: '#101318' },
  { value: 'amber', label: 'Amber', color: '#f59e0b', bright: '#fbbf24', rgb: '245, 158, 11', brightRgb: '251, 191, 36', glow: 0.22, contrast: '#111318' },
  { value: 'orange', label: 'Orange', color: '#f97316', bright: '#fb923c', rgb: '249, 115, 22', brightRgb: '251, 146, 60', glow: 0.22, contrast: '#111318' },
  { value: 'arctic-blue', label: 'Arctic Blue', color: '#38BDF8', bright: '#7DD3FC', rgb: '56, 189, 248', brightRgb: '125, 211, 252', glow: 0.22, contrast: '#101820' },
  { value: 'jade-green', label: 'Jade Green', color: '#4ADE80', bright: '#86EFAC', rgb: '74, 222, 128', brightRgb: '134, 239, 172', glow: 0.2, contrast: '#102016' },
  { value: 'hot-pink', label: 'Hot Pink', color: '#F472B6', bright: '#F9A8D4', rgb: '244, 114, 182', brightRgb: '249, 168, 212', glow: 0.22, contrast: '#23101B' },
  { value: 'pearl-white', label: 'Pearl White', color: '#E5E7EB', bright: '#F3F4F6', rgb: '229, 231, 235', brightRgb: '243, 244, 246', glow: 0.18, contrast: '#16181D' },
  { value: 'copper', label: 'Copper', color: '#C08457', bright: '#D6A074', rgb: '192, 132, 87', brightRgb: '214, 160, 116', glow: 0.22, contrast: '#17110D' },
  { value: 'laser-lime', label: 'Laser Lime', color: '#A3E635', bright: '#BEF264', rgb: '163, 230, 53', brightRgb: '190, 242, 100', glow: 0.2, contrast: '#18210D' },
  { value: 'periwinkle', label: 'Periwinkle', color: '#818CF8', bright: '#A5B4FC', rgb: '129, 140, 248', brightRgb: '165, 180, 252', glow: 0.22, contrast: '#111327' },
  { value: 'coral', label: 'Coral', color: '#FB7185', bright: '#FDA4AF', rgb: '251, 113, 133', brightRgb: '253, 164, 175', glow: 0.22, contrast: '#241014' },
];

const ACCENT_COLOR_BY_VALUE = new Map(ACCENT_COLOR_OPTIONS.map((accent) => [accent.value, accent]));

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
    accent: ACCENT_COLOR_BY_VALUE.has(settings?.appearance?.accent)
      ? settings.appearance.accent
      : DEFAULT_USER_SETTINGS.appearance.accent,
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
  const accent = ACCENT_COLOR_BY_VALUE.get(appearance?.accent) || ACCENT_COLOR_BY_VALUE.get('crimson');
  root.dataset.accent = accent.value;
  root.style.setProperty('--accent-crimson', accent.color);
  root.style.setProperty('--accent-crimson-bright', accent.bright);
  root.style.setProperty('--accent-crimson-rgb', accent.rgb);
  root.style.setProperty('--accent-crimson-bright-rgb', accent.brightRgb);
  root.style.setProperty('--accent-crimson-glow', `rgba(${accent.rgb}, ${accent.glow})`);
  root.style.setProperty('--accent-on-color', accent.contrast);
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

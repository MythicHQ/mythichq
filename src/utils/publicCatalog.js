export const REMOVED_PUBLIC_TITLES = new Set(['rakkayie']);

export const isRemovedPublicTitle = (title) => REMOVED_PUBLIC_TITLES.has(
  String(title || '').trim().toLowerCase(),
);

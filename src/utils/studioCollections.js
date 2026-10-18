export const MARVEL_FRANCHISES = [
  { slug: 'avengers', name: 'Avengers' },
  { slug: 'spider-man', name: 'Spider-Man' },
  { slug: 'iron-man', name: 'Iron Man' },
  { slug: 'x-men', name: 'X-Men' },
  { slug: 'guardians-of-the-galaxy', name: 'Guardians of the Galaxy' },
  { slug: 'thor', name: 'Thor' },
];

const normalizeText = (value) => String(value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const readValues = (value) => {
  if (Array.isArray(value)) return value.flatMap(readValues);
  if (value == null || value === '') return [];
  if (typeof value === 'object') {
    const name = value.slug || value.name || value.title || value.franchise;
    return name ? [String(name)] : [];
  }
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
};

const getFranchiseAssignment = (movie, franchise) => {
  const assigned = [
    ...readValues(movie.franchises),
    ...readValues(movie.franchise),
    ...readValues(movie.franchise_name),
    ...readValues(movie.franchise_title),
    ...readValues(movie.franchise_tags),
    ...readValues(movie.series),
    ...readValues(movie.series_name),
    ...readValues(movie.saga),
    ...readValues(movie.collections),
    ...readValues(movie.collection_name),
    ...readValues(movie.belongs_to_collection),
  ].map((value) => normalizeText(value)
    .replace(/^(?:the )/, '')
    .replace(/ (?:collection|franchise|series)$/, ''));
  return assigned.includes(normalizeText(franchise.slug))
    || assigned.includes(normalizeText(franchise.name).replace(/^(?:the )/, ''));
};

const matchesKnownTitle = (movie, franchise) => {
  const title = normalizeText(movie.title);
  switch (franchise.slug) {
    case 'avengers':
      return /^(?:the )?avengers(?: |$)/.test(title);
    case 'spider-man':
      if (/spider verse/.test(title)) return false;
      return /^(?:spider man|the amazing spider man|amazing spider man)(?: |$)/.test(title);
    case 'iron-man':
      return /^iron man(?: |$)/.test(title);
    case 'x-men':
      return /^(?:x men|xmen|the x men|the xmen)(?: |$)/.test(title);
    case 'guardians-of-the-galaxy':
      return /^guardians of the galaxy(?: |$)/.test(title);
    case 'thor':
      return /^thor(?: |$)/.test(title);
    default:
      return false;
  }
};

export const getMarvelFranchise = (slug) => MARVEL_FRANCHISES.find((item) => item.slug === slug) || null;

const normalizeImageReference = (value) => {
  const reference = String(value || '').trim();
  if (!reference) return '';
  try {
    const url = new URL(reference, 'https://mythichq.invalid');
    return `${url.origin}${url.pathname}`.toLowerCase();
  } catch {
    return reference.split(/[?#]/, 1)[0].toLowerCase();
  }
};

export const hasMovieBackdrop = (movie) => {
  const backdrop = String(movie?.backdrop_path || movie?.backdrop_url || '').trim();
  const poster = movie?.poster_path || movie?.poster_url || movie?.poster;
  return Boolean(backdrop)
    && !/\/movie-assets\/backdrops\/default-backdrop\.(?:jpe?g|png|webp)(?:[?#].*)?$/i.test(backdrop)
    && normalizeImageReference(backdrop) !== normalizeImageReference(poster);
};

export const getMarvelFranchiseMovies = (titles, franchiseSlug) => {
  const franchise = getMarvelFranchise(franchiseSlug);
  if (!franchise) return [];

  const unique = new Map();
  (titles || []).forEach((movie) => {
    if (
      !movie
      || movie.is_published !== true
      || movie.is_deleted === true
      || movie.is_available === false
      || movie.available === false
      || movie.deleted_at
      || ['deleted', 'unavailable', 'draft', 'unpublished'].includes(String(movie.status || '').toLowerCase())
    ) return;
    if ((movie.record_type || movie.content_type || movie.media_type || 'movie') !== 'movie') return;
    if (!getFranchiseAssignment(movie, franchise) && !matchesKnownTitle(movie, franchise)) return;

    const key = String(movie.id ?? '');
    if (key && !unique.has(key)) unique.set(key, movie);
  });
  return [...unique.values()];
};

export const getMarvelFranchiseBackdropMovie = (titles, franchiseSlug, preferredMovieId = '') => {
  const moviesWithBackdrop = getMarvelFranchiseMovies(titles, franchiseSlug)
    .filter(hasMovieBackdrop);
  const preferredId = String(preferredMovieId || '');
  const preferred = moviesWithBackdrop.find((movie) => String(movie.id) === preferredId);
  if (preferred) return preferred;

  return moviesWithBackdrop.sort((first, second) => (
    Number(second.vote_average || second.rating || 0) - Number(first.vote_average || first.rating || 0)
      || Number(second.vote_count || 0) - Number(first.vote_count || 0)
  ))[0] || null;
};

export const getMarvelFranchiseSections = (titles) => MARVEL_FRANCHISES
  .map((franchise) => ({
    ...franchise,
    movies: getMarvelFranchiseMovies(titles, franchise.slug),
  }))
  .filter((franchise) => franchise.movies.length > 0);

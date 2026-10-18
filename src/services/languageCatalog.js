export const getMovieLanguages = (movie) => {
  const values = Array.isArray(movie?.languages)
    ? movie.languages
    : typeof movie?.language === 'string'
      ? movie.language.split(',')
      : [];

  return values.map((language) => String(language).trim()).filter(Boolean);
};

export const toLanguageSlug = (name) => String(name || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

export const getLanguagesFromMovies = (movies = [], query = '') => {
  const counts = new Map();
  movies.forEach((movie) => {
    getMovieLanguages(movie).forEach((language) => {
      const key = language.toLowerCase();
      const current = counts.get(key) || { name: language, count: 0, poster: movie.poster_path };
      counts.set(key, { ...current, count: current.count + 1, poster: current.poster || movie.poster_path });
    });
  });

  const normalizedQuery = query.trim().toLowerCase();
  return [...counts.values()]
    .filter((language) => language.name.toLowerCase().includes(normalizedQuery))
    .map((language) => ({ ...language, slug: toLanguageSlug(language.name) }))
    .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name));
};

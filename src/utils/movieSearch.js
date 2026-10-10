const STOP_WORDS = new Set(['a', 'an', 'the', 'of', 'and', 'in', 'to']);

export const normalizeSearchText = (value = '') => value
  .toString()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const compactSearchText = (value = '') => normalizeSearchText(value).replace(/\s/g, '');

const levenshteinDistance = (first, second) => {
  if (first === second) return 0;
  if (!first.length) return second.length;
  if (!second.length) return first.length;

  let previous = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (let row = 1; row <= first.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= second.length; column += 1) {
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + (first[row - 1] === second[column - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[second.length];
};

const fuzzySimilarity = (query, candidate) => {
  if (!query || !candidate) return 0;
  const distance = levenshteinDistance(query, candidate);
  return 1 - distance / Math.max(query.length, candidate.length);
};

const getTitleWords = (movie) => normalizeSearchText(movie.title || movie.name).split(' ').filter(Boolean);

export const scoreMovieMatch = (movie, rawQuery) => {
  const query = normalizeSearchText(rawQuery);
  if (query.length < 2 || !movie?.title && !movie?.name) return 0;

  const title = normalizeSearchText(movie.title || movie.name);
  const compactTitle = title.replace(/\s/g, '');
  const compactQuery = query.replace(/\s/g, '');
  const words = getTitleWords(movie);
  const queryWords = query.split(' ').filter((word) => word && !STOP_WORDS.has(word));
  let score = 0;

  if (title === query || compactTitle === compactQuery) score += 1000;
  else if (title.startsWith(query) || compactTitle.startsWith(compactQuery)) score += 760;
  else if (queryWords.length > 0 && queryWords.every((queryWord) => words.some((word) => word.startsWith(queryWord)))) score += 560;
  else if (title.includes(query) || compactTitle.includes(compactQuery)) score += 400;

  const wordScores = queryWords.map((queryWord) => Math.max(...words.map((word) => fuzzySimilarity(queryWord, word)), 0));
  const fuzzyTitle = fuzzySimilarity(compactQuery, compactTitle);
  if (wordScores.length && wordScores.every((value) => value >= 0.72)) score += 300 * (wordScores.reduce((sum, value) => sum + value, 0) / wordScores.length);
  if (fuzzyTitle >= 0.72) score += 260 * fuzzyTitle;

  const metadata = normalizeSearchText(`${movie.overview || ''} ${movie.tagline || ''} ${movie.original_title || ''}`);
  if (metadata.includes(query)) score += 70;
  if (score === 0) return 0;
  return score + Math.min((movie.vote_average || 0) * 0.01, 0.1);
};

export const rankMovies = (movies = [], rawQuery) => {
  const query = normalizeSearchText(rawQuery);
  if (query.length < 2) return [];

  const unique = new Map();
  movies.forEach((movie) => {
    if (!movie || (movie.media_type && movie.media_type !== 'movie')) return;
    const key = movie.id || compactSearchText(movie.title || movie.name);
    if (!unique.has(key)) unique.set(key, movie);
  });

  return [...unique.values()]
    .map((movie) => ({ movie, score: scoreMovieMatch(movie, query) }))
    .filter(({ score }) => score > 0)
    .sort((first, second) => second.score - first.score)
    .map(({ movie }) => movie);
};

export const getMovieSuggestions = (movies = [], rawQuery, limit = 6) => rankMovies(movies, rawQuery).slice(0, limit);

const TITLE_STOP_WORDS = new Set(['a', 'an', 'and', 'in', 'of', 'the', 'to']);
const FRANCHISE_FIELDS = [
  'franchise',
  'franchise_name',
  'franchise_title',
  'cinematic_universe',
  'universe',
  'series',
  'saga',
  'belongs_to_collection',
  'collection',
  'collection_name',
];

const normalizeText = (value) => String(value || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const toValues = (value) => {
  if (Array.isArray(value)) return value.flatMap(toValues);
  if (value == null || value === '') return [];
  if (typeof value === 'object') {
    const name = value.name
      || value.title
      || value.full_name
      || value.person_name
      || value.actor_name
      || value.english_name
      || value.original_name
      || value.studio_name;
    return name ? [String(name)] : [];
  }
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
};

const getContentType = (record) => {
  const type = record?.record_type || record?.content_type || record?.media_type || 'movie';
  return type === 'tv' ? 'tv_show' : type;
};

const getTitleTokens = (record) => normalizeText(record?.title || record?.name)
  .split(' ')
  .filter((word) => word.length > 2 && !TITLE_STOP_WORDS.has(word));

const getFranchiseValues = (record) => FRANCHISE_FIELDS
  .flatMap((field) => toValues(record?.[field]))
  .map(normalizeText)
  .filter(Boolean);

const getGenreValues = (record) => [
  ...toValues(record?.genres),
  ...toValues(record?.genre),
].map(normalizeText).filter(Boolean);

const getLanguageValues = (record) => [
  ...toValues(record?.languages),
  ...toValues(record?.spoken_languages),
  ...toValues(record?.language),
].map(normalizeText).filter(Boolean);

const getStudioValues = (record) => [
  ...toValues(record?.studios),
  ...toValues(record?.studio),
  ...toValues(record?.production_companies),
  ...toValues(record?.production_company),
].map(normalizeText).filter(Boolean);

const getPeopleValues = (record) => [
  ...toValues(record?.cast),
  ...toValues(record?.centralCast),
  ...toValues(record?.cast_crew),
  ...toValues(record?.credits?.cast),
  ...toValues(record?.credits?.crew),
  ...toValues(record?.crew),
  ...toValues(record?.director),
].map(normalizeText).filter(Boolean);

const countShared = (first, second) => {
  const secondValues = new Set(second);
  return new Set(first.filter((value) => secondValues.has(value))).size;
};

const titleSimilarityScore = (first, second) => {
  const firstTitle = normalizeText(first?.title || first?.name);
  const secondTitle = normalizeText(second?.title || second?.name);
  if (!firstTitle || !secondTitle) return 0;
  if (firstTitle === secondTitle) return 100;
  if (
    (firstTitle.length >= 4 && secondTitle.includes(firstTitle))
    || (secondTitle.length >= 4 && firstTitle.includes(secondTitle))
  ) return 75;

  const firstTokens = getTitleTokens(first);
  const secondTokens = getTitleTokens(second);
  const sharedCount = countShared(firstTokens, secondTokens);
  if (!sharedCount) return 0;

  return Math.min(70, 55 + (sharedCount - 1) * 12);
};

const hasSharedValue = (first, second) => first.some((value) => second.includes(value));

const isAvailablePublicRecord = (record) => record
  && record.is_published === true
  && record.is_deleted !== true
  && record.is_available !== false
  && record.available !== false
  && !record.deleted_at
  && !['deleted', 'unavailable', 'draft', 'unpublished'].includes(String(record.status || '').toLowerCase());

export const rankSimilarTitles = (source, catalog, { contentType } = {}) => {
  if (!source || !Array.isArray(catalog)) return [];

  const sourceType = getContentType(source);
  const sourceId = String(source.id ?? '');
  const sourceGenres = getGenreValues(source);
  const sourceGenreIds = toValues(source.genre_ids).map(String);
  const sourceFranchises = getFranchiseValues(source);
  const sourcePeople = getPeopleValues(source);
  const sourceStudios = getStudioValues(source);
  const sourceLanguages = getLanguageValues(source);
  const uniqueCandidates = new Map();

  catalog.forEach((candidate) => {
    if (!isAvailablePublicRecord(candidate)) return;
    const candidateType = getContentType(candidate);
    const candidateId = String(candidate.id ?? '');
    if (!candidateId || (candidateType === sourceType && candidateId === sourceId)) return;
    if (contentType && candidateType !== contentType) return;

    const key = `${candidateType}|${candidateId}`;
    if (!uniqueCandidates.has(key)) uniqueCandidates.set(key, candidate);
  });

  return [...uniqueCandidates.values()]
    .map((candidate) => {
      const candidateGenres = getGenreValues(candidate);
      const candidateGenreIds = toValues(candidate.genre_ids).map(String);
      const candidateFranchises = getFranchiseValues(candidate);
      const candidatePeople = getPeopleValues(candidate);
      const candidateStudios = getStudioValues(candidate);
      const candidateLanguages = getLanguageValues(candidate);

      const titleScore = titleSimilarityScore(source, candidate);
      const sameFranchise = hasSharedValue(sourceFranchises, candidateFranchises);
      const sharedGenres = Math.max(
        countShared(sourceGenres, candidateGenres),
        countShared(sourceGenreIds, candidateGenreIds),
      );
      const sharedPeople = countShared(sourcePeople, candidatePeople);
      const coreScore = titleScore
        + (sameFranchise ? 50 : 0)
        + Math.min(sharedGenres, 3) * 8
        + Math.min(sharedPeople, 3) * 6;

      if (coreScore === 0) return null;

      return {
        candidate,
        score: coreScore
          + (hasSharedValue(sourceStudios, candidateStudios) ? 5 : 0)
          + (hasSharedValue(sourceLanguages, candidateLanguages) ? 2 : 0),
      };
    })
    .filter(Boolean)
    .sort((first, second) => second.score - first.score
      || Number(second.candidate.vote_average || second.candidate.rating || 0)
        - Number(first.candidate.vote_average || first.candidate.rating || 0))
    .map(({ candidate }) => candidate);
};

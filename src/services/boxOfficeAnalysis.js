export const BOX_OFFICE_VERDICTS = [
  'Disaster',
  'Flop',
  'Below Average',
  'Average',
  'Above Average',
  'Hit',
  'Super Hit',
  'Blockbuster',
  'All-Time Blockbuster',
];

export const BOX_OFFICE_CURRENCIES = [
  'USD', 'INR', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CNY', 'KRW',
  'AED', 'BRL', 'CHF', 'HKD', 'IDR', 'MXN', 'NZD', 'SAR', 'SGD', 'ZAR',
];

const VERDICT_MINIMUM_RATIOS = [
  { verdict: 'Flop', minimum: 0.5 },
  { verdict: 'Below Average', minimum: 0.8 },
  { verdict: 'Average', minimum: 1 },
  { verdict: 'Above Average', minimum: 1.2 },
  { verdict: 'Hit', minimum: 1.5 },
  { verdict: 'Super Hit', minimum: 2 },
  { verdict: 'Blockbuster', minimum: 3 },
  { verdict: 'All-Time Blockbuster', minimum: 5 },
];

const getAmount = (value) => {
  if (value === '' || value == null) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
};

export const analyzeBoxOffice = (movie = {}) => {
  const configuredCurrency = String(movie.budget_currency || '').trim().toUpperCase();
  const currency = /^[A-Z]{3}$/.test(configuredCurrency) ? configuredCurrency : 'USD';
  const budget = getAmount(movie.budget);
  const worldwideCollection = getAmount(movie.worldwide_collection ?? movie.box_office);
  const ratio = budget > 0 && worldwideCollection !== null ? worldwideCollection / budget : null;

  let verdict = '';
  if (ratio !== null) {
    verdict = 'Disaster';
    for (const tier of VERDICT_MINIMUM_RATIOS) {
      if (ratio < tier.minimum) break;
      verdict = tier.verdict;
    }
  }

  return {
    currency,
    budget,
    worldwideCollection,
    ratio,
    verdict,
    verdictKind: ratio === null ? 'insufficient' : 'calculated',
    verdictNote: ratio === null
      ? 'Enter a production budget and worldwide box office collection to calculate a verdict.'
      : 'Estimated using worldwide box office collection divided by production budget.',
  };
};

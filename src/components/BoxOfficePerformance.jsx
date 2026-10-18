import { useMemo } from 'react';
import { analyzeBoxOffice } from '../services/boxOfficeAnalysis';

const formatMoney = (amount, currency) => {
  if (amount == null || !Number.isFinite(Number(amount))) return 'Not reported';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Number(amount).toLocaleString()} ${currency}`;
  }
};

const getVerdictTone = (verdict) => {
  if (/disaster|flop|below average/i.test(verdict)) return 'is-negative';
  if (/blockbuster|hit/i.test(verdict)) return 'is-positive';
  return 'is-neutral';
};

const BoxOfficePerformance = ({ movie }) => {
  const analysis = useMemo(() => analyzeBoxOffice(movie), [movie]);

  return (
    <section className="movie-detail-section box-office-performance" aria-labelledby="box-office-performance-heading">
      <div className="section-header box-office-performance-heading">
        <div><p className="box-office-eyebrow">Financial analysis</p><h2 id="box-office-performance-heading">Box Office Performance</h2></div>
        {analysis.verdict && (
          <span className={`box-office-verdict ${getVerdictTone(analysis.verdict)}`} data-kind={analysis.verdictKind}>
            {analysis.verdict}
          </span>
        )}
      </div>

      <p className="box-office-verdict-note">{analysis.verdictNote}</p>

      <dl className="box-office-metrics">
        <div><dt>Production budget</dt><dd>{formatMoney(analysis.budget, analysis.currency)}</dd></div>
        <div><dt>Worldwide collection</dt><dd>{formatMoney(analysis.worldwideCollection, analysis.currency)}</dd></div>
      </dl>
    </section>
  );
};

export default BoxOfficePerformance;

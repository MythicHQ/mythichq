import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeBoxOffice } from './boxOfficeAnalysis.js';

const ratioResult = (ratio) => analyzeBoxOffice({
  budget: 100,
  worldwide_collection: ratio * 100,
  budget_currency: 'INR',
});

test('classifies every collection-to-budget ratio band', () => {
  const cases = [
    [0, 'Disaster'],
    [0.499, 'Disaster'],
    [0.5, 'Flop'],
    [0.8, 'Below Average'],
    [1, 'Average'],
    [1.2, 'Above Average'],
    [1.5, 'Hit'],
    [2, 'Super Hit'],
    [3, 'Blockbuster'],
    [5, 'All-Time Blockbuster'],
    [12, 'All-Time Blockbuster'],
  ];

  for (const [ratio, expectedVerdict] of cases) {
    const analysis = ratioResult(ratio);
    assert.equal(analysis.verdict, expectedVerdict, `ratio ${ratio}×`);
    assert.equal(analysis.ratio, ratio);
  }
});

test('uses only budget and worldwide collection to calculate the verdict', () => {
  const analysis = analyzeBoxOffice({
    budget: 100,
    worldwide_collection: 200,
    budget_currency: 'INR',
    box_office_status: 'upcoming',
    financial_data_conflict: true,
    industry_verdict_override: 'Flop',
    industry_verdict_reason: 'An old override',
    marketing_cost: 1000,
    distributor_share_revenue: 0,
  });

  assert.equal(analysis.verdict, 'Super Hit');
  assert.equal(analysis.verdictKind, 'calculated');
  assert.equal(analysis.currency, 'INR');
});

test('supports the legacy box_office amount when worldwide collection is absent', () => {
  const analysis = analyzeBoxOffice({ budget: 100, box_office: 110 });
  assert.equal(analysis.worldwideCollection, 110);
  assert.equal(analysis.verdict, 'Average');
});

test('does not classify when either required financial amount is missing or invalid', () => {
  for (const movie of [
    { worldwide_collection: 500 },
    { budget: 100 },
    { budget: 0, worldwide_collection: 100 },
    { budget: -5, worldwide_collection: 100 },
  ]) {
    const analysis = analyzeBoxOffice(movie);
    assert.equal(analysis.verdict, '');
    assert.equal(analysis.verdictKind, 'insufficient');
  }
});

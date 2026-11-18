import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCampusSnapshot, decodeRawCampusExport, estimateFromCdfBins } from './iraCampusApi';

describe('iraCampusApi', () => {
  const sampleRaw = {
    updatedAt: '2026.1',
    courses: ['Engenharia de Software', 'Ciência da Computação'],
    students: [
      [0, 20241, 0, 9.5],
      [0, 20241, 0, 9.1],
      [0, 20241, 0, 8.7],
      [0, 20251, 0, 8.3],
      [0, 20251, 0, 7.8],
      [0, 20231, 1, 8.9],
      [1, 20241, 0, 8.4],
    ],
  };

  it('builds aggregate snapshot without exposing raw student array', () => {
    const dataset = decodeRawCampusExport(sampleRaw);
    const snap = buildCampusSnapshot(dataset, {
      ira: 9.0,
      referenceIra: 9.0,
      ghostIra: 9.2,
      predictedIra: null,
      course: 'Engenharia de Software',
      myCourse: 'Engenharia de Software',
      group: 'ativos',
      rankingFilter: { scope: 'curso', cohort: 'ativos', fromIngresso: '2023.1', toIngresso: '2026.1' },
      podiumSize: 5,
      usePredictedRanking: true,
      ingresso: '2024.1',
      inferredIngresso: '2024.1',
      claimed: null,
      hasPdf: false,
    });

    assert.equal(snap.available, true);
    assert.equal(snap.distribution.totalCount, 5);
    assert.equal(snap.distribution.rank, 3);
    assert.equal(snap.distribution.brownRank, 2);
    assert.ok(snap.ranking.primary !== null);
    assert.equal(snap.ranking.primary!.you.position, 3);

    const est = estimateFromCdfBins(snap.distribution.cdfBins, snap.distribution.totalCount, 9.2);
    assert.equal(est.rank, 2);
  });
});

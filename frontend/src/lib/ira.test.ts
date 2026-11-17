import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { IraEntry } from '@/data/types';
import {
  computeDisciplineImpacts,
  computeEvolution,
  computeIra,
  computeSemesterImpacts,
  gradeSituacaoError,
  MIN_PASSING_GRADE,
  requiresGrade,
  situacaoFromGrade,
} from './ira';

function entry(patch: Partial<IraEntry>): IraEntry {
  return { id: 'x', disciplineName: 'X', grade: 0, workload: 64, situacao: 'aprovado', source: 'manual', ...patch };
}

// 0, 0.1, ..., 10 — every grade the step={0.1} input can produce.
const ALL_GRADES = Array.from({ length: 101 }, (_, i) => i / 10);

describe('situacaoFromGrade', () => {
  it('maps a missing grade to em andamento', () => {
    assert.equal(situacaoFromGrade(''), 'em_andamento');
  });

  it('fails every grade below the cutoff', () => {
    for (const grade of [0, 2, 3.9, 4, 4.5, 4.99]) assert.equal(situacaoFromGrade(grade), 'reprovado', `grade ${grade}`);
  });

  it('passes the cutoff itself and everything above it', () => {
    for (const grade of [MIN_PASSING_GRADE, 5.1, 7, 10]) assert.equal(situacaoFromGrade(grade), 'aprovado', `grade ${grade}`);
  });

  it('only ever derives combinations the forms accept', () => {
    for (const grade of ['' as const, ...ALL_GRADES]) {
      assert.equal(gradeSituacaoError(grade, situacaoFromGrade(grade)), null, `grade ${grade}`);
    }
  });
});

describe('requiresGrade', () => {
  it('is false only for trancado and em andamento', () => {
    assert.equal(requiresGrade('trancado'), false);
    assert.equal(requiresGrade('em_andamento'), false);
    assert.equal(requiresGrade('aprovado'), true);
    assert.equal(requiresGrade('reprovado'), true);
    assert.equal(requiresGrade('outro'), true);
    assert.equal(requiresGrade(undefined), true);
  });
});

describe('gradeSituacaoError', () => {
  it('never lets a grade below the cutoff be saved as anything but reprovado', () => {
    for (const grade of ALL_GRADES.filter((g) => g < MIN_PASSING_GRADE)) {
      assert.notEqual(gradeSituacaoError(grade, 'aprovado'), null, `aprovado ${grade}`);
      assert.notEqual(gradeSituacaoError(grade, 'outro'), null, `outro ${grade}`);
      assert.equal(gradeSituacaoError(grade, 'reprovado'), null, `reprovado ${grade}`);
    }
  });

  it('accepts reprovado with a passing grade (e.g. reprovado por falta)', () => {
    assert.equal(gradeSituacaoError(8, 'reprovado'), null);
  });

  it('requires a grade for aprovado and reprovado', () => {
    assert.notEqual(gradeSituacaoError('', 'aprovado'), null);
    assert.notEqual(gradeSituacaoError('', 'reprovado'), null);
  });

  it('rejects grades outside 0–10', () => {
    assert.notEqual(gradeSituacaoError(-0.5, 'reprovado'), null);
    assert.notEqual(gradeSituacaoError(10.5, 'aprovado'), null);
    assert.notEqual(gradeSituacaoError(Number.NaN, 'aprovado'), null);
  });

  it('accepts trancado and em andamento without a grade', () => {
    assert.equal(gradeSituacaoError('', 'trancado'), null);
    assert.equal(gradeSituacaoError('', 'em_andamento'), null);
  });
});

describe('computeIra', () => {
  it('matches a hand-computed transcript with recency weights and a trancado penalty', () => {
    const ira = computeIra([
      entry({ semester: '2023.1', grade: 8, workload: 64 }), // weight 1
      entry({ semester: '2023.2', grade: 6, workload: 32 }), // weight 2
      entry({ semester: '2023.2', grade: 3, workload: 64, situacao: 'reprovado' }), // weight 2
      entry({ semester: '2023.2', workload: 64, situacao: 'trancado' }),
      entry({ semester: '2023.2', workload: 96, situacao: 'em_andamento' }),
    ]);
    // average = (1·64·8 + 2·32·6 + 2·64·3) / (64 + 64 + 128) = 1280 / 256 = 5
    // penalty = 1 − 0.5·64 / (160 + 64) = 6/7
    assert.equal(ira, 4.2857);
  });

  it('ignores the grade stored for trancado / em andamento entries', () => {
    const base = [entry({ semester: '2024.1', grade: 9 })];
    const withPlaceholder = computeIra([
      ...base,
      entry({ semester: '2024.1', grade: 0, situacao: 'trancado' }),
      entry({ semester: '2024.1', grade: 0, situacao: 'em_andamento' }),
    ]);
    const withLegacyGrade = computeIra([
      ...base,
      entry({ semester: '2024.1', grade: 7.5, situacao: 'trancado' }),
      entry({ semester: '2024.1', grade: 2, situacao: 'em_andamento' }),
    ]);
    assert.equal(withPlaceholder, withLegacyGrade);
  });

  it('weighs aprovado and reprovado the same, so re-deriving the situação never moves the IRA', () => {
    const entries = [entry({ semester: '2024.1', grade: 9 }), entry({ semester: '2024.2', grade: 3 })];
    const relabeled = entries.map((e) => ({ ...e, situacao: situacaoFromGrade(e.grade) }));
    assert.equal(computeIra(entries), computeIra(relabeled));
  });
});

describe('computeEvolution / impacts', () => {
  const transcript = [
    entry({ id: 'a', semester: '2024.1', grade: 8, workload: 64 }),
    entry({ id: 'b', semester: '2024.2', grade: 10, workload: 64 }),
    entry({ id: 'c', semester: '2024.2', grade: 4, workload: 64, situacao: 'reprovado' }),
  ];

  it('tracks cumulative IRA and semester averages chronologically', () => {
    const evo = computeEvolution(transcript);
    assert.equal(evo.length, 2);
    assert.equal(evo[0].semester, '2024.1');
    assert.equal(evo[0].cumulativeIra, 8);
    assert.equal(evo[1].semester, '2024.2');
    assert.equal(evo[1].semesterAverage, 7);
    assert.equal(evo[1].cumulativeIra, 7.2);
  });

  it('computes positive and negative marginal discipline impacts', () => {
    const impacts = computeDisciplineImpacts(transcript);
    const byId = Object.fromEntries(impacts.map((i) => [i.id, i.delta]));
    assert.ok(byId.b > 0);
    assert.ok(byId.c < 0);
    assert.equal(computeSemesterImpacts(transcript).length, 2);
  });
});

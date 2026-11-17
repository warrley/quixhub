import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildRanking,
  excludeClaimedStudent,
  filterForRanking,
  findStudentMatches,
  graduationForecast,
  histogram,
  iraByStage,
  iraGeral,
  kde,
  percentileBelow,
  rankingFilterBlocker,
  semesterIndex,
  semestersAttended,
  summarize,
  type CampusStudent,
} from './iraCampus';

function student(patch: Partial<CampusStudent>): CampusStudent {
  return { course: 'Engenharia de Software', ingresso: '2023.1', status: 'ativo', ira: 7, ...patch };
}

describe('semesters', () => {
  it('orders semesters and counts both ends', () => {
    assert.ok(semesterIndex('2023.2')! > semesterIndex('2023.1')!);
    assert.equal(semesterIndex('2023'), null);
    assert.equal(semestersAttended('2026.1', '2026.1'), 1);
    assert.equal(semestersAttended('2023.1', '2026.1'), 7);
    assert.equal(semestersAttended('2026.2', '2026.1'), null);
  });
});

describe('summarize / percentileBelow / iraGeral', () => {
  it('computes the usual stats with a sample std', () => {
    const s = summarize([2, 4, 4, 4, 5, 5, 7, 9])!;
    assert.equal(s.mean, 5);
    assert.equal(s.median, 4.5);
    assert.ok(Math.abs(s.std - 2.138) < 1e-3);
  });

  it('counts only strictly lower values as surpassed', () => {
    assert.equal(percentileBelow([5, 6, 7, 8], 7), 50);
    assert.equal(percentileBelow([], 7), 0);
  });

  it('maps the mean to 6 and one std to 2 points', () => {
    assert.equal(iraGeral(7, 7, 1.5), 6);
    assert.equal(iraGeral(8.5, 7, 1.5), 8);
  });
});

describe('histogram / kde', () => {
  it('keeps exact bin edges in their own bin and a 10 in the last one', () => {
    const bins = histogram([8.3, 8.39, 10, 0], 0.1);
    assert.equal(bins.length, 100);
    assert.equal(bins[83].count, 2);
    assert.equal(bins[99].count, 1);
    assert.equal(bins[0].count, 1);
  });

  it('integrates to ~1', () => {
    const xs = Array.from({ length: 1001 }, (_, i) => i / 100);
    const ys = kde([6, 7, 7.5, 8, 8.2, 9], xs);
    const area = ys.reduce((s, y) => s + y * 0.01, 0);
    assert.ok(Math.abs(area - 1) < 0.02, `area ${area}`);
  });
});

describe('filterForRanking', () => {
  const pool = [
    student({ ira: 9, ingresso: '2022.1' }),
    student({ ira: 8, ingresso: '2023.1' }),
    student({ ira: 7.5, ingresso: '2024.1' }),
    student({ ira: 9.5, status: 'formado', ingresso: '2015.1' }),
    student({ ira: 6, course: 'Design Digital', ingresso: '2023.1' }),
  ];
  const me = { course: 'Engenharia de Software', ingresso: '2023.1' };

  it('ativos excludes formados; campus includes other courses', () => {
    assert.deepEqual(filterForRanking(pool, { scope: 'campus', cohort: 'ativos' }, me).map((s) => s.ira), [9, 8, 7.5, 6]);
    assert.deepEqual(filterForRanking(pool, { scope: 'curso', cohort: 'ativos' }, me).map((s) => s.ira), [9, 8, 7.5]);
  });

  it('turma = same ingresso; turmaAoFim = same ingresso or further along', () => {
    assert.deepEqual(filterForRanking(pool, { scope: 'curso', cohort: 'turma' }, me).map((s) => s.ira), [8]);
    assert.deepEqual(filterForRanking(pool, { scope: 'curso', cohort: 'turmaAoFim' }, me).map((s) => s.ira), [9, 8]);
  });

  it('periodo filters ativos inside an inclusive ingresso range', () => {
    assert.deepEqual(
      filterForRanking(pool, { scope: 'curso', cohort: 'periodo', fromIngresso: '2023.1', toIngresso: '2024.1' }, me).map(
        (s) => s.ira,
      ),
      [8, 7.5],
    );
  });

  it('todos includes formados', () => {
    assert.equal(filterForRanking(pool, { scope: 'curso', cohort: 'todos' }, me).length, 4);
  });

  it('blocks cohort filters without an ingresso', () => {
    const noIngresso = { course: 'Engenharia de Software', ingresso: null };
    assert.notEqual(rankingFilterBlocker({ scope: 'curso', cohort: 'turma' }, noIngresso), null);
    assert.deepEqual(filterForRanking(pool, { scope: 'curso', cohort: 'turma' }, noIngresso), []);
    assert.equal(rankingFilterBlocker({ scope: 'curso', cohort: 'ativos' }, noIngresso), null);
  });
});

describe('buildRanking', () => {
  const others = [9.8, 9.5, 9.1, 8.9, 8.7, 8.6, 8.2, 7];

  it('outside the podium: top 5 plus a separate "você" row', () => {
    const r = buildRanking(others, 8.4);
    assert.equal(r.youInTop, false);
    assert.deepEqual(r.rows.map((row) => row.position), [1, 2, 3, 4, 5]);
    assert.deepEqual(r.rows.map((row) => row.ira), [9.8, 9.5, 9.1, 8.9, 8.7]);
    assert.equal(r.you.position, 7);
    assert.equal(r.total, 9);
    assert.equal(r.podiumIra, 8.7);
    assert.deepEqual(r.nextStep, { ira: 8.6, places: 1 });
  });

  it('inside the podium: still exactly 5 rows, with "você" in place', () => {
    const r = buildRanking(others, 9.3);
    assert.equal(r.youInTop, true);
    assert.equal(r.rows.length, 5);
    assert.deepEqual(r.rows.map((row) => [row.position, row.isYou]), [
      [1, false],
      [2, false],
      [3, true],
      [4, false],
      [5, false],
    ]);
    assert.equal(r.podiumIra, undefined);
  });

  it('5th place keeps 5 rows and no extra one', () => {
    const r = buildRanking(others, 8.8);
    assert.equal(r.you.position, 5);
    assert.equal(r.rows.length, 5);
    assert.equal(r.rows[4].isYou, true);
  });

  it('ties share the better position', () => {
    const r = buildRanking([9, 8, 8, 7], 8);
    assert.equal(r.you.position, 2);
    assert.deepEqual(r.rows.map((row) => row.position), [1, 2, 2, 2, 5]);
  });

  it('first place has no next step', () => {
    assert.equal(buildRanking(others, 9.9).nextStep, undefined);
  });
});

describe('graduationForecast', () => {
  const table = { '7.0': { '9': 2, '10': 3 }, '7.5': { '10': 2, '12': 1 }, '9.0': { '8': 9 } };

  it('pools nearby bands only', () => {
    const f = graduationForecast(table, 7.5)!;
    assert.equal(f.n, 8);
    assert.equal(f.median, 10);
    assert.deepEqual(f.counts, [
      [9, 2],
      [10, 5],
      [12, 1],
    ]);
  });

  it('returns null below the minimum group size', () => {
    assert.equal(graduationForecast({ '7.0': { '9': 2 } }, 7.2), null);
  });
});

describe('iraByStage', () => {
  it('groups ativos by semesters attended and hides small groups', () => {
    const pool = [
      ...Array.from({ length: 5 }, (_, i) => student({ ingresso: '2026.1', ira: 7 + i * 0.1 })),
      ...Array.from({ length: 3 }, () => student({ ingresso: '2025.1', ira: 6 })),
      student({ ingresso: '2026.1', status: 'formado', ira: 10 }),
    ];
    const stages = iraByStage(pool, '2026.1');
    assert.equal(stages.length, 1);
    assert.equal(stages[0].stage, 1);
    assert.equal(stages[0].n, 5);
    assert.ok(Math.abs(stages[0].mean - 7.2) < 1e-9);
  });
});

describe('findStudentMatches / excludeClaimedStudent', () => {
  const pool = [
    student({ course: 'Design Digital', ingresso: '2024.1', ira: 9.8289 }),
    student({ course: 'Engenharia de Software', ingresso: '2023.1', ira: 9.8289 }),
    student({ course: 'Engenharia de Software', ingresso: '2023.1', ira: 9.5 }),
  ];

  it('prefers exact IRA + matching course and ingresso', () => {
    const matches = findStudentMatches(pool, 9.8289, { course: 'Engenharia de Software', ingresso: '2023.1' });
    assert.equal(matches.length, 2);
    assert.equal(matches[0].student.course, 'Engenharia de Software');
    assert.equal(matches[0].courseMatch, true);
    assert.equal(matches[0].ingressoMatch, true);
  });

  it('excludes only one claimed student from the pool', () => {
    const dup = [...pool, student({ course: 'Engenharia de Software', ingresso: '2023.1', ira: 9.8289 })];
    const filtered = excludeClaimedStudent(dup, pool[1]);
    assert.equal(filtered.length, dup.length - 1);
  });
});

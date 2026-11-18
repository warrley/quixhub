import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { IraEntry } from '@/data/types';
import { computeIra } from './ira';
import {
  buildSimulatedEntries,
  compareLockVsRetake,
  computeCourseMilestones,
  computeLockBreakEven,
  runIraSimulation,
  solveTargetHorizons,
  type SimDisciplineItem,
  type SimFutureSemester,
} from './iraSimulator';

function entry(patch: Partial<IraEntry>): IraEntry {
  return { id: 'e', disciplineName: 'Disciplina', grade: 0, workload: 64, situacao: 'aprovado', source: 'manual', ...patch };
}

const VETERAN_TRANSCRIPT: IraEntry[] = [
  entry({ id: '1', semester: '2024.1', grade: 7.5, workload: 256 }),
  entry({ id: '2', semester: '2024.2', grade: 8.2, workload: 256 }),
  entry({ id: '3', semester: '2025.1', grade: 8.6, workload: 256 }),
  entry({ id: '4', semester: '2025.2', grade: 8.8, workload: 256 }),
  entry({ id: '5', semester: '2026.1', grade: 9.0, workload: 256 }),
  entry({ id: 'ip1', semester: '2026.2', grade: 0, workload: 64, situacao: 'em_andamento' }),
  entry({ id: 'ip2', semester: '2026.2', grade: 0, workload: 64, situacao: 'em_andamento' }),
];

describe('iraSimulator', () => {
  it('combines workbench entries and future semesters chronologically without semester collision', () => {
    const workbench: SimDisciplineItem[] = [
      { id: 'ip1', name: 'IA', workload: 64, semester: '2026.2', grade: 9.5, mode: 'nota', fromTranscript: true },
      { id: 'ip2', name: 'Compiladores', workload: 64, semester: '2026.2', grade: 8.0, mode: 'trancar', fromTranscript: true },
    ];
    const future: SimFutureSemester[] = [
      { id: 'f1', workload: 256, grade: 9.2, lockHours: 0 },
      { id: 'f2', workload: 256, grade: 9.4, lockHours: 0 },
    ];

    const built = buildSimulatedEntries(VETERAN_TRANSCRIPT, workbench, future);
    assert.deepEqual(
      built.resolvedSemesters.map((s) => s.semester),
      ['2027.1', '2027.2'],
    );
    assert.equal(built.resolvedSemesters[0].weight, 6);

    const out = runIraSimulation(VETERAN_TRANSCRIPT, workbench, future);
    assert.ok(out.finalIra !== null);
    assert.equal(out.points.length, 8);
    assert.equal(out.points[4].simulated, false);
    assert.equal(out.points[5].semester, '2026.2');
    assert.equal(out.points[5].simulated, true);
    assert.equal(out.points[7].semester, '2027.2');
    assert.equal(out.points[7].cumulativeIra, out.finalIra);
    assert.ok((out.itemDeltas.get('ip1') ?? 0) > 0);
    assert.ok((out.itemDeltas.get('ip2') ?? 0) < 0);
  });

  it('computes exact break-even grade for trancar vs staying in class', () => {
    const be = computeLockBreakEven(VETERAN_TRANSCRIPT, 64);
    assert.ok(be !== null);
    assert.equal(be.semester, '2026.2');
    assert.equal(be.weight, 6);

    const base = VETERAN_TRANSCRIPT.filter((e) => e.situacao !== 'em_andamento');
    const above = computeIra([
      ...base,
      entry({ id: 'above', semester: be.semester, grade: Math.min(10, be.breakEvenGrade + 0.15), workload: 64 }),
    ])!;
    const below = computeIra([
      ...base,
      entry({
        id: 'below',
        semester: be.semester,
        grade: Math.max(0, be.breakEvenGrade - 0.15),
        workload: 64,
        situacao: be.breakEvenGrade - 0.15 < 5 ? 'reprovado' : 'aprovado',
      }),
    ])!;

    assert.ok(above >= be.iraIfLocked - 1e-4, `above ${above} should beat locked ${be.iraIfLocked}`);
    assert.ok(below <= be.iraIfLocked + 1e-4, `below ${below} should be <= locked ${be.iraIfLocked}`);
  });

  it('compares locking now + retaking later vs risking a failing grade + retaking', () => {
    const cmp = compareLockVsRetake(VETERAN_TRANSCRIPT, 64, 2.0, 9.0);
    assert.ok(cmp !== null);
    assert.equal(cmp.nextSemester, '2026.2');
    assert.equal(cmp.retakeSemester, '2027.1');
    assert.ok(cmp.lockThenRetakeIra > cmp.keepThenRetakeIra);
    assert.ok(cmp.diffLockVsKeepRetake > 0);
  });

  it('solves multi-horizon course goals and returns null above 10-grade ceiling', () => {
    const base = VETERAN_TRANSCRIPT.filter((e) => e.situacao !== 'em_andamento');
    const baseIra = computeIra(base)!;
    const target = Number((baseIra + 0.15).toFixed(4));
    const solutions = solveTargetHorizons(VETERAN_TRANSCRIPT, target, 256, [1, 2, 3, 4]);
    assert.equal(solutions.length, 4);

    // Horizon 1 with 256h cannot raise an 1280h high-IRA transcript by +0.15 unless <= 10 allows it;
    // verify every non-null solution actually achieves >= target when plugged back in.
    for (const sol of solutions) {
      if (sol.neededAvg === null) {
        assert.ok(sol.maxIraAt10 < target);
      } else {
        const testOut = runIraSimulation(
          VETERAN_TRANSCRIPT,
          [],
          Array.from({ length: sol.semesters }, (_, k) => ({
            id: `h${k}`,
            workload: 256,
            grade: sol.neededAvg!,
            lockHours: 0,
          })),
        );
        assert.ok((testOut.finalIra ?? 0) >= target - 1e-4);
      }
    }

    const impossible = solveTargetHorizons(VETERAN_TRANSCRIPT, 9.95, 256, [1, 2]);
    assert.equal(impossible[0].neededAvg, null);
    assert.equal(impossible[1].neededAvg, null);
  });

  it('orders course milestones and flags already reached thresholds', () => {
    const pool = [4.5, 5.5, 6.2, 7.0, 7.8, 8.1, 8.6, 8.9, 9.2, 9.6];
    const milestones = computeCourseMilestones(pool, 8.5);
    assert.equal(milestones[0].key, 'plus01');
    const median = milestones.find((m) => m.key === 'median')!;
    const top10 = milestones.find((m) => m.key === 'top10')!;
    assert.equal(median.reached, true);
    assert.equal(top10.reached, false);
    assert.ok(top10.targetIra > median.targetIra);
  });
});

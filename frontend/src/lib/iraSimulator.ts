import type { IraEntry } from '@/data/types';
import { computeEvolution, computeIra, isEntryPredicted, MIN_PASSING_GRADE, semesterWeight } from '@/lib/ira';
import { quantile, semesterIndex, semesterLabel } from '@/lib/iraCampus';

export type SimDisciplineMode = 'nota' | 'trancar' | 'ignorar';

export interface SimDisciplineItem {
  id: string;
  name: string;
  workload: number;
  semester: string;
  grade: number;
  mode: SimDisciplineMode;
  fromTranscript: boolean;
}

export interface SimFutureSemester {
  id: string;
  workload: number;
  grade: number;
  lockHours: number;
}

export interface SimTrajectoryPoint {
  semester: string;
  cumulativeIra: number;
  deltaIra: number | null;
  weight: number;
  simulated: boolean;
}

export interface SimulationOutput {
  finalIra: number | null;
  points: SimTrajectoryPoint[];
  resolvedSemesters: { id: string; semester: string; weight: number }[];
  itemDeltas: Map<string, number>;
}

export interface LockBreakEvenAnalysis {
  semester: string;
  weight: number;
  workload: number;
  currentIra: number;
  iraIfLocked: number;
  deltaIfLocked: number;
  breakEvenGrade: number;
  iraAt5: number;
  deltaAt5: number;
  iraAt3: number;
  deltaAt3: number;
}

export interface RetakeComparison {
  nextSemester: string;
  retakeSemester: string;
  lockThenRetakeIra: number;
  keepThenRetakeIra: number;
  keepNowIra: number;
  diffLockVsKeepRetake: number;
}

export interface CourseMilestone {
  key: string;
  label: string;
  targetIra: number;
  reached: boolean;
}

export interface HorizonSolution {
  semesters: number;
  totalHours: number;
  neededAvg: number | null;
  maxIraAt10: number;
}

export function nextSemesterAfterEntries(entries: IraEntry[]): string {
  let maxIdx = 0;
  for (const e of entries) {
    if (e.situacao === 'em_andamento') continue;
    const idx = semesterIndex(e.semester);
    if (idx !== null && idx > maxIdx) maxIdx = idx;
  }
  return maxIdx > 0 ? semesterLabel(maxIdx + 1) : '2026.2';
}

export function defaultWorkbenchSemester(entries: IraEntry[]): string {
  let maxActiveIdx = 0;
  for (const e of entries) {
    if (e.situacao !== 'em_andamento' && !isEntryPredicted(e)) continue;
    const idx = semesterIndex(e.semester);
    if (idx !== null && idx > maxActiveIdx) maxActiveIdx = idx;
  }
  if (maxActiveIdx > 0) return semesterLabel(maxActiveIdx);
  return nextSemesterAfterEntries(entries);
}

export function buildSimulatedEntries(
  entries: IraEntry[],
  workbench: SimDisciplineItem[],
  futureSemesters: SimFutureSemester[],
) {
  const workbenchIds = new Set(workbench.map((w) => w.id));
  const baseEntries = entries.filter((e) => e.situacao !== 'em_andamento' && !workbenchIds.has(e.id));

  const activeWorkbenchEntries: IraEntry[] = workbench
    .filter((item) => item.mode !== 'ignorar')
    .map((item) => ({
      id: `sim-wb-${item.id}`,
      disciplineName: item.name,
      grade: item.mode === 'trancar' ? 0 : item.grade,
      workload: item.workload,
      situacao:
        item.mode === 'trancar'
          ? 'trancado'
          : item.grade < MIN_PASSING_GRADE
            ? 'reprovado'
            : 'aprovado',
      source: 'manual',
      semester: item.semester,
    }));

  let maxUsedIdx = 0;
  for (const e of [...baseEntries, ...activeWorkbenchEntries]) {
    const idx = semesterIndex(e.semester);
    if (idx !== null && idx > maxUsedIdx) maxUsedIdx = idx;
  }
  if (maxUsedIdx === 0) {
    maxUsedIdx = semesterIndex('2026.1') ?? 4052;
  }

  const futureEntries: IraEntry[] = [];
  const rawFutureLabels: { id: string; semester: string }[] = [];

  futureSemesters.forEach((fs, k) => {
    const semLabel = semesterLabel(maxUsedIdx + 1 + k);
    rawFutureLabels.push({ id: fs.id, semester: semLabel });
    if (fs.workload > 0) {
      futureEntries.push({
        id: `sim-fs-${fs.id}`,
        disciplineName: `Semestre ${semLabel}`,
        grade: fs.grade,
        workload: fs.workload,
        situacao: fs.grade < MIN_PASSING_GRADE ? 'reprovado' : 'aprovado',
        source: 'manual',
        semester: semLabel,
      });
    }
    if (fs.lockHours > 0) {
      futureEntries.push({
        id: `sim-fs-lock-${fs.id}`,
        disciplineName: `Trancamento ${semLabel}`,
        grade: 0,
        workload: fs.lockHours,
        situacao: 'trancado',
        source: 'manual',
        semester: semLabel,
      });
    }
  });

  const combined = [...baseEntries, ...activeWorkbenchEntries, ...futureEntries];
  const allSemesters = [...new Set(combined.map((e) => e.semester).filter((s): s is string => Boolean(s)))].sort(
    (a, b) => a.localeCompare(b),
  );
  const resolvedSemesters = rawFutureLabels.map((r) => ({
    id: r.id,
    semester: r.semester,
    weight: semesterWeight(r.semester, allSemesters),
  }));

  return { baseEntries, combined, activeWorkbenchEntries, futureEntries, resolvedSemesters, allSemesters };
}

export function runIraSimulation(
  entries: IraEntry[],
  workbench: SimDisciplineItem[],
  futureSemesters: SimFutureSemester[],
): SimulationOutput {
  const { baseEntries, combined, activeWorkbenchEntries, futureEntries, resolvedSemesters, allSemesters } =
    buildSimulatedEntries(entries, workbench, futureSemesters);

  const finalIra = computeIra(combined);
  const simSems = new Set(
    [...activeWorkbenchEntries, ...futureEntries]
      .map((e) => e.semester)
      .filter((s): s is string => Boolean(s)),
  );

  // Start from real chronological points, then append/recompute every semester once simulation touches it.
  const baseEvo = computeEvolution(baseEntries);
  const firstSimSem = [...simSems].sort((a, b) => a.localeCompare(b))[0] ?? null;

  const points: SimTrajectoryPoint[] = [];
  for (let i = 0; i < allSemesters.length; i++) {
    const sem = allSemesters[i];
    const isSimulated = firstSimSem !== null && sem.localeCompare(firstSimSem) >= 0;
    if (!isSimulated) {
      const realPt = baseEvo.find((p) => p.semester === sem);
      if (realPt) {
        const prev = points[points.length - 1];
        points.push({
          semester: sem,
          cumulativeIra: realPt.cumulativeIra,
          deltaIra: prev ? Number((realPt.cumulativeIra - prev.cumulativeIra).toFixed(4)) : null,
          weight: semesterWeight(sem, allSemesters),
          simulated: false,
        });
        continue;
      }
    }

    const upTo = combined.filter((e) => e.semester && e.semester.localeCompare(sem) <= 0);
    const cumulativeIra = computeIra(upTo);
    if (cumulativeIra === null) continue;
    const prev = points[points.length - 1];
    points.push({
      semester: sem,
      cumulativeIra,
      deltaIra: prev ? Number((cumulativeIra - prev.cumulativeIra).toFixed(4)) : null,
      weight: semesterWeight(sem, allSemesters),
      simulated: isSimulated || simSems.has(sem),
    });
  }

  const itemDeltas = new Map<string, number>();
  for (const item of workbench) {
    if (item.mode === 'ignorar') {
      const withItem = buildSimulatedEntries(
        entries,
        workbench.map((w) => (w.id === item.id ? { ...w, mode: 'nota' } : w)),
        futureSemesters,
      );
      const iraWith = computeIra(withItem.combined);
      if (finalIra !== null && iraWith !== null) {
        itemDeltas.set(item.id, Number((iraWith - finalIra).toFixed(4)));
      }
    } else {
      const withoutItem = buildSimulatedEntries(
        entries,
        workbench.map((w) => (w.id === item.id ? { ...w, mode: 'ignorar' } : w)),
        futureSemesters,
      );
      const iraWithout = computeIra(withoutItem.combined);
      if (finalIra !== null && iraWithout !== null) {
        itemDeltas.set(item.id, Number((finalIra - iraWithout).toFixed(4)));
      } else {
        itemDeltas.set(item.id, 0);
      }
    }
  }

  return { finalIra, points, resolvedSemesters, itemDeltas };
}

export function computeLockBreakEven(entries: IraEntry[], workload = 64): LockBreakEvenAnalysis | null {
  const baseEntries = entries.filter((e) => e.situacao !== 'em_andamento');
  const currentIra = computeIra(baseEntries);
  if (currentIra === null) return null;

  const sem = defaultWorkbenchSemester(entries);
  const allSems = [
    ...new Set([...baseEntries.map((e) => e.semester).filter((s): s is string => Boolean(s)), sem]),
  ].sort((a, b) => a.localeCompare(b));
  const weight = semesterWeight(sem, allSems);

  const atGrade = (grade: number) =>
    computeIra([
      ...baseEntries,
      {
        id: '__be_g__',
        disciplineName: 'Break-even',
        grade,
        workload,
        situacao: grade < MIN_PASSING_GRADE ? 'reprovado' : 'aprovado',
        source: 'manual',
        semester: sem,
      },
    ]);

  const iraIfLocked = computeIra([
    ...baseEntries,
    {
      id: '__be_l__',
      disciplineName: 'Trancamento',
      grade: 0,
      workload,
      situacao: 'trancado',
      source: 'manual',
      semester: sem,
    },
  ]);

  const iraAt0 = atGrade(0);
  const iraAt3 = atGrade(3);
  const iraAt5 = atGrade(5);
  const iraAt10 = atGrade(10);

  if (iraIfLocked === null || iraAt0 === null || iraAt3 === null || iraAt5 === null || iraAt10 === null) {
    return null;
  }

  let breakEvenGrade: number;
  if (iraIfLocked <= iraAt0) {
    breakEvenGrade = 0;
  } else if (iraIfLocked >= iraAt10) {
    breakEvenGrade = 10;
  } else {
    let lo = 0;
    let hi = 10;
    for (let i = 0; i < 28; i++) {
      const mid = (lo + hi) / 2;
      const val = atGrade(mid) ?? 0;
      if (val < iraIfLocked) lo = mid;
      else hi = mid;
    }
    breakEvenGrade = Number(((lo + hi) / 2).toFixed(2));
  }

  return {
    semester: sem,
    weight,
    workload,
    currentIra,
    iraIfLocked,
    deltaIfLocked: Number((iraIfLocked - currentIra).toFixed(4)),
    breakEvenGrade,
    iraAt5,
    deltaAt5: Number((iraAt5 - currentIra).toFixed(4)),
    iraAt3,
    deltaAt3: Number((iraAt3 - currentIra).toFixed(4)),
  };
}

export function compareLockVsRetake(
  entries: IraEntry[],
  workload: number,
  riskGrade: number,
  retakeGrade: number,
): RetakeComparison | null {
  const baseEntries = entries.filter((e) => e.situacao !== 'em_andamento');
  if (computeIra(baseEntries) === null) return null;

  const nextSemester = defaultWorkbenchSemester(entries);
  const idx1 = semesterIndex(nextSemester) ?? semesterIndex('2026.2') ?? 4053;
  const retakeSemester = semesterLabel(idx1 + 1);

  const synth = (id: string, grade: number, semester: string, locked = false): IraEntry => ({
    id,
    disciplineName: locked ? 'Trancamento' : 'Disciplina',
    grade: locked ? 0 : grade,
    workload,
    situacao: locked ? 'trancado' : grade < MIN_PASSING_GRADE ? 'reprovado' : 'aprovado',
    source: 'manual',
    semester,
  });

  const lockThenRetakeIra = computeIra([
    ...baseEntries,
    synth('__r1__', 0, nextSemester, true),
    synth('__r2__', retakeGrade, retakeSemester, false),
  ]);
  const keepThenRetakeIra = computeIra([
    ...baseEntries,
    synth('__r1__', riskGrade, nextSemester, false),
    synth('__r2__', retakeGrade, retakeSemester, false),
  ]);
  const keepNowIra = computeIra([...baseEntries, synth('__r1__', riskGrade, nextSemester, false)]);

  if (lockThenRetakeIra === null || keepThenRetakeIra === null || keepNowIra === null) return null;

  return {
    nextSemester,
    retakeSemester,
    lockThenRetakeIra,
    keepThenRetakeIra,
    keepNowIra,
    diffLockVsKeepRetake: Number((lockThenRetakeIra - keepThenRetakeIra).toFixed(4)),
  };
}

export function computeCourseMilestones(values: number[], currentIra: number): CourseMilestone[] {
  const milestones: CourseMilestone[] = [
    {
      key: 'plus01',
      label: '+0,10 no IRA',
      targetIra: Math.min(10, Number((currentIra + 0.1).toFixed(4))),
      reached: false,
    },
  ];

  if (values.length >= 5) {
    const asc = [...values].sort((a, b) => a - b);
    const desc = [...asc].reverse();
    const top5Val = desc[Math.min(4, desc.length - 1)];
    milestones.push(
      { key: 'median', label: 'Mediana (50%)', targetIra: Number(quantile(asc, 0.5).toFixed(4)), reached: false },
      { key: 'top25', label: 'Top 25%', targetIra: Number(quantile(asc, 0.75).toFixed(4)), reached: false },
      { key: 'top10', label: 'Top 10%', targetIra: Number(quantile(asc, 0.9).toFixed(4)), reached: false },
      { key: 'top5', label: 'Top 5 (Pódio)', targetIra: Number(top5Val.toFixed(4)), reached: false },
    );
  }

  return milestones.map((m) => ({
    ...m,
    reached: m.key === 'plus01' ? false : currentIra >= m.targetIra - 1e-6,
  }));
}

export function solveTargetHorizons(
  entries: IraEntry[],
  targetIra: number,
  hoursPerSemester = 256,
  horizons = [1, 2, 3, 4],
): HorizonSolution[] {
  const baseEntries = entries.filter((e) => e.situacao !== 'em_andamento');
  const startSem = defaultWorkbenchSemester(entries);
  const startIdx = semesterIndex(startSem) ?? semesterIndex('2026.2') ?? 4053;
  const clampedTarget = Math.min(10, Math.max(0, targetIra));

  return horizons.map((semesters) => {
    const totalHours = semesters * hoursPerSemester;
    const evalAvg = (grade: number) => {
      const future: IraEntry[] = Array.from({ length: semesters }, (_, k) => ({
        id: `__goal_${semesters}_${k}`,
        disciplineName: `Meta ${k + 1}`,
        grade,
        workload: hoursPerSemester,
        situacao: grade < MIN_PASSING_GRADE ? 'reprovado' : 'aprovado',
        source: 'manual',
        semester: semesterLabel(startIdx + k),
      }));
      return computeIra([...baseEntries, ...future]);
    };

    const maxIraAt10 = evalAvg(10) ?? 0;
    if (maxIraAt10 < clampedTarget - 1e-6) {
      return { semesters, totalHours, neededAvg: null, maxIraAt10 };
    }

    const at0 = evalAvg(0) ?? 0;
    if (at0 >= clampedTarget) {
      return { semesters, totalHours, neededAvg: 0, maxIraAt10 };
    }

    let lo = 0;
    let hi = 10;
    for (let i = 0; i < 26; i++) {
      const mid = (lo + hi) / 2;
      if ((evalAvg(mid) ?? 0) >= clampedTarget) hi = mid;
      else lo = mid;
    }

    // Round up to 0.01 so plugging neededAvg back in guarantees >= targetIra.
    const neededAvg = Math.min(10, Number((Math.ceil(hi * 100) / 100).toFixed(2)));
    return { semesters, totalHours, neededAvg, maxIraAt10 };
  });
}

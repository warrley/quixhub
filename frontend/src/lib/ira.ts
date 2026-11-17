import { disciplines } from '@/data/mock';
import type { IraEntry } from '@/data/types';

/**
 * IRA = lockedPenalty × gradeAverage, where:
 *  - gradeAverage = Σ(Ni × Ci × Pi) / Σ(Ci × Pi), Pi = min(semesterNumber, 6)
 *    (semesterNumber counts the chronological semesters present in the
 *    entries, 1 = earliest — so weight grows with recency, capped at 6).
 *  - lockedPenalty = 1 − (0.5 × lockedHours) / totalHours, totalHours = sum
 *    of graded-discipline CH plus "trancado" (withdrawn) discipline CH.
 * "em_andamento" (no final grade yet) entries are excluded entirely — they
 * contribute to neither the average nor the penalty, matching the reference
 * implementation's `grade !== -1` (missing-grade sentinel) check.
 *
 * Verified exact against a real UFC transcript: computed 9.8289, matching
 * the SIGAA-printed "IRA - Individual: 9.8289" digit-for-digit (no trancados
 * in that sample, so the penalty term wasn't exercised against real data —
 * only synthetically).
 */
function chronologicalSemesters(entries: IraEntry[]): string[] {
  return [...new Set(entries.map((e) => e.semester).filter((s): s is string => Boolean(s)))].sort((a, b) =>
    a.localeCompare(b),
  );
}

// 1-based, chronological — earliest = 1, capped at 6 so recency stops
// mattering beyond the sixth semester.
export function semesterWeight(semester: string | undefined, semesters: string[]): number {
  if (!semester) return 1;
  return Math.min(semesters.indexOf(semester) + 1, 6);
}

// Shared by computeIra and computeSemesterStats so a semester's reported
// "contribution" always sums back exactly to the displayed IRA — including
// the locked-discipline penalty, which is a single global multiplier applied
// uniformly across every semester's share.
function computeIraComponents(entries: IraEntry[], semesters: string[]) {
  let numerator = 0;
  let denominatorGrades = 0;
  let totalGradedHours = 0;
  let lockedHours = 0;

  for (const e of entries) {
    if (e.situacao === 'em_andamento') continue;
    if (e.situacao === 'trancado') {
      lockedHours += e.workload;
      continue;
    }
    if (!Number.isFinite(e.grade) || e.workload <= 0) continue;
    const weight = semesterWeight(e.semester, semesters);
    numerator += weight * e.workload * e.grade;
    denominatorGrades += weight * e.workload;
    totalGradedHours += e.workload;
  }

  const totalHours = totalGradedHours + lockedHours;
  const gradeAverage = denominatorGrades === 0 ? null : numerator / denominatorGrades;
  const lockedPenalty = totalHours === 0 ? 1 : 1 - (0.5 * lockedHours) / totalHours;
  return { denominatorGrades, gradeAverage, lockedPenalty };
}

export function computeIra(entries: IraEntry[]): number | null {
  const semesters = chronologicalSemesters(entries);
  const { gradeAverage, lockedPenalty } = computeIraComponents(entries, semesters);
  if (gradeAverage === null) return null;
  return Number((lockedPenalty * gradeAverage).toFixed(4));
}

export interface SemesterStat {
  semester: string;
  /** CH-weighted grade average within this semester alone, no recency
   * weight applied — null when the semester has no graded entries yet
   * (e.g. only "em andamento" disciplines). */
  average: number | null;
  /** The same 1-6 recency weight computeIra applies to this semester. */
  weight: number;
  hours: number;
  /** This semester's share of the final IRA, in the same 0-10 point scale —
   * summing `contribution` across every semester reproduces the overall
   * IRA exactly. Null under the same condition as `average`. */
  contribution: number | null;
}

export function computeSemesterStats(entries: IraEntry[]): SemesterStat[] {
  const semesters = chronologicalSemesters(entries);
  const { denominatorGrades, lockedPenalty } = computeIraComponents(entries, semesters);

  return semesters.map((semester) => {
    const graded = entries.filter(
      (e) =>
        e.semester === semester &&
        e.situacao !== 'em_andamento' &&
        e.situacao !== 'trancado' &&
        Number.isFinite(e.grade) &&
        e.workload > 0,
    );
    const hours = graded.reduce((s, e) => s + e.workload, 0);
    const average = hours > 0 ? graded.reduce((s, e) => s + e.grade * e.workload, 0) / hours : null;
    const weight = semesterWeight(semester, semesters);
    const contribution =
      average !== null && denominatorGrades > 0
        ? Number((((weight * hours * average) / denominatorGrades) * lockedPenalty).toFixed(4))
        : null;
    return { semester, average, weight, hours, contribution };
  });
}

export type Situacao = NonNullable<IraEntry['situacao']>;

/** Final grades below this are always a failure — never "aprovado". UFC:
 * média final < 5 (after the avaliação final) is reprovação, so no passing
 * grade on a SIGAA transcript is below 5. */
export const MIN_PASSING_GRADE = 5;

/**
 * The single grade → situação rule shared by every IRA entry flow (manual
 * add, inline edit, PDF import review): no grade yet → em andamento, below
 * MIN_PASSING_GRADE → reprovado, otherwise aprovado. Callers re-derive the
 * situação with this whenever the grade changes; the user can still pick
 * "reprovado" afterwards for a passing grade (e.g. reprovado por falta).
 */
export function situacaoFromGrade(grade: number | ''): Situacao {
  if (grade === '') return 'em_andamento';
  return grade < MIN_PASSING_GRADE ? 'reprovado' : 'aprovado';
}

/** Trancado / em andamento have no final grade — computeIra never reads
 * their `grade`, so they can be saved without one. */
export function requiresGrade(situacao: Situacao | undefined): boolean {
  return situacao !== 'trancado' && situacao !== 'em_andamento';
}

/** Why a (grade, situação) pair can't be saved, or null when it can. */
export function gradeSituacaoError(grade: number | '', situacao: Situacao | undefined): string | null {
  if (!requiresGrade(situacao)) return null;
  if (grade === '') return 'Informe a nota';
  if (!Number.isFinite(grade) || grade < 0 || grade > 10) return 'Nota entre 0 e 10';
  if (grade < MIN_PASSING_GRADE && situacao !== 'reprovado') return `Nota < ${MIN_PASSING_GRADE} é reprovação`;
  return null;
}

const DIACRITICS = /[̀-ͯ]/g;

function normalize(s: string) {
  return s.trim().toLowerCase().normalize('NFD').replace(DIACRITICS, '');
}

export function resolveDisciplineId(name: string): string | undefined {
  const target = normalize(name);
  return disciplines.find((d) => normalize(d.name) === target)?.id;
}

export interface EvolutionDiscipline {
  id: string;
  name: string;
  grade: number;
  workload: number;
  situacao: IraEntry['situacao'];
  simulated: boolean;
}

export interface EvolutionPoint {
  semester: string;
  cumulativeIra: number;
  deltaIra: number | null;
  semesterAverage: number | null;
  weight: number;
  disciplines: EvolutionDiscipline[];
  simulated: boolean;
}

/** Known UFC Quixadá grade-consolidation cutoffs (end of the semester).
 * Unlisted semesters fall back to July 31 (.1) and Dec 23 (.2). */
export const UFC_CONSOLIDATION_DATES: Record<string, string> = {
  '2025.1': '2025-07-31',
  '2025.2': '2025-12-23',
  '2026.1': '2026-07-31',
  '2026.2': '2026-12-22',
  '2027.1': '2027-07-31',
  '2027.2': '2027-12-22',
};

export function semesterConsolidationDate(semester: string | undefined): Date | null {
  if (!semester) return null;
  const known = UFC_CONSOLIDATION_DATES[semester];
  if (known) return new Date(`${known}T23:59:59`);
  const match = semester.match(/^(\d{4})\.([12])$/);
  if (!match) return null;
  const monthDay = match[2] === '1' ? '07-31' : '12-23';
  return new Date(`${match[1]}-${monthDay}T23:59:59`);
}

/** False when the UFC semester hasn't finished consolidating grades yet
 * (so entries added with a grade should default to "Previsão"). */
export function isSemesterConsolidated(semester: string | undefined, now = new Date()): boolean {
  const cutoff = semesterConsolidationDate(semester);
  if (!cutoff) return true;
  return now.getTime() > cutoff.getTime();
}

/**
 * Cumulative IRA after each chronological semester plus that semester's own
 * grade average, recency weight, step delta, and graded disciplines — drives
 * the rich personal evolution chart.
 */
export function computeEvolution(entries: IraEntry[]): EvolutionPoint[] {
  const semesters = chronologicalSemesters(entries);
  const stats = new Map(computeSemesterStats(entries).map((s) => [s.semester, s]));
  const points: EvolutionPoint[] = [];

  for (let i = 0; i < semesters.length; i++) {
    const sem = semesters[i];
    const upTo = entries.filter((e) => e.semester && e.semester.localeCompare(sem) <= 0);
    const cumulativeIra = computeIra(upTo);
    if (cumulativeIra === null) continue;
    const inSem = entries.filter((e) => e.semester === sem && e.situacao !== 'em_andamento');
    if (inSem.length === 0) continue;
    const prev = points[points.length - 1];
    points.push({
      semester: sem,
      cumulativeIra,
      deltaIra: prev ? Number((cumulativeIra - prev.cumulativeIra).toFixed(4)) : null,
      semesterAverage: stats.get(sem)?.average ?? null,
      weight: stats.get(sem)?.weight ?? 1,
      disciplines: inSem.map((e) => ({
        id: e.id,
        name: e.disciplineName,
        grade: e.grade,
        workload: e.workload,
        situacao: e.situacao,
        simulated: Boolean(e.simulated),
      })),
      simulated: inSem.some((e) => e.simulated),
    });
  }
  return points;
}

export interface DisciplineBubble {
  id: string;
  name: string;
  semester: string;
  grade: number;
  workload: number;
  weight: number;
  /** workload × semesterWeight — how much weight the discipline carries in IRA. */
  effectiveWeight: number;
  /** IRA(all) − IRA(without this discipline). */
  delta: number;
  situacao: IraEntry['situacao'];
  simulated: boolean;
}

/** Every graded/trancado discipline with its grade, effective IRA weight
 * (`CH × peso do semestre`), and exact marginal IRA impact. */
export function computeDisciplineBubbles(entries: IraEntry[]): DisciplineBubble[] {
  const base = computeIra(entries);
  if (base === null) return [];
  const semesters = chronologicalSemesters(entries);
  const bubbles: DisciplineBubble[] = [];

  for (const e of entries) {
    if (e.situacao === 'em_andamento') continue;
    const without = computeIra(entries.filter((x) => x.id !== e.id));
    if (without === null) continue;
    const weight = semesterWeight(e.semester, semesters);
    bubbles.push({
      id: e.id,
      name: e.disciplineName,
      semester: e.semester ?? '—',
      grade: e.situacao === 'trancado' ? 0 : e.grade,
      workload: e.workload,
      weight,
      effectiveWeight: e.workload * weight,
      delta: Number((base - without).toFixed(4)),
      situacao: e.situacao,
      simulated: Boolean(e.simulated),
    });
  }
  return bubbles;
}

export interface IraImpactItem {
  id: string;
  label: string;
  sublabel: string;
  /** How much removing this item would *drop* your IRA (positive = helped,
   * negative = pulled down). */
  delta: number;
  simulated: boolean;
}

/** Exact marginal IRA impact (`IRA(all) − IRA(without e)`) of every
 * graded or trancado discipline, sorted largest absolute impact first. */
export function computeDisciplineImpacts(entries: IraEntry[]): IraImpactItem[] {
  const base = computeIra(entries);
  if (base === null) return [];
  const items: IraImpactItem[] = [];
  for (const e of entries) {
    if (e.situacao === 'em_andamento') continue;
    const without = computeIra(entries.filter((x) => x.id !== e.id));
    if (without === null) continue;
    const delta = Number((base - without).toFixed(4));
    if (delta === 0) continue;
    items.push({
      id: e.id,
      label: e.disciplineName,
      sublabel: e.situacao === 'trancado' ? `${e.semester ?? ''} · Trancado`.trim() : `${e.semester ?? ''} · Nota ${e.grade}`.trim(),
      delta,
      simulated: Boolean(e.simulated),
    });
  }
  return items.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

/** Exact marginal IRA impact of each semester. */
export function computeSemesterImpacts(entries: IraEntry[]): IraImpactItem[] {
  const base = computeIra(entries);
  if (base === null) return [];
  const semesters = chronologicalSemesters(entries);
  const items: IraImpactItem[] = [];
  for (const sem of semesters) {
    const inSem = entries.filter((e) => e.semester === sem && e.situacao !== 'em_andamento');
    if (inSem.length === 0) continue;
    const without = computeIra(entries.filter((e) => e.semester !== sem));
    if (without === null) continue;
    const delta = Number((base - without).toFixed(4));
    if (delta === 0) continue;
    items.push({
      id: sem,
      label: `Semestre ${sem}`,
      sublabel: `${inSem.length} ${inSem.length === 1 ? 'disciplina' : 'disciplinas'}`,
      delta,
      simulated: inSem.some((e) => e.simulated),
    });
  }
  return items.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

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

const DIACRITICS = /[̀-ͯ]/g;

function normalize(s: string) {
  return s.trim().toLowerCase().normalize('NFD').replace(DIACRITICS, '');
}

export function resolveDisciplineId(name: string): string | undefined {
  const target = normalize(name);
  return disciplines.find((d) => normalize(d.name) === target)?.id;
}

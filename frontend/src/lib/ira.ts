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
export function computeIra(entries: IraEntry[]): number | null {
  const semesters = [...new Set(entries.map((e) => e.semester).filter((s): s is string => Boolean(s)))].sort((a, b) =>
    a.localeCompare(b),
  );

  function semesterNumber(semester: string | undefined): number {
    if (!semester) return 1;
    return semesters.indexOf(semester) + 1; // 1-based, chronological — earliest = 1
  }

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
    const semesterWeight = Math.min(semesterNumber(e.semester), 6);
    numerator += semesterWeight * e.workload * e.grade;
    denominatorGrades += semesterWeight * e.workload;
    totalGradedHours += e.workload;
  }

  if (denominatorGrades === 0) return null;
  const totalHours = totalGradedHours + lockedHours;
  const gradeAverage = numerator / denominatorGrades;
  if (totalHours === 0) return Number(gradeAverage.toFixed(4));

  const lockedPenalty = 1 - (0.5 * lockedHours) / totalHours;
  return Number((lockedPenalty * gradeAverage).toFixed(4));
}

const DIACRITICS = /[̀-ͯ]/g;

function normalize(s: string) {
  return s.trim().toLowerCase().normalize('NFD').replace(DIACRITICS, '');
}

export function resolveDisciplineId(name: string): string | undefined {
  const target = normalize(name);
  return disciplines.find((d) => normalize(d.name) === target)?.id;
}

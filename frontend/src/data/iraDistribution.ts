// IRA distribution per program — mean/std/n of each course's *ativos*,
// derived from the real campus export (src/lib/iraCampusData.ts) instead of
// the hand-typed numbers this file used to hold. Keyed by course name —
// matches `currentUser.course` and the cadastro options. Ativos are the
// reference population because that's what SIGAA's IRA-G is computed
// against. `mean`/`std` are null for "Outro / Não sei" — the comparison is
// skipped in that case rather than guessing.
import { CAMPUS_COURSES, CAMPUS_UPDATED_AT, groupSummary } from '@/lib/iraCampusData';

export const IRA_DISTRIBUTIONS: Record<string, { mean: number | null; std: number | null; students?: number }> = {
  ...Object.fromEntries(
    CAMPUS_COURSES.map((course) => {
      const s = groupSummary(course, 'ativos');
      return [course, { mean: s?.mean ?? null, std: s?.std ?? null, students: s?.n }];
    }),
  ),
  'Outro / Não sei': { mean: null, std: null },
};

// Semester of the SIGAA export the numbers above come from.
export const IRA_DATA_UPDATED_AT = CAMPUS_UPDATED_AT;

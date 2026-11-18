// Empirical statistics over the real campus IRA export (see
// data/build_ira_campus.py and src/data/iraCampus.json). Everything here is
// pure — the JSON itself is loaded by iraCampusData.ts — so it runs under
// `npm test` without a bundler.

export type CampusStatus = 'ativo' | 'formado' | 'trancado';

export interface CampusStudent {
  course: string;
  /** Semester the student entered, e.g. "2023.1". */
  ingresso: string;
  status: CampusStatus;
  ira: number;
}

export type StatusGroup = 'ativos' | 'formados' | 'todos';

/** Groups smaller than this are never shown — too few students to keep the
 * numbers from pointing at someone in particular. */
export const MIN_GROUP_SIZE = 5;

export function inStatusGroup(status: CampusStatus, group: StatusGroup): boolean {
  if (group === 'ativos') return status === 'ativo';
  if (group === 'formados') return status === 'formado';
  return true;
}

// ── semesters ────────────────────────────────────────────────────────────

/** "2024.1" → a monotonic integer (two per year), or null when malformed. */
export function semesterIndex(semester: string | undefined | null): number | null {
  const match = semester?.match(/^(\d{4})\.([12])$/);
  if (!match) return null;
  return Number(match[1]) * 2 + (Number(match[2]) - 1);
}

export function semesterLabel(index: number): string {
  return `${Math.floor(index / 2)}.${(index % 2) + 1}`;
}

/** How many semesters someone who entered in `ingresso` has attended by
 * `reference`, counting both ends ("2026.1" → "2026.1" is 1). */
export function semestersAttended(ingresso: string, reference: string): number | null {
  const from = semesterIndex(ingresso);
  const to = semesterIndex(reference);
  if (from === null || to === null || to < from) return null;
  return to - from + 1;
}

// ── descriptive stats ────────────────────────────────────────────────────

/** Linear-interpolated quantile of an ascending-sorted array. */
export function quantile(sortedAsc: number[], q: number): number {
  if (sortedAsc.length === 0) return Number.NaN;
  const pos = (sortedAsc.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (pos - lo);
}

export interface Summary {
  n: number;
  mean: number;
  /** Sample standard deviation (n − 1), the same the SIGAA IRA-G uses. */
  std: number;
  median: number;
  q1: number;
  q3: number;
  min: number;
  max: number;
}

export function summarize(values: number[]): Summary | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const variance = n > 1 ? sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1) : 0;
  return {
    n,
    mean,
    std: Math.sqrt(variance),
    median: quantile(sorted, 0.5),
    q1: quantile(sorted, 0.25),
    q3: quantile(sorted, 0.75),
    min: sorted[0],
    max: sorted[n - 1],
  };
}

/** Share (0–100) of `values` strictly below `x` — "alunos que você supera". */
export function percentileBelow(values: number[], x: number): number {
  if (values.length === 0) return 0;
  let below = 0;
  for (const v of values) if (v < x) below++;
  return (below / values.length) * 100;
}

/** SIGAA's IRA-G: the course's z-score rescaled so the mean lands at 6 and
 * each standard deviation is worth 2 points. Checked against the real IRA-G
 * column of the export using the course's *ativos* as the reference
 * population (correlation 0.997–1.0 per course). */
export function iraGeral(ira: number, mean: number, std: number): number {
  return std > 0 ? 6 + (2 * (ira - mean)) / std : 6;
}

// ── histograms & density ────────────────────────────────────────────────

export interface Bin {
  start: number;
  end: number;
  count: number;
}

/** Fixed-width bins over [lo, hi]; values outside are clamped into the edge
 * bins, and `hi` itself lands in the last bin (a perfect 10 is counted). */
export function histogram(values: number[], binWidth: number, lo = 0, hi = 10): Bin[] {
  const count = Math.max(1, Math.round((hi - lo) / binWidth));
  const bins: Bin[] = Array.from({ length: count }, (_, i) => ({
    start: lo + i * binWidth,
    end: lo + (i + 1) * binWidth,
    count: 0,
  }));
  for (const v of values) {
    // The epsilon keeps 8.3 in [8.3, 8.4) despite 8.3 / 0.1 = 82.99999…
    const i = Math.floor((v - lo) / binWidth + 1e-9);
    bins[Math.min(count - 1, Math.max(0, i))].count++;
  }
  return bins;
}

/** Silverman's rule of thumb — robust to the long left tail via the IQR. */
export function silvermanBandwidth(values: number[]): number {
  const s = summarize(values);
  if (!s || s.n < 2) return 0.3;
  const spread = Math.min(s.std, (s.q3 - s.q1) / 1.34) || s.std || 0.3;
  return Math.max(0.08, 0.9 * spread * s.n ** -0.2);
}

/** Gaussian kernel density estimate at each of `xs` (integrates to 1). */
export function kde(values: number[], xs: number[], bandwidth = silvermanBandwidth(values)): number[] {
  const n = values.length;
  if (n === 0) return xs.map(() => 0);
  const norm = 1 / (n * bandwidth * Math.sqrt(2 * Math.PI));
  return xs.map((x) => {
    let sum = 0;
    for (const v of values) {
      const z = (x - v) / bandwidth;
      sum += Math.exp(-0.5 * z * z);
    }
    return sum * norm;
  });
}

// ── ranking ──────────────────────────────────────────────────────────────

export type RankingScope = 'campus' | 'curso';
/**
 * - ativos: everyone still enrolled.
 * - turma: ativos who entered in the same semester as you.
 * - turmaAoFim: ativos from your semester onward to the end of the course —
 *   your turma plus everyone further along (entered earlier), formandos
 *   included; no calouros behind you.
 * - periodo: ativos whose ingresso falls between `fromIngresso` and `toIngresso`.
 * - todos: ativos, formados and trancados.
 */
export type RankingCohort = 'ativos' | 'turma' | 'turmaAoFim' | 'periodo' | 'todos';

export interface RankingFilter {
  scope: RankingScope;
  cohort: RankingCohort;
  fromIngresso?: string | null;
  toIngresso?: string | null;
}

export interface RankingContext {
  course: string | null;
  ingresso: string | null;
}

/** Why a filter can't run yet, or null when it can. */
export function rankingFilterBlocker(filter: RankingFilter, me: RankingContext): string | null {
  if (filter.scope === 'curso' && !me.course) return 'Informe seu curso para ver o ranking do curso.';
  if ((filter.cohort === 'turma' || filter.cohort === 'turmaAoFim') && semesterIndex(me.ingresso) === null) {
    return 'Informe seu semestre de ingresso para comparar com a sua turma.';
  }
  if (
    filter.cohort === 'periodo' &&
    (semesterIndex(filter.fromIngresso) === null || semesterIndex(filter.toIngresso) === null)
  ) {
    return 'Escolha o período inicial e final para filtrar o ranking.';
  }
  return null;
}

export function filterForRanking(students: CampusStudent[], filter: RankingFilter, me: RankingContext): CampusStudent[] {
  if (rankingFilterBlocker(filter, me)) return [];
  const myIngresso = semesterIndex(me.ingresso);
  const fromIdx = semesterIndex(filter.fromIngresso);
  const toIdx = semesterIndex(filter.toIngresso);
  return students.filter((s) => {
    if (filter.scope === 'curso' && s.course !== me.course) return false;
    switch (filter.cohort) {
      case 'ativos':
        return s.status === 'ativo';
      case 'turma':
        return s.status === 'ativo' && s.ingresso === me.ingresso;
      case 'turmaAoFim': {
        const idx = semesterIndex(s.ingresso);
        return s.status === 'ativo' && idx !== null && myIngresso !== null && idx <= myIngresso;
      }
      case 'periodo': {
        const idx = semesterIndex(s.ingresso);
        if (idx === null || fromIdx === null || toIdx === null) return false;
        const lo = Math.min(fromIdx, toIdx);
        const hi = Math.max(fromIdx, toIdx);
        return s.status === 'ativo' && idx >= lo && idx <= hi;
      }
      case 'todos':
        return true;
    }
  });
}

export interface RankingRow {
  /** Competition ranking: ties share the better position (1, 2, 2, 4…). */
  position: number;
  ira: number;
  ingresso?: string;
  isYou: boolean;
}

export interface Ranking {
  /** The podium: exactly `size` rows (or fewer for tiny groups). Includes
   * "você" when you're inside it. */
  rows: RankingRow[];
  you: RankingRow;
  /** Group size including you. */
  total: number;
  youInTop: boolean;
  /** IRA you'd need to reach the podium — undefined when already in it. */
  podiumIra?: number;
  /** The next IRA above yours and how many places reaching it climbs. */
  nextStep?: { ira: number; places: number };
}

/**
 * Places "você" among `others` (the filtered group, any order). You're
 * ranked as one more student: the export is anonymous, so there's no way
 * to tell which row (if any) is you.
 */
export function buildRanking(
  others: (number | { ira: number; ingresso?: string })[],
  myIra: number,
  size = 5,
  myIngresso?: string | null,
): Ranking {
  const normalized = others.map((o) => (typeof o === 'number' ? { ira: o } : o));
  const desc = [...normalized].sort((a, b) => b.ira - a.ira);
  // How many others sit strictly above x (desc is sorted, so stop early).
  const above = (x: number) => {
    let n = 0;
    while (n < desc.length && desc[n].ira > x) n++;
    return n;
  };

  const you: RankingRow = {
    position: above(myIra) + 1,
    ira: myIra,
    ingresso: myIngresso ?? undefined,
    isYou: true,
  };
  const youInTop = you.position <= size;

  let rows: RankingRow[];
  if (youInTop) {
    // You go before anyone you tie with — same position, listed first.
    const merged = [
      ...desc.slice(0, you.position - 1),
      { ira: myIra, ingresso: myIngresso ?? undefined },
      ...desc.slice(you.position - 1),
    ];
    rows = merged.slice(0, size).map((item, i) =>
      i === you.position - 1
        ? you
        : {
            position: above(item.ira) + (myIra > item.ira ? 1 : 0) + 1,
            ira: item.ira,
            ingresso: item.ingresso,
            isYou: false,
          },
    );
  } else {
    rows = desc.slice(0, size).map((item) => ({
      position: above(item.ira) + 1,
      ira: item.ira,
      ingresso: item.ingresso,
      isYou: false,
    }));
  }

  let nextStep: Ranking['nextStep'];
  if (you.position > 1) {
    let next = Number.POSITIVE_INFINITY;
    for (const v of desc) if (v.ira > myIra && v.ira < next) next = v.ira;
    if (Number.isFinite(next)) nextStep = { ira: next, places: you.position - (above(next) + 1) };
  }

  return {
    rows,
    you,
    total: desc.length + 1,
    youInTop,
    podiumIra: youInTop || desc.length < size ? undefined : desc[size - 1].ira,
    nextStep,
  };
}

// ── graduation forecast ─────────────────────────────────────────────────

/** IRA band start ("8.0", width 0.5) → semesters-to-graduate → count. */
export type GraduationTable = Record<string, Record<string, number>>;

export interface GraduationForecast {
  n: number;
  median: number;
  q1: number;
  q3: number;
  /** [semesters, count], ascending. */
  counts: [number, number][];
  /** IRA range actually pooled. */
  from: number;
  to: number;
}

/** Semesters-to-graduate of formados whose IRA was within ±`window` of
 * `ira` (pooling whole 0.5 bands). Null below MIN_GROUP_SIZE. */
export function graduationForecast(table: GraduationTable | undefined, ira: number, window = 0.5): GraduationForecast | null {
  if (!table) return null;
  const pooled = new Map<number, number>();
  let from = Number.POSITIVE_INFINITY;
  let to = Number.NEGATIVE_INFINITY;
  for (const [band, durations] of Object.entries(table)) {
    const start = Number(band);
    if (Math.abs(start + 0.25 - ira) > window) continue;
    from = Math.min(from, start);
    to = Math.max(to, start + 0.5);
    for (const [d, c] of Object.entries(durations)) pooled.set(Number(d), (pooled.get(Number(d)) ?? 0) + c);
  }
  const counts = [...pooled.entries()].sort((a, b) => a[0] - b[0]);
  const expanded = counts.flatMap(([d, c]) => Array<number>(c).fill(d));
  if (expanded.length < MIN_GROUP_SIZE) return null;
  return {
    n: expanded.length,
    median: quantile(expanded, 0.5),
    q1: quantile(expanded, 0.25),
    q3: quantile(expanded, 0.75),
    counts,
    from,
    to: Math.min(10, to),
  };
}

// ── IRA along the course ────────────────────────────────────────────────

export interface StagePoint {
  /** Semesters attended (the last bucket is `maxStage`+). */
  stage: number;
  n: number;
  mean: number;
  q1: number;
  q3: number;
}

/** IRA of ativos grouped by how many semesters they've attended. */
export function iraByStage(students: CampusStudent[], reference: string, maxStage = 12): StagePoint[] {
  const groups = new Map<number, number[]>();
  for (const s of students) {
    if (s.status !== 'ativo') continue;
    const attended = semestersAttended(s.ingresso, reference);
    if (attended === null) continue;
    const stage = Math.min(attended, maxStage);
    const list = groups.get(stage) ?? [];
    list.push(s.ira);
    groups.set(stage, list);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .flatMap(([stage, iras]) => {
      const sum = summarize(iras);
      if (!sum || sum.n < MIN_GROUP_SIZE) return [];
      return [{ stage, n: sum.n, mean: sum.mean, q1: sum.q1, q3: sum.q3 }];
    });
}

export interface PercentileStage {
  label: string;
  n: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  atMyPct: number;
}

export interface CourseTrajectory {
  stages: PercentileStage[];
  graduated: PercentileStage | null;
}

const STAGE_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: '1–2º sem', min: 1, max: 2 },
  { label: '3–4º sem', min: 3, max: 4 },
  { label: '5–6º sem', min: 5, max: 6 },
  { label: '7–8º sem', min: 7, max: 8 },
  { label: '9º+ sem', min: 9, max: 99 },
];

function buildPercentileStage(label: string, values: number[], pct01: number): PercentileStage | null {
  if (values.length < MIN_GROUP_SIZE) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    label,
    n: sorted.length,
    p25: quantile(sorted, 0.25),
    p50: quantile(sorted, 0.5),
    p75: quantile(sorted, 0.75),
    p90: quantile(sorted, 0.9),
    atMyPct: quantile(sorted, Math.max(0, Math.min(1, pct01))),
  };
}

/**
 * Tracks percentile bands (P25, P50, P75, P90, plus the user's equivalent
 * percentile `pct01`) from early semesters through graduation.
 */
export function computeCourseTrajectory(
  students: CampusStudent[],
  course: string | null,
  reference: string,
  pct01: number,
): CourseTrajectory {
  const scoped = course ? students.filter((s) => s.course === course) : students;
  const ativos = scoped.filter((s) => s.status === 'ativo');
  const formados = scoped.filter((s) => s.status === 'formado').map((s) => s.ira);

  const stages: PercentileStage[] = [];
  for (const b of STAGE_BUCKETS) {
    const vals = ativos
      .filter((s) => {
        const sem = semestersAttended(s.ingresso, reference);
        return sem !== null && sem >= b.min && sem <= b.max;
      })
      .map((s) => s.ira);
    const stage = buildPercentileStage(b.label, vals, pct01);
    if (stage) stages.push(stage);
  }

  return {
    stages,
    graduated: buildPercentileStage('Formados', formados, pct01),
  };
}

export interface CohortSummary extends Summary {
  ingresso: string;
}

/** Active students grouped by `.1` ingresso cohort (plus `2007.2`). */
export function computeCourseCohorts(students: CampusStudent[], course: string | null): CohortSummary[] {
  const byIngresso = new Map<string, number[]>();
  for (const s of students) {
    if (s.status !== 'ativo') continue;
    if (course && s.course !== course) continue;
    if (!s.ingresso.endsWith('.1') && s.ingresso !== '2007.2') continue;
    const list = byIngresso.get(s.ingresso) ?? [];
    list.push(s.ira);
    byIngresso.set(s.ingresso, list);
  }
  return [...byIngresso.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .flatMap(([ingresso, vals]) => {
      const sum = summarize(vals);
      if (!sum || sum.n < MIN_GROUP_SIZE) return [];
      return [{ ingresso, ...sum }];
    });
}

// ── transcript ↔ campus dataset matching ───────────────────────────────

export interface StudentMatch {
  student: CampusStudent;
  diff: number;
  courseMatch: boolean;
  ingressoMatch: boolean;
}

/**
 * Finds campus records whose IRA matches `targetIra` within `tolerance`
 * (default 0.0005, covering 3–4 decimal rounding differences). Ranked by
 * closest IRA first, then matching course and ingresso.
 */
export function findStudentMatches(
  students: CampusStudent[],
  targetIra: number,
  context: RankingContext,
  tolerance = 0.0005,
): StudentMatch[] {
  const matches: StudentMatch[] = [];
  for (const student of students) {
    const diff = Math.abs(student.ira - targetIra);
    if (diff > tolerance) continue;
    matches.push({
      student,
      diff,
      courseMatch: Boolean(context.course && student.course === context.course),
      ingressoMatch: Boolean(context.ingresso && student.ingresso === context.ingresso),
    });
  }
  return matches.sort((a, b) => {
    if (Math.abs(a.diff - b.diff) > 1e-6) return a.diff - b.diff;
    if (a.courseMatch !== b.courseMatch) return a.courseMatch ? -1 : 1;
    if (a.ingressoMatch !== b.ingressoMatch) return a.ingressoMatch ? -1 : 1;
    return 0;
  });
}

/** Removes the first student matching `claimed` so a confirmed user isn't
 * counted twice in their own ranking. */
export function excludeClaimedStudent(students: CampusStudent[], claimed: CampusStudent | null): CampusStudent[] {
  if (!claimed) return students;
  let removed = false;
  return students.filter((s) => {
    if (
      !removed &&
      s.course === claimed.course &&
      s.ingresso === claimed.ingresso &&
      s.status === claimed.status &&
      s.ira === claimed.ira
    ) {
      removed = true;
      return false;
    }
    return true;
  });
}

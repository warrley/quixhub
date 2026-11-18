import {
  buildRanking,
  computeCourseCohorts,
  computeCourseTrajectory,
  excludeClaimedStudent,
  filterForRanking,
  findStudentMatches,
  histogram,
  inStatusGroup,
  iraByStage,
  kde,
  MIN_GROUP_SIZE,
  percentileBelow,
  quantile,
  rankingFilterBlocker,
  semestersAttended,
  summarize,
  type Bin,
  type CampusStatus,
  type CampusStudent,
  type CohortSummary,
  type CourseTrajectory,
  type Ranking,
  type RankingFilter,
  type StagePoint,
  type StatusGroup,
  type StudentMatch,
  type Summary,
} from '@/lib/iraCampus';
import { computeCourseMilestones, type CourseMilestone } from '@/lib/iraSimulator';
import { clampIra } from '@/lib/statistics';

export interface RawCampusExport {
  updatedAt: string;
  courses: string[];
  students: number[][];
}

export interface DecodedCampusDataset {
  updatedAt: string;
  courses: string[];
  students: CampusStudent[];
  ingressoOptions: string[];
}

export interface DistributionBinWithBelow extends Bin {
  belowInBin: number;
  pctAtStart: number;
}

export interface CampusSnapshotRequest {
  ira: number;
  referenceIra: number;
  ghostIra: number | null;
  predictedIra: number | null;
  course: string | null;
  myCourse: string | null;
  group: StatusGroup;
  rankingFilter: RankingFilter;
  podiumSize: 5 | 10;
  usePredictedRanking: boolean;
  ingresso: string | null;
  inferredIngresso: string | null;
  claimed: CampusStudent | null;
  hasPdf: boolean;
}

export interface CampusSnapshotResponse {
  available: boolean;
  updatedAt: string;
  courses: string[];
  ingressoOptions: string[];
  distribution: {
    summary: Summary | null;
    ativosSummary: Summary | null;
    totalCount: number;
    domainMin: number;
    belowDomain: number;
    dotBins: DistributionBinWithBelow[];
    barBins: DistributionBinWithBelow[];
    dotExpected: number[];
    barExpected: number[];
    percentile: number;
    rank: number;
    brownRank: number | null;
    brownPercentile: number | null;
    milestones: CourseMilestone[];
    cdfBins: number[];
  };
  ranking: {
    primary: Ranking | null;
    alt: Ranking | null;
    blocker: string | null;
    tooSmall: boolean;
  };
  projection: {
    pct01: number;
    stageLabel: string;
    trajectory: CourseTrajectory;
    cohorts: CohortSummary[];
  };
  insights: {
    survival: {
      ativosSummary: Summary | null;
      formadosSummary: Summary | null;
      dAtivos: number[];
      dFormados: number[];
    };
    stagePoints: StagePoint[];
    campusBenchmark: {
      course: string;
      n: number;
      q1: number;
      median: number;
      q3: number;
      pct: number;
    }[];
  };
  identityMatch: {
    best: StudentMatch | null;
  };
}

const STATUS: CampusStatus[] = ['ativo', 'formado', 'trancado'];
const CAP = 10;
const DOT_BIN = 0.2;
const BAR_BIN = 0.25;
const KDE_SAMPLES = 140;
const SURVIVAL_SAMPLES = 90;

export function decodeRawCampusExport(raw: RawCampusExport): DecodedCampusDataset {
  const students: CampusStudent[] = (raw.students as number[][]).map(([course, ingresso, status, ira]) => ({
    course: raw.courses[course],
    ingresso: `${Math.floor(ingresso / 10)}.${ingresso % 10}`,
    status: STATUS[status] ?? 'ativo',
    ira,
  }));

  const ingressoSet = new Set<string>();
  for (const s of students) {
    if (s.ingresso.endsWith('.1') || s.ingresso === '2007.2') ingressoSet.add(s.ingresso);
  }
  const ingressoOptions = [...ingressoSet].sort((a, b) => b.localeCompare(a));

  return {
    updatedAt: raw.updatedAt,
    courses: raw.courses,
    students,
    ingressoOptions,
  };
}

/** Fast client-side rank/percentile estimation from 100 aggregate 0.1-wide buckets. */
export function estimateFromCdfBins(cdfBins: number[], totalCount: number, targetIra: number): { rank: number; pct: number } {
  if (totalCount <= 0 || cdfBins.length === 0) return { rank: 1, pct: 0 };
  const clamped = Math.max(0, Math.min(10, targetIra));
  const idx = Math.min(cdfBins.length - 1, Math.floor(clamped * 10 + 1e-9));
  let below = 0;
  for (let i = 0; i < idx; i++) below += cdfBins[i];
  // Linearly interpolate within the current 0.1 bin
  const frac = clamped * 10 - idx;
  below += Math.round(cdfBins[idx] * Math.max(0, Math.min(1, frac)));
  below = Math.max(0, Math.min(totalCount, below));
  const above = Math.max(0, totalCount - below);
  return {
    rank: above + 1,
    pct: (below / totalCount) * 100,
  };
}

function groupValues(students: CampusStudent[], course: string | null, group: StatusGroup): number[] {
  return students
    .filter((s) => (course === null || s.course === course) && inStatusGroup(s.status, group))
    .map((s) => s.ira);
}

/**
 * Computes ONLY aggregate statistics, histogram bin counts, KDE curves,
 * top-N podium rows, and single best identity match on the server so no raw
 * student list is ever exposed to the browser.
 */
export function buildCampusSnapshot(
  dataset: DecodedCampusDataset,
  req: CampusSnapshotRequest,
): CampusSnapshotResponse {
  const { students, courses, updatedAt, ingressoOptions } = dataset;
  const displayIra = clampIra(req.ira);
  const brownMarkerIra =
    req.ghostIra !== null && req.ghostIra !== undefined
      ? clampIra(req.ghostIra)
      : req.predictedIra !== null && req.predictedIra !== undefined
        ? clampIra(req.predictedIra)
        : null;

  const values = groupValues(students, req.course, req.group);
  const summary = summarize(values);
  const ativosValues = req.course ? groupValues(students, req.course, 'ativos') : [];
  const ativosSummary = req.course ? summarize(ativosValues) : null;
  const enough = summary !== null && summary.n >= MIN_GROUP_SIZE;

  const sortedAsc = [...values].sort((a, b) => a - b);
  const domainMin = enough
    ? Math.max(0, Math.floor((Math.min(quantile(sortedAsc, 0.02), displayIra, brownMarkerIra ?? CAP) - 0.2) * 2) / 2)
    : 0;
  const inDomain = values.filter((v) => v >= domainMin);
  const belowDomain = values.length - inDomain.length;

  const xs = Array.from({ length: KDE_SAMPLES + 1 }, (_, i) => domainMin + (i / KDE_SAMPLES) * (CAP - domainMin));
  const density = enough ? kde(inDomain, xs) : xs.map(() => 0);

  const mapBins = (binWidth: number): DistributionBinWithBelow[] =>
    histogram(inDomain, binWidth, domainMin, CAP).map((b) => {
      const belowInBin =
        b.end <= displayIra + 1e-9 && b.end < CAP - 1e-9
          ? b.count
          : b.start >= displayIra
            ? 0
            : inDomain.filter((v) => v >= b.start && v < b.end && v < displayIra).length;
      return {
        ...b,
        belowInBin,
        pctAtStart: percentileBelow(values, b.start),
      };
    });

  const dotBins = enough ? mapBins(DOT_BIN) : [];
  const barBins = enough ? mapBins(BAR_BIN) : [];
  const dotExpected = density.map((d) => d * inDomain.length * DOT_BIN);
  const barExpected = density.map((d) => d * inDomain.length * BAR_BIN);

  const percentile = percentileBelow(values, displayIra);
  const rank = values.filter((v) => v > displayIra).length + 1;
  const brownRank = brownMarkerIra !== null ? values.filter((v) => v > brownMarkerIra).length + 1 : null;
  const brownPercentile = brownMarkerIra !== null ? percentileBelow(values, brownMarkerIra) : null;

  const cdfBins = Array.from({ length: 100 }, () => 0);
  for (const v of values) {
    const idx = Math.min(99, Math.max(0, Math.floor(v * 10 + 1e-9)));
    cdfBins[idx]++;
  }

  const milestones = computeCourseMilestones(values, displayIra);

  // Ranking
  const me = { course: req.myCourse, ingresso: req.ingresso };
  const blocker = rankingFilterBlocker(req.rankingFilter, me);
  const pool = excludeClaimedStudent(students, req.claimed);
  const filteredGroup = filterForRanking(pool, req.rankingFilter, me);
  const mappedGroup = filteredGroup.map((s) => ({ ira: s.ira, ingresso: s.ingresso }));
  const tooSmall = !blocker && filteredGroup.length < MIN_GROUP_SIZE;

  const hasPredRanking = req.predictedIra !== null && Math.abs(req.predictedIra - displayIra) > 1e-6;
  const primaryIra = hasPredRanking && req.usePredictedRanking ? clampIra(req.predictedIra!) : displayIra;
  const altIra = hasPredRanking ? (req.usePredictedRanking ? displayIra : clampIra(req.predictedIra!)) : null;

  const primaryRanking =
    !blocker && !tooSmall ? buildRanking(mappedGroup, primaryIra, req.podiumSize, req.ingresso) : null;
  const altRanking =
    !blocker && !tooSmall && altIra !== null ? buildRanking(mappedGroup, altIra, req.podiumSize, req.ingresso) : null;

  // Course Projection
  const courseAtivos = groupValues(students, req.course, 'ativos');
  const sem = req.ingresso ? semestersAttended(req.ingresso, updatedAt) : null;
  let pct01 = percentileBelow(courseAtivos, displayIra) / 100;
  let stageLabel = 'curso';
  if (sem !== null) {
    const stagePool = students
      .filter((s) => {
        if (s.status !== 'ativo') return false;
        if (req.course && s.course !== req.course) return false;
        const att = semestersAttended(s.ingresso, updatedAt);
        return att !== null && Math.abs(att - sem) <= 1;
      })
      .map((s) => s.ira);
    if (stagePool.length >= 10) {
      pct01 = percentileBelow(stagePool, displayIra) / 100;
      stageLabel = `${sem}º sem.`;
    }
  }
  const trajectory = computeCourseTrajectory(students, req.course, updatedAt, pct01);
  const cohorts = computeCourseCohorts(students, req.course).slice(0, 8);

  // Insights
  const survAtivos = groupValues(students, req.course, 'ativos');
  const survFormados = groupValues(students, req.course, 'formados');
  const sAtivos = summarize(survAtivos);
  const sFormados = summarize(survFormados);
  const hasBothSurv =
    sAtivos !== null && sAtivos.n >= MIN_GROUP_SIZE && sFormados !== null && sFormados.n >= MIN_GROUP_SIZE;
  const survXs = Array.from({ length: SURVIVAL_SAMPLES + 1 }, (_, i) => 3 + (i / SURVIVAL_SAMPLES) * 7);
  const dAtivos = hasBothSurv ? kde(survAtivos, survXs) : [];
  const dFormados = hasBothSurv ? kde(survFormados, survXs) : [];

  const scopedPool = req.course ? students.filter((s) => s.course === req.course) : students;
  const stagePoints = iraByStage(scopedPool, updatedAt, 14);

  const campusBenchmark = courses
    .map((c) => {
      const vals = groupValues(students, c, 'ativos');
      const s = summarize(vals);
      return {
        course: c,
        n: s?.n ?? 0,
        q1: s?.q1 ?? 0,
        median: s?.median ?? 0,
        q3: s?.q3 ?? 0,
        pct: vals.length > 0 ? percentileBelow(vals, displayIra) : 0,
      };
    })
    .sort((a, b) => b.median - a.median);

  // Identity Match (single best candidate)
  const matches =
    req.hasPdf && !req.claimed
      ? findStudentMatches(students, clampIra(req.referenceIra), {
          course: req.myCourse,
          ingresso: req.inferredIngresso,
        })
      : [];

  return {
    available: true,
    updatedAt,
    courses,
    ingressoOptions,
    distribution: {
      summary,
      ativosSummary,
      totalCount: values.length,
      domainMin,
      belowDomain,
      dotBins,
      barBins,
      dotExpected,
      barExpected,
      percentile,
      rank,
      brownRank,
      brownPercentile,
      milestones,
      cdfBins,
    },
    ranking: {
      primary: primaryRanking,
      alt: altRanking,
      blocker,
      tooSmall,
    },
    projection: {
      pct01,
      stageLabel,
      trajectory,
      cohorts,
    },
    insights: {
      survival: {
        ativosSummary: sAtivos,
        formadosSummary: sFormados,
        dAtivos,
        dFormados,
      },
      stagePoints,
      campusBenchmark,
    },
    identityMatch: {
      best: matches[0] ?? null,
    },
  };
}

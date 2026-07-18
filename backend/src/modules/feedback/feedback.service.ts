import { createHash } from 'node:crypto';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { feedback, offerings } from '../../db/schema.js';

export interface FeedbackInput {
  materialQuality?: number;
  examDifficulty?: number;
  workDifficulty?: number;
  attendance?: string;
  groupWork?: string;
  comment?: string;
}

// Irreversible without FEEDBACK_SALT (server-only secret) — this is the only
// link between a student and their vote, and it is never stored elsewhere.
function voterHash(userId: string, offeringId: string) {
  const salt = process.env.FEEDBACK_SALT;
  if (!salt) throw new Error('FEEDBACK_SALT is not set');
  return createHash('sha256').update(`${userId}${offeringId}${salt}`).digest('hex');
}

export async function submitFeedback(userId: string, offeringId: string, input: FeedbackInput) {
  const hash = voterHash(userId, offeringId);
  const [row] = await db
    .insert(feedback)
    .values({ offeringId, voterHash: hash, ...input })
    .onConflictDoUpdate({
      target: [feedback.offeringId, feedback.voterHash],
      set: input,
    })
    .returning();
  return row;
}

function average(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function mode(values: (string | null)[]): string | null {
  const present = values.filter((v): v is string => v !== null);
  if (present.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of present) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function summarize(rows: (typeof feedback.$inferSelect)[]) {
  return {
    materialQuality: average(rows.map((r) => r.materialQuality)) ?? 0,
    examDifficulty: average(rows.map((r) => r.examDifficulty)) ?? 0,
    workDifficulty: average(rows.map((r) => r.workDifficulty)) ?? 0,
    attendance: mode(rows.map((r) => r.attendance)) ?? '',
    groupWork: mode(rows.map((r) => r.groupWork)) ?? '',
    totalReviews: rows.length,
  };
}

export async function getOfferingStats(offeringId: string) {
  const rows = await db.query.feedback.findMany({ where: eq(feedback.offeringId, offeringId) });
  return summarize(rows);
}

export async function getComments(offeringId: string) {
  const rows = await db.query.feedback.findMany({
    where: and(eq(feedback.offeringId, offeringId), isNotNull(feedback.comment)),
    orderBy: (f, { desc }) => desc(f.createdAt),
  });
  return rows.map((r) => ({ comment: r.comment as string, createdAt: r.createdAt.toISOString() }));
}

// Aggregates by professor — every offering of this discipline, across
// semesters, grouped so the catalog can show "ED com David Sena: 3.8".
export async function getDisciplineStats(disciplineId: string) {
  const disciplineOfferings = await db.query.offerings.findMany({
    where: eq(offerings.disciplineId, disciplineId),
  });

  const byProfessor = new Map<string, typeof disciplineOfferings>();
  for (const o of disciplineOfferings) {
    const list = byProfessor.get(o.professor) ?? [];
    list.push(o);
    byProfessor.set(o.professor, list);
  }

  const result = [];
  for (const [professor, profOfferings] of byProfessor) {
    const rows = (
      await Promise.all(
        profOfferings.map((o) => db.query.feedback.findMany({ where: eq(feedback.offeringId, o.id) })),
      )
    ).flat();
    if (rows.length === 0) continue;
    result.push({
      professor,
      stats: summarize(rows),
      semesters: [...new Set(profOfferings.map((o) => o.semester))],
    });
  }
  return result;
}

// Same aggregation as getDisciplineStats, but for many disciplines in one
// round trip (2 queries total instead of N) — used by the Opiniões list,
// which otherwise fires one request per visible discipline.
export async function getDisciplineStatsBulk(disciplineIds: string[]) {
  const result: Record<string, { professor: string; stats: ReturnType<typeof summarize>; semesters: string[] }[]> = {};
  if (disciplineIds.length === 0) return result;

  const relevantOfferings = await db.query.offerings.findMany({
    where: inArray(offerings.disciplineId, disciplineIds),
  });
  const offeringIds = relevantOfferings.map((o) => o.id);
  const rows = offeringIds.length ? await db.query.feedback.findMany({ where: inArray(feedback.offeringId, offeringIds) }) : [];

  const feedbackByOffering = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = feedbackByOffering.get(r.offeringId) ?? [];
    list.push(r);
    feedbackByOffering.set(r.offeringId, list);
  }

  for (const disciplineId of disciplineIds) {
    const disciplineOfferings = relevantOfferings.filter((o) => o.disciplineId === disciplineId);
    const byProfessor = new Map<string, typeof disciplineOfferings>();
    for (const o of disciplineOfferings) {
      const list = byProfessor.get(o.professor) ?? [];
      list.push(o);
      byProfessor.set(o.professor, list);
    }

    const professors = [];
    for (const [professor, profOfferings] of byProfessor) {
      const profRows = profOfferings.flatMap((o) => feedbackByOffering.get(o.id) ?? []);
      if (profRows.length === 0) continue;
      professors.push({
        professor,
        stats: summarize(profRows),
        semesters: [...new Set(profOfferings.map((o) => o.semester))],
      });
    }
    result[disciplineId] = professors;
  }
  return result;
}

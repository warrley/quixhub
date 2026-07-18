import { and, avg, count, eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { disciplines, feedback, materials, offerings } from '../../db/schema.js';

type DisciplineRow = typeof disciplines.$inferSelect;
type NewDiscipline = typeof disciplines.$inferInsert;

async function withAggregates(row: DisciplineRow) {
  const [materialsCount] = await db
    .select({ value: count() })
    .from(materials)
    .where(and(eq(materials.disciplineId, row.id), eq(materials.status, 'published')));

  // "rating" aggregates material-quality across every offering (professor +
  // semester) of this discipline — the discipline-level layer of the 3-layer
  // aggregation (discipline / professor / semester).
  const [feedbackAgg] = await db
    .select({ responses: count(), rating: avg(feedback.materialQuality) })
    .from(feedback)
    .innerJoin(offerings, eq(feedback.offeringId, offerings.id))
    .where(eq(offerings.disciplineId, row.id));

  const rating = feedbackAgg?.rating ? Number(feedbackAgg.rating) : 0;

  return {
    ...row,
    materialsCount: materialsCount?.value ?? 0,
    responses: feedbackAgg?.responses ?? 0,
    rating: Math.round(rating * 10) / 10,
    ratingLevel: Math.max(1, Math.min(5, Math.round(rating) || 1)) as 1 | 2 | 3 | 4 | 5,
  };
}

export async function listDisciplines() {
  const rows = await db.query.disciplines.findMany({ orderBy: (d, { asc }) => asc(d.name) });
  return Promise.all(rows.map(withAggregates));
}

export async function getDisciplineById(id: string) {
  const row = await db.query.disciplines.findFirst({ where: eq(disciplines.id, id) });
  if (!row) return null;
  return withAggregates(row);
}

export async function createDiscipline(input: NewDiscipline) {
  const [row] = await db.insert(disciplines).values(input).returning();
  return row;
}

export async function updateDiscipline(id: string, input: Partial<NewDiscipline>) {
  const [row] = await db.update(disciplines).set(input).where(eq(disciplines.id, id)).returning();
  return row ?? null;
}

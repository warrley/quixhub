import { and, count, eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { materialHelpfulVotes, materials } from '../../db/schema.js';

type NewMaterial = typeof materials.$inferInsert;

async function withDerived(row: typeof materials.$inferSelect & { uploader: { name: string } }) {
  const [helpful] = await db
    .select({ value: count() })
    .from(materialHelpfulVotes)
    .where(eq(materialHelpfulVotes.materialId, row.id));

  return {
    id: row.id,
    disciplineId: row.disciplineId,
    type: row.type,
    title: row.title,
    fileKind: row.fileKind,
    note: row.note,
    helpfulCount: helpful?.value ?? 0,
    addedAt: row.createdAt.toISOString().slice(0, 10),
    anonymous: row.anonymous,
    uploader: row.anonymous ? undefined : row.uploader.name,
    status: row.status,
  };
}

export async function listPublishedByDiscipline(disciplineId: string) {
  const rows = await db.query.materials.findMany({
    where: and(eq(materials.disciplineId, disciplineId), eq(materials.status, 'published')),
    with: { uploader: true },
    orderBy: (m, { desc }) => desc(m.createdAt),
  });
  return Promise.all(rows.map(withDerived));
}

export async function listPending() {
  const rows = await db.query.materials.findMany({
    where: eq(materials.status, 'pending'),
    with: { uploader: true },
    orderBy: (m, { asc }) => asc(m.createdAt),
  });
  return Promise.all(rows.map(withDerived));
}

export async function getMaterialById(id: string) {
  return db.query.materials.findFirst({ where: eq(materials.id, id) });
}

export async function createMaterial(input: NewMaterial) {
  const [row] = await db.insert(materials).values(input).returning();
  return row;
}

export async function setMaterialStatus(id: string, status: 'published' | 'rejected') {
  const [row] = await db.update(materials).set({ status }).where(eq(materials.id, id)).returning();
  return row ?? null;
}

export async function markHelpful(materialId: string, userId: string) {
  await db
    .insert(materialHelpfulVotes)
    .values({ materialId, userId })
    .onConflictDoNothing({ target: [materialHelpfulVotes.materialId, materialHelpfulVotes.userId] });
}

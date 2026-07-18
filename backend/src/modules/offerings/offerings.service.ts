import { and, eq, ilike, or } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { disciplines, offerings } from '../../db/schema.js';

export async function listByDiscipline(disciplineId: string) {
  return db.query.offerings.findMany({
    where: eq(offerings.disciplineId, disciplineId),
    orderBy: (o, { desc }) => desc(o.semester),
  });
}

export async function search(query: string) {
  const rows = await db
    .select({
      id: offerings.id,
      disciplineId: offerings.disciplineId,
      professor: offerings.professor,
      semester: offerings.semester,
      disciplineName: disciplines.name,
      disciplineCode: disciplines.code,
      disciplineAccent: disciplines.accent,
    })
    .from(offerings)
    .innerJoin(disciplines, eq(offerings.disciplineId, disciplines.id))
    .where(or(ilike(disciplines.name, `%${query}%`), ilike(offerings.professor, `%${query}%`)))
    .orderBy(disciplines.name);
  return rows;
}

export async function getById(offeringId: string) {
  return db.query.offerings.findFirst({
    where: eq(offerings.id, offeringId),
    with: { discipline: true },
  });
}

// Lets a student give feedback for a discipline+professor+semester combo
// that hasn't been seeded/imported yet — creates the offering on first use
// instead of requiring an admin import first.
export async function findOrCreateOffering(disciplineId: string, professor: string, semester: string) {
  const existing = await db.query.offerings.findFirst({
    where: and(eq(offerings.disciplineId, disciplineId), eq(offerings.professor, professor), eq(offerings.semester, semester)),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(offerings)
    .values({ disciplineId, professor, semester })
    .onConflictDoNothing({ target: [offerings.disciplineId, offerings.professor, offerings.semester] })
    .returning();
  if (created) return created;

  // Lost a race with a concurrent insert — the row exists now, fetch it.
  return db.query.offerings.findFirst({
    where: and(eq(offerings.disciplineId, disciplineId), eq(offerings.professor, professor), eq(offerings.semester, semester)),
  });
}

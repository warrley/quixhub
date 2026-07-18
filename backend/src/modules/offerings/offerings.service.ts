import { eq, ilike, or } from 'drizzle-orm';
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

import { db } from '../db/client.js';
import { disciplines, feedback, offerings, users } from '../db/schema.js';

let counter = 0;
function unique(prefix: string) {
  counter += 1;
  return `${prefix}-${counter}`;
}

export async function makeUser(overrides: Partial<typeof users.$inferInsert> = {}) {
  const id = unique('user');
  const [user] = await db
    .insert(users)
    .values({
      name: overrides.name ?? 'Test User',
      email: overrides.email ?? `${id}@alu.ufc.br`,
      passwordHash: overrides.passwordHash ?? 'not-a-real-hash',
      course: overrides.course ?? 'Engenharia de Software',
      role: overrides.role ?? 'student',
    })
    .returning();
  return user;
}

export async function makeDiscipline(overrides: Partial<typeof disciplines.$inferInsert> = {}) {
  const id = overrides.id ?? unique('discipline');
  const [discipline] = await db
    .insert(disciplines)
    .values({
      id,
      code: overrides.code ?? 'QXD0000',
      name: overrides.name ?? 'Test Discipline',
      workload: overrides.workload ?? 64,
      semester: overrides.semester ?? '2026.1',
      description: overrides.description ?? '',
      prerequisites: overrides.prerequisites ?? [],
      accent: overrides.accent ?? 'accent',
    })
    .returning();
  return discipline;
}

export async function makeOffering(overrides: Partial<typeof offerings.$inferInsert> & { disciplineId: string }) {
  const [offering] = await db
    .insert(offerings)
    .values({
      disciplineId: overrides.disciplineId,
      professor: overrides.professor ?? 'Test Professor',
      semester: overrides.semester ?? '2026.1',
    })
    .returning();
  return offering;
}

export async function makeFeedback(overrides: Partial<typeof feedback.$inferInsert> & { offeringId: string }) {
  const [row] = await db
    .insert(feedback)
    .values({
      offeringId: overrides.offeringId,
      voterHash: overrides.voterHash ?? unique('voter-hash'),
      materialQuality: overrides.materialQuality,
      examDifficulty: overrides.examDifficulty,
      workDifficulty: overrides.workDifficulty,
      attendance: overrides.attendance,
      groupWork: overrides.groupWork,
      comment: overrides.comment,
    })
    .returning();
  return row;
}

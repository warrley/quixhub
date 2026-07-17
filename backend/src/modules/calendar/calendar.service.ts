import { and, count, eq, gte, lt } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { calendarConfirmations, calendarEvents } from '../../db/schema.js';

type NewEvent = typeof calendarEvents.$inferInsert;

async function withDerived(row: typeof calendarEvents.$inferSelect, userId?: string) {
  const [confirmations] = await db
    .select({ value: count() })
    .from(calendarConfirmations)
    .where(eq(calendarConfirmations.eventId, row.id));

  const confirmed = userId
    ? !!(await db.query.calendarConfirmations.findFirst({
        where: and(eq(calendarConfirmations.eventId, row.id), eq(calendarConfirmations.userId, userId)),
      }))
    : false;

  return {
    id: row.id,
    disciplineId: row.disciplineId,
    title: row.title,
    date: row.date,
    kind: row.kind,
    linkedMaterialId: row.linkedMaterialId,
    confirmations: confirmations?.value ?? 0,
    confirmed,
  };
}

export async function listEvents(range: { from: string; to: string }, userId?: string) {
  const rows = await db.query.calendarEvents.findMany({
    where: and(gte(calendarEvents.date, range.from), lt(calendarEvents.date, range.to)),
    orderBy: (e, { asc }) => asc(e.date),
  });
  return Promise.all(rows.map((row) => withDerived(row, userId)));
}

export async function createEvent(input: NewEvent) {
  const [row] = await db.insert(calendarEvents).values(input).returning();
  return withDerived(row, input.createdById);
}

export async function setConfirmation(eventId: string, userId: string, confirmed: boolean) {
  if (confirmed) {
    await db.insert(calendarConfirmations).values({ eventId, userId }).onConflictDoNothing({
      target: [calendarConfirmations.eventId, calendarConfirmations.userId],
    });
  } else {
    await db
      .delete(calendarConfirmations)
      .where(and(eq(calendarConfirmations.eventId, eventId), eq(calendarConfirmations.userId, userId)));
  }
}

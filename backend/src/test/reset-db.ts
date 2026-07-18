import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';

// Called in beforeEach across test files — cheap enough at this table count,
// and keeps every test starting from a clean slate without cross-file order
// dependence.
export async function resetDb() {
  await db.execute(sql`TRUNCATE TABLE
    material_helpful_votes,
    calendar_confirmations,
    calendar_events,
    materials,
    feedback,
    offerings,
    disciplines,
    users
    RESTART IDENTITY CASCADE`);
}

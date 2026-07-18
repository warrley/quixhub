import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { TEST_ADMIN_DATABASE_URL, TEST_DATABASE_URL } from './env.js';

// Runs once for the whole test run (vitest `globalSetup`), in its own
// process — creates quixhub_test if missing and brings it to the latest
// migration, so test files never race each other setting up schema.
export default async function setup() {
  const admin = postgres(TEST_ADMIN_DATABASE_URL, { max: 1 });
  const dbName = new URL(TEST_DATABASE_URL).pathname.slice(1);
  const exists = await admin`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
  if (exists.length === 0) {
    await admin.unsafe(`CREATE DATABASE ${dbName}`);
  }
  await admin.end();

  const sql = postgres(TEST_DATABASE_URL, { max: 1 });
  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  await sql.end();
}

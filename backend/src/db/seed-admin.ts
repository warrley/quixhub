import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from './client.js';
import { users } from './schema.js';

const name = process.env.SEED_ADMIN_NAME;
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;

if (!name || !email || !password) {
  throw new Error('SEED_ADMIN_NAME, SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env');
}

const existing = await db.query.users.findFirst({ where: eq(users.email, email) });

if (existing) {
  console.log(`Admin user ${email} already exists — no-op.`);
} else {
  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(users).values({ name, email, passwordHash, role: 'admin', course: null });
  console.log(`Admin user ${email} created.`);
}

process.exit(0);

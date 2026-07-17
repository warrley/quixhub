import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { users } from '../../db/schema.js';

export async function findUserByEmail(email: string) {
  return db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
}

export async function findUserById(id: string) {
  return db.query.users.findFirst({ where: eq(users.id, id) });
}

export async function createUser(input: { name: string; email: string; password: string; course?: string }) {
  const passwordHash = await bcrypt.hash(input.password, 10);
  const [user] = await db
    .insert(users)
    .values({ name: input.name, email: input.email.toLowerCase(), passwordHash, course: input.course })
    .returning();
  return user;
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function toPublicUser(user: { id: string; name: string; email: string; course: string | null; role: string }) {
  return { id: user.id, name: user.name, email: user.email, course: user.course, role: user.role };
}

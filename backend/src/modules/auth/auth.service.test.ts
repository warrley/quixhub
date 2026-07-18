import { beforeEach, describe, expect, it } from 'vitest';
import { resetDb } from '../../test/reset-db.js';
import { createUser, findUserByEmail, findUserById, toPublicUser, verifyPassword } from './auth.service.js';

beforeEach(resetDb);

describe('createUser', () => {
  it('hashes the password rather than storing it as plain text', async () => {
    const user = await createUser({ name: 'Ana', email: 'Ana@Alu.UFC.br', password: 'senha1234' });

    expect(user.passwordHash).not.toBe('senha1234');
    expect(await verifyPassword('senha1234', user.passwordHash)).toBe(true);
    expect(await verifyPassword('wrong-password', user.passwordHash)).toBe(false);
  });

  it('lowercases the email on write', async () => {
    const user = await createUser({ name: 'Ana', email: 'Ana@Alu.UFC.br', password: 'senha1234' });
    expect(user.email).toBe('ana@alu.ufc.br');
  });
});

describe('findUserByEmail', () => {
  it('looks up case-insensitively', async () => {
    await createUser({ name: 'Ana', email: 'ana@alu.ufc.br', password: 'senha1234' });
    expect(await findUserByEmail('ANA@ALU.UFC.BR')).toBeDefined();
  });

  it('returns undefined for an unknown email', async () => {
    expect(await findUserByEmail('nobody@alu.ufc.br')).toBeUndefined();
  });
});

describe('findUserById', () => {
  it('round-trips a created user', async () => {
    const created = await createUser({ name: 'Ana', email: 'ana@alu.ufc.br', password: 'senha1234' });
    const found = await findUserById(created.id);
    expect(found?.email).toBe('ana@alu.ufc.br');
  });
});

describe('toPublicUser', () => {
  it('never leaks the password hash', () => {
    const publicUser = toPublicUser({
      id: '1',
      name: 'Ana',
      email: 'ana@alu.ufc.br',
      course: 'ES',
      role: 'student',
    });
    expect(publicUser).not.toHaveProperty('passwordHash');
    expect(publicUser).toEqual({ id: '1', name: 'Ana', email: 'ana@alu.ufc.br', course: 'ES', role: 'student' });
  });
});

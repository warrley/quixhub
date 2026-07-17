import { RequestHandler } from 'express';
import { z } from 'zod';
import { AUTH_COOKIE, signToken } from './auth.middleware.js';
import { createUser, findUserByEmail, toPublicUser, verifyPassword } from './auth.service.js';

const UFC_EMAIL = /^[^\s@]+@(alu\.)?ufc\.br$/i;

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().regex(UFC_EMAIL, 'E-mail deve ser institucional (@ufc.br ou @alu.ufc.br)'),
  password: z.string().min(8),
  course: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register: RequestHandler = async (req, res) => {
  const safeData = registerSchema.safeParse(req.body);
  if (!safeData.success) {
    res.status(400).json({ error: safeData.error.flatten().fieldErrors });
    return;
  }

  const input = safeData.data;
  const existing = await findUserByEmail(input.email);
  if (existing) {
    res.status(409).json({ error: 'E-mail já cadastrado' });
    return;
  }

  const user = await createUser(input);
  const token = signToken(user.id);
  res.cookie(AUTH_COOKIE, token, COOKIE_OPTIONS);
  res.status(201).json({ user: toPublicUser(user) });
};

export const login: RequestHandler = async (req, res) => {
  const safeData = loginSchema.safeParse(req.body);
  if (!safeData.success) {
    res.status(400).json({ error: safeData.error.flatten().fieldErrors });
    return;
  }

  const input = safeData.data;
  const user = await findUserByEmail(input.email);
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    res.status(401).json({ error: 'E-mail ou senha inválidos' });
    return;
  }

  const token = signToken(user.id);
  res.cookie(AUTH_COOKIE, token, COOKIE_OPTIONS);
  res.json({ user: toPublicUser(user) });
};

export const logout: RequestHandler = (req, res) => {
  res.clearCookie(AUTH_COOKIE);
  res.status(204).end();
};

export const me: RequestHandler = async (req, res) => {
  res.json({ user: req.user });
};

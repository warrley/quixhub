import { Router } from 'express';
import { z } from 'zod';
import { AppError, asyncHandler } from '../../lib/errors.js';
import { AUTH_COOKIE, requireAuth, signToken } from './auth.middleware.js';
import { createUser, findUserByEmail, toPublicUser, verifyPassword } from './auth.service.js';

export const authRouter = Router();

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

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);

    const existing = await findUserByEmail(input.email);
    if (existing) throw new AppError(409, 'E-mail já cadastrado');

    const user = await createUser(input);
    const token = signToken(user.id);
    res.cookie(AUTH_COOKIE, token, COOKIE_OPTIONS);
    res.status(201).json({ user: toPublicUser(user) });
  }),
);

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body);

    const user = await findUserByEmail(input.email);
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new AppError(401, 'E-mail ou senha inválidos');
    }

    const token = signToken(user.id);
    res.cookie(AUTH_COOKIE, token, COOKIE_OPTIONS);
    res.json({ user: toPublicUser(user) });
  }),
);

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE);
  res.status(204).end();
});

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  }),
);

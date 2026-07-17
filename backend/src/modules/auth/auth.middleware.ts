import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../../lib/errors.js';
import { findUserById } from './auth.service.js';

export const AUTH_COOKIE = 'quixhub_token';

interface TokenPayload {
  sub: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; name: string; email: string; course: string | null; role: string };
    }
  }
}

export function signToken(userId: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return jwt.sign({ sub: userId } satisfies TokenPayload, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'],
  });
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE] ?? req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return next(new AppError(401, 'Not authenticated'));

  const secret = process.env.JWT_SECRET;
  if (!secret) return next(new Error('JWT_SECRET is not set'));

  try {
    const payload = jwt.verify(token, secret) as TokenPayload;
    const user = await findUserById(payload.sub);
    if (!user) return next(new AppError(401, 'Not authenticated'));
    req.user = { id: user.id, name: user.name, email: user.email, course: user.course, role: user.role };
    next();
  } catch {
    next(new AppError(401, 'Not authenticated'));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') return next(new AppError(403, 'Admin access required'));
  next();
}

// Populates req.user when a valid token is present but never rejects —
// for routes that are public but personalize their response when logged in
// (e.g. GET /calendar's per-user `confirmed` flag).
export async function attachUserIfPresent(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[AUTH_COOKIE] ?? req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return next();

  const secret = process.env.JWT_SECRET;
  if (!secret) return next();

  try {
    const payload = jwt.verify(token, secret) as TokenPayload;
    const user = await findUserById(payload.sub);
    if (user) req.user = { id: user.id, name: user.name, email: user.email, course: user.course, role: user.role };
  } catch {
    // invalid/expired token on a public route — just proceed unauthenticated
  }
  next();
}

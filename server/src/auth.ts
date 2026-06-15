import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from './env.js';
import { User } from './models/User.js';

const COOKIE_NAME = 'jt_session';
const SINGLE_USER_EMAIL = 'mahesh@local';

export async function ensureSingleUser() {
  const existing = await User.findOne({ email: SINGLE_USER_EMAIL });
  if (existing) return existing;
  return User.create({ email: SINGLE_USER_EMAIL });
}

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: '30d' });
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME);
}

export interface AuthedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
}

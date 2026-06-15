import { Router } from 'express';
import { z } from 'zod';
import { env } from '../env.js';
import { ensureSingleUser, signToken, setAuthCookie, clearAuthCookie, requireAuth, AuthedRequest } from '../auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const parsed = z.object({ password: z.string() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'bad_request' });
  console.log('Login attempt:', { received: parsed.data.password, expected: env.APP_PASSWORD });
  if (parsed.data.password !== env.APP_PASSWORD) {
    return res.status(401).json({ error: 'invalid_password' });
  }
  const user = await ensureSingleUser();
  const token = signToken(String(user._id));
  setAuthCookie(res, token);
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req: AuthedRequest, res) => {
  res.json({ userId: req.userId });
});

export default router;

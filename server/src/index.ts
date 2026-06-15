import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { env } from './env.js';
import { connectDb } from './db.js';
import auth from './routes/auth.js';
import me from './routes/me.js';
import jobs from './routes/jobs.js';
import kit from './routes/kit.js';
import search from './routes/search.js';

async function main() {
  await connectDb();
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    })
  );

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/auth', auth);
  app.use('/me', me);
  app.use('/jobs', jobs);
  app.use('/search/jobs', search);
  app.use('/', kit);

  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error('[err]', err);
    res.status(500).json({ error: 'server_error' });
  });

  app.listen(env.PORT, () => {
    console.log(`[server] listening on :${env.PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

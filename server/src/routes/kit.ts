import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthedRequest } from '../auth.js';
import { Job } from '../models/Job.js';
import { User } from '../models/User.js';
import { Kit, KIT_KINDS } from '../models/Kit.js';
import { streamGenerate } from '../ai/openrouter.js';
import { buildPrompt } from '../ai/prompts.js';

const router = Router();
router.use(requireAuth);

const BodySchema = z.object({
  kind: z.enum(KIT_KINDS),
  model: z.string().optional(),
});

router.post('/jobs/:id/kit', async (req: AuthedRequest, res) => {
  const parsed = BodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'bad_request' });

  const job = await Job.findOne({ _id: req.params.id, userId: req.userId });
  if (!job) return res.status(404).json({ error: 'not_found' });
  const user = await User.findById(req.userId).lean();
  if (!user) return res.status(404).json({ error: 'no_user' });

  const model = parsed.data.model || user.defaultModel || undefined;
  const messages = buildPrompt(parsed.data.kind, {
    jdText: job.jdText,
    masterResume: user.masterResume,
    company: job.company,
    title: job.title,
  });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let full = '';
  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    for await (const chunk of streamGenerate(messages, model)) {
      full += chunk;
      send('delta', { text: chunk });
    }
    const kit = await Kit.create({
      jobId: job._id,
      userId: req.userId,
      kind: parsed.data.kind,
      content: full,
      model: model ?? 'default',
    });
    send('done', { id: String(kit._id), createdAt: kit.createdAt });
    res.end();
  } catch (err: any) {
    send('error', { message: err?.message ?? 'generation_failed' });
    res.end();
  }
});

export default router;

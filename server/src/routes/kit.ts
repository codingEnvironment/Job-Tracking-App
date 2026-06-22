import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthedRequest } from '../auth.js';
import { Job } from '../models/Job.js';
import { User } from '../models/User.js';
import { Kit, KIT_KINDS } from '../models/Kit.js';
import { streamGenerate, OpenRouterRetryableError } from '../ai/openrouter.js';
import { buildPrompt } from '../ai/prompts.js';
import { env } from '../env.js';

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

  // If the user explicitly picked a model (request body or stored default), try
  // it first then cascade through the env chain. Otherwise just use the chain.
  const userModel = parsed.data.model || user.defaultModel;
  const modelChain = userModel
    ? [userModel, ...env.OPENROUTER_KIT_MODELS.filter((m) => m !== userModel)]
    : [...env.OPENROUTER_KIT_MODELS];

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

  // Walk the chain: try each model in order. OpenRouterRetryableError (429 / 402)
  // is always thrown from streamGenerate's initial fetch response — *before* any
  // delta is yielded — so when we catch it here, `full` is still '' and switching
  // models cannot send mismatched chunks to the client. Any non-retryable error
  // (auth, 5xx, network, malformed payload) breaks the loop and bubbles up.
  let modelUsed = '';
  let streamed = false;
  let lastError: unknown = null;
  for (let i = 0; i < modelChain.length; i++) {
    const candidate = modelChain[i];
    try {
      for await (const chunk of streamGenerate(messages, candidate)) {
        full += chunk;
        send('delta', { text: chunk });
      }
      modelUsed = candidate;
      streamed = true;
      break;
    } catch (err) {
      lastError = err;
      const isRetryable = err instanceof OpenRouterRetryableError;
      const hasNext = i < modelChain.length - 1;
      if (isRetryable && hasNext) {
        const next = modelChain[i + 1];
        const reason = err.status === 429 ? 'rate-limited' : 'out of credit';
        send('info', { message: `${candidate} ${reason}, trying ${next}...` });
        continue;
      }
      break;
    }
  }

  if (!streamed) {
    const message =
      lastError instanceof Error ? lastError.message : 'generation_failed';
    send('error', { message });
    return res.end();
  }

  try {
    const kit = await Kit.create({
      jobId: job._id,
      userId: req.userId,
      kind: parsed.data.kind,
      content: full,
      model: modelUsed,
    });
    send('done', { id: String(kit._id), createdAt: kit.createdAt });
    res.end();
  } catch (err: any) {
    send('error', { message: err?.message ?? 'persist_failed' });
    res.end();
  }
});

export default router;

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthedRequest } from '../auth.js';
import { Job, STATUSES } from '../models/Job.js';
import { Kit } from '../models/Kit.js';
import { extractJobMeta } from '../ai/extract.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: AuthedRequest, res) => {
  const jobs = await Job.find({ userId: req.userId }).sort({ order: 1 }).lean();
  res.json(jobs);
});

const CreateSchema = z.object({
  jdText: z.string().min(20, 'paste a longer JD'),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  // When the caller already has clean metadata (e.g. from the live job search),
  // skip the LLM extraction step — it's slower and sometimes returns blanks.
  title: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
});

router.post('/', async (req: AuthedRequest, res) => {
  const parsed = CreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const hasClientMeta = !!(parsed.data.title?.trim() || parsed.data.company?.trim());
  const meta = hasClientMeta
    ? {
        title: parsed.data.title?.trim() ?? '',
        company: parsed.data.company?.trim() ?? '',
        location: parsed.data.location?.trim() ?? '',
      }
    : await extractJobMeta(parsed.data.jdText).catch(() => ({
        title: '',
        company: '',
        location: '',
      }));

  const maxOrder = await Job.findOne({ userId: req.userId, status: 'wishlist' })
    .sort({ order: -1 })
    .lean();
  const nextOrder = (maxOrder?.order ?? 0) + 1000;

  const job = await Job.create({
    userId: req.userId,
    jdText: parsed.data.jdText,
    sourceUrl: parsed.data.sourceUrl ?? '',
    title: meta.title,
    company: meta.company,
    location: meta.location,
    status: 'wishlist',
    order: nextOrder,
  });
  res.status(201).json(job.toJSON());
});

const UpdateSchema = z.object({
  title: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(STATUSES).optional(),
  order: z.number().optional(),
  jdText: z.string().optional(),
});

router.patch('/:id', async (req: AuthedRequest, res) => {
  const parsed = UpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const job = await Job.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    parsed.data,
    { new: true }
  ).lean();
  if (!job) return res.status(404).json({ error: 'not_found' });
  res.json(job);
});

router.delete('/:id', async (req: AuthedRequest, res) => {
  const result = await Job.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!result) return res.status(404).json({ error: 'not_found' });
  await Kit.deleteMany({ jobId: req.params.id });
  res.json({ ok: true });
});

router.get('/:id/kits', async (req: AuthedRequest, res) => {
  const job = await Job.findOne({ _id: req.params.id, userId: req.userId }).lean();
  if (!job) return res.status(404).json({ error: 'not_found' });
  const kits = await Kit.find({ jobId: job._id }).sort({ createdAt: -1 }).lean();
  res.json(kits);
});

export default router;

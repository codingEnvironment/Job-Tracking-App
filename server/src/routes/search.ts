import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthedRequest } from '../auth.js';
import { User } from '../models/User.js';
import { searchJobs } from '../ai/search.js';

const router = Router();
router.use(requireAuth);

const FiltersSchema = z.object({
  location: z.string().optional(),
  remote: z.boolean().default(false),
  role: z.string().optional(),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
});

router.post('/', async (req: AuthedRequest, res) => {
  const parsed = FiltersSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'bad_request' });

  const { location, remote } = parsed.data;
  if (!remote && !location?.trim()) {
    return res.status(400).json({ error: 'location_required', message: 'Provide a location or enable Remote.' });
  }

  const user = await User.findById(req.userId).lean();
  if (!user) return res.status(404).json({ error: 'not_found' });

  try {
    const results = await searchJobs(user.masterResume, parsed.data);
    res.json(results);
  } catch (err: any) {
    console.error('[search]', err?.message);
    res.status(502).json({ error: 'search_failed', message: err?.message ?? 'Search failed' });
  }
});

export default router;

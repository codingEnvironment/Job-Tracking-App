import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import mammoth from 'mammoth';
import { extractText as extractPdfText, getDocumentProxy } from 'unpdf';
import { requireAuth, AuthedRequest } from '../auth.js';
import { User } from '../models/User.js';

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

async function extractText(buf: Buffer, filename: string, mimetype: string): Promise<string> {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  if (ext === 'pdf' || mimetype === 'application/pdf') {
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractPdfText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join('\n') : text;
  }
  if (
    ext === 'docx' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const out = await mammoth.extractRawText({ buffer: buf });
    return out.value;
  }
  if (ext === 'txt' || ext === 'md' || mimetype.startsWith('text/')) {
    return buf.toString('utf-8');
  }
  throw new Error('unsupported_file_type');
}

router.get('/', async (req: AuthedRequest, res) => {
  const user = await User.findById(req.userId).lean();
  if (!user) return res.status(404).json({ error: 'not_found' });
  res.json({
    email: user.email,
    masterResume: user.masterResume,
    defaultModel: user.defaultModel,
  });
});

const UpdateSchema = z.object({
  masterResume: z.string().optional(),
  defaultModel: z.string().optional(),
});

router.post('/resume', upload.single('file'), async (req: AuthedRequest, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });
  try {
    const text = await extractText(req.file.buffer, req.file.originalname, req.file.mimetype);
    const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (!cleaned) return res.status(422).json({ error: 'empty_extraction' });
    const user = await User.findByIdAndUpdate(
      req.userId,
      { masterResume: cleaned },
      { new: true }
    ).lean();
    res.json({
      email: user!.email,
      masterResume: user!.masterResume,
      defaultModel: user!.defaultModel,
      filename: req.file.originalname,
      chars: cleaned.length,
    });
  } catch (e: any) {
    const msg = e?.message === 'unsupported_file_type' ? 'unsupported_file_type' : 'extract_failed';
    res.status(400).json({ error: msg });
  }
});

router.put('/', async (req: AuthedRequest, res) => {
  const parsed = UpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'bad_request' });
  const user = await User.findByIdAndUpdate(req.userId, parsed.data, { new: true }).lean();
  res.json({
    email: user!.email,
    masterResume: user!.masterResume,
    defaultModel: user!.defaultModel,
  });
});

export default router;

import { generate } from './openrouter.js';
import { env } from '../env.js';

const SYSTEM = `You extract structured fields from a job posting. Reply ONLY with minified JSON of shape:
{"title": string, "company": string, "location": string}
Use empty string if a field is not present. No code fences. No commentary.`;

export async function extractJobMeta(jdText: string) {
  const truncated = jdText.slice(0, 6000);
  const out = await generate(
    [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: truncated },
    ],
    env.OPENROUTER_EXTRACT_MODEL
  );
  const cleaned = out.trim().replace(/^```json|```$/g, '').trim();
  try {
    const obj = JSON.parse(cleaned);
    return {
      title: String(obj.title ?? '').slice(0, 200),
      company: String(obj.company ?? '').slice(0, 200),
      location: String(obj.location ?? '').slice(0, 200),
    };
  } catch {
    return { title: '', company: '', location: '' };
  }
}

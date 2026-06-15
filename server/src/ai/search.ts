import { generate } from './openrouter.js';
import { env } from '../env.js';

export interface SearchFilters {
  location?: string;
  remote: boolean;
  role?: string;
  salaryMin?: string;
  salaryMax?: string;
}

export interface JobResult {
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salary: string;
  url: string;
  description: string;
  source: string;
  postedAt: string;
}

// Resolved from env. Default is perplexity/sonar (current Perplexity live-web model on OpenRouter).
// Override via OPENROUTER_SEARCH_MODEL — must be a model with native web access.
const SEARCH_MODEL = env.OPENROUTER_SEARCH_MODEL;

export async function searchJobs(
  masterResume: string,
  filters: SearchFilters
): Promise<JobResult[]> {
  const resumeSnippet = masterResume.trim().slice(0, 3000);

  const locationClause = filters.remote
    ? filters.location
      ? `remote or based in ${filters.location}`
      : 'remote'
    : `in ${filters.location || 'any location'}`;

  const roleClause = filters.role?.trim()
    ? `for the role: ${filters.role.trim()}`
    : 'matching the candidate profile below';

  const salaryClause =
    filters.salaryMin || filters.salaryMax
      ? `Salary range: ${filters.salaryMin || 'any'} – ${filters.salaryMax || 'any'}.`
      : '';

  const system = `You are a job search assistant with live web access. Search LinkedIn Jobs, Indeed, Glassdoor, Naukri, and similar job boards for REAL, currently open job postings.

Return ONLY a valid JSON array — no markdown fences, no commentary, no text before or after the array.

Each element must match this exact shape:
{
  "title": string,
  "company": string,
  "location": string,
  "remote": boolean,
  "salary": string,
  "url": string,
  "description": string (2-3 sentence summary of the role),
  "source": string (e.g. "LinkedIn", "Indeed", "Naukri", "Glassdoor"),
  "postedAt": string (e.g. "3 days ago", "2 weeks ago", or an ISO date like "2026-05-15")
}

HARD REQUIREMENTS — omit any result that fails any of these:
- "title" must be a specific job title (not "Software role" or "various positions").
- "company" must be the real hiring company's name. Never write "Unknown", "Various", "Confidential", or leave blank.
- "url" must be a direct link to the live posting on the source job board. Do NOT fabricate URLs. If you cannot cite the actual posting URL from your search results, drop that job from the response.
- "postedAt" must reflect when the posting first went live, taken from the source page (LinkedIn/Indeed/Naukri/Glassdoor all show this). Only return postings made within the LAST 30 DAYS. If you cannot determine the posting date from the source, OR the posting is older than 30 days, DROP that job. Stale listings — even if the company still has the link live — are not useful. Do not invent dates.

For "salary" use an empty string if unknown — never null, never "Unknown".
Return 8–12 high-quality results that all satisfy the requirements above. Quality matters more than quantity — better to return 6 verified, fresh postings than 12 half-known or stale ones.`;

  const user = `Search for current job openings ${roleClause}, ${locationClause}. ${salaryClause}

Candidate profile (use this to match relevant skills and seniority):
${resumeSnippet || '(no resume provided — infer from role and location only)'}`;

  // 4000 tokens: 10-15 job results as JSON easily exceeds the default 800-token cap
  const raw = await generate(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    SEARCH_MODEL,
    4000
  );

  return parseResults(raw);
}

// Parse a `postedAt` string into an approximate age in days.
// Handles "X minutes/hours/days/weeks/months/years ago", "today" / "yesterday" /
// "just posted", and ISO/parseable date strings. Returns null when nothing
// matches — caller treats that as "unknown" and drops the result.
function postedDaysAgo(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  if (/(just\s*(now|posted)|today|few\s+(minutes|hours))/.test(s)) return 0;
  if (/yesterday/.test(s)) return 1;
  if (/\b\d+\s*(minute|hour)s?\b/.test(s)) return 0;

  const num = (re: RegExp) => {
    const m = s.match(re);
    return m ? parseInt(m[1], 10) : null;
  };
  const d = num(/\b(\d+)\s*day/);
  if (d !== null) return d;
  const w = num(/\b(\d+)\s*week/);
  if (w !== null) return w * 7;
  const mo = num(/\b(\d+)\s*month/);
  if (mo !== null) return mo * 30;
  const y = num(/\b(\d+)\s*year/);
  if (y !== null) return y * 365;

  const t = Date.parse(raw);
  if (!isNaN(t)) {
    const days = Math.floor((Date.now() - t) / 86_400_000);
    return days >= 0 ? days : null;
  }
  return null;
}

// Drop results older than this many days. Looser than the prompt's 30-day
// requirement so we don't nuke borderline-fresh postings; "a year ago" — the
// real complaint that drove this filter — is well outside the window.
const MAX_AGE_DAYS = 60;

function parseResults(raw: string): JobResult[] {
  // Strip any accidental markdown fences
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();

  // Find the JSON array within the response even if there's surrounding text
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1) return [];

  try {
    const arr = JSON.parse(cleaned.slice(start, end + 1));
    if (!Array.isArray(arr)) return [];
    return arr
      .map((item: any) => ({
        title: String(item.title ?? '').trim(),
        company: String(item.company ?? '').trim(),
        location: String(item.location ?? '').trim(),
        remote: Boolean(item.remote),
        salary: String(item.salary ?? '').trim(),
        url: String(item.url ?? '').trim(),
        description: String(item.description ?? '').trim(),
        source: String(item.source ?? '').trim(),
        postedAt: String(item.postedAt ?? '').trim(),
      }))
      .filter((j) => {
        // Title + company sanity check (the "Untitled role / Unknown company" guard).
        if (!j.title || !j.company || /^unknown|^various|^n\/a$/i.test(j.company)) return false;
        // Freshness: missing postedAt or anything older than the window is dropped.
        const age = postedDaysAgo(j.postedAt);
        if (age === null) return false;
        if (age > MAX_AGE_DAYS) return false;
        return true;
      });
  } catch {
    return [];
  }
}

import type { KitKind } from '../models/Kit.js';
import type { ChatMsg } from './openrouter.js';

interface Ctx {
  jdText: string;
  masterResume: string;
  company: string;
  title: string;
}

const CANDIDATE_PROFILE = `The candidate is a MERN-stack developer with AWS experience.`;

export function buildPrompt(kind: KitKind, ctx: Ctx): ChatMsg[] {
  const base = `JOB TITLE: ${ctx.title || 'unknown'}
COMPANY: ${ctx.company || 'unknown'}

--- JOB DESCRIPTION ---
${ctx.jdText.slice(0, 8000)}

--- CANDIDATE MASTER RESUME ---
${ctx.masterResume.slice(0, 8000) || '(no resume on file)'}`;

  switch (kind) {
    case 'cover':
      return [
        {
          role: 'system',
          content: `Write a concise, tailored cover letter (around 280 words) for the job below. ${CANDIDATE_PROFILE}
Use specific evidence from the resume that matches the JD's top 2-3 requirements.
Tone: confident, warm, no clichés ("dynamic", "passionate", "results-driven"). Plain markdown, no header block.`,
        },
        { role: 'user', content: base },
      ];

    case 'bullets':
      return [
        {
          role: 'system',
          content: `Rewrite 5 resume bullets that best match this JD, drawn from the candidate's existing resume. ${CANDIDATE_PROFILE}
Rules: each bullet starts with a strong verb, includes a metric where the resume supports one, is one line, mirrors keywords from the JD without keyword-stuffing. Output as a markdown list. Do not invent metrics not present or reasonably inferred from the resume.`,
        },
        { role: 'user', content: base },
      ];

    case 'questions':
      return [
        {
          role: 'system',
          content: `Generate the 5 most likely interview questions for this role, grouped: 2 technical (specific to the JD's stack), 2 behavioral, 1 system-design or scenario. ${CANDIDATE_PROFILE}
For each question, add a single-line hint on what a strong answer covers. Markdown headings per group.`,
        },
        { role: 'user', content: base },
      ];

    case 'brief':
      return [
        {
          role: 'system',
          content: `Write a one-page company brief on ${ctx.company || 'the company'} to help the candidate prep. Sections (use markdown headings):
- What they do (2-3 sentences)
- Recent signals (funding, products, news — if you don't know, say "Verify on their site/press")
- Likely tech stack & engineering culture (infer cautiously from the JD)
- 3 smart questions to ask the interviewer
Keep it under 500 words. Be honest about uncertainty — never fabricate specific facts (funding amounts, headcount, customer names) you don't know.`,
        },
        { role: 'user', content: base },
      ];
  }
}

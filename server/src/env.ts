import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../../.env') });

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  PORT: Number(process.env.PORT ?? 4000),
  MONGODB_URI: required('MONGODB_URI'),
  JWT_SECRET: required('JWT_SECRET'),
  APP_PASSWORD: required('APP_PASSWORD'),
  OPENROUTER_API_KEY: required('OPENROUTER_API_KEY'),
  // Kit generation model chain — comma-separated, tried in order. On 429 (rate
  // limit) or 402 (credit) the request cascades to the next model. Each failed
  // attempt costs 1-3s of dead time (initial fetch + OpenRouter upstream check),
  // so the chain is intentionally short: lead with the historically-stable model
  // and keep one backup. A longer chain trades latency for resilience — the
  // bigger the chain, the more dead time when the first models 429.
  OPENROUTER_KIT_MODELS: (
    process.env.OPENROUTER_KIT_MODELS ??
    'meta-llama/llama-3.3-70b-instruct:free,nvidia/nemotron-3-super-120b-a12b:free'
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  // Lightweight JSON-extraction model for paste-ingested JDs. Llama 4 Scout is
  // MoE with only 17B active params → fast for the {title, company, location}
  // extract job.
  OPENROUTER_EXTRACT_MODEL: process.env.OPENROUTER_EXTRACT_MODEL ?? 'meta-llama/llama-4-scout:free',
  // Live-web search model. Must be a model with native web access (e.g. Perplexity sonar family,
  // or any OpenRouter model with the `:online` suffix). Falls back to perplexity/sonar.
  OPENROUTER_SEARCH_MODEL: process.env.OPENROUTER_SEARCH_MODEL ?? 'perplexity/sonar',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
};

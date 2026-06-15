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
  OPENROUTER_DEFAULT_MODEL: process.env.OPENROUTER_DEFAULT_MODEL ?? 'meta-llama/llama-3.3-70b-instruct:free',
  // Live-web search model. Must be a model with native web access (e.g. Perplexity sonar family,
  // or any OpenRouter model with the `:online` suffix). Falls back to perplexity/sonar.
  OPENROUTER_SEARCH_MODEL: process.env.OPENROUTER_SEARCH_MODEL ?? 'perplexity/sonar',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
};

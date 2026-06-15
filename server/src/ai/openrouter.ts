import { env } from '../env.js';

export type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string };

const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function generate(
  messages: ChatMsg[],
  model?: string,
  maxTokens = 800
): Promise<string> {
  const res = await fetch(OR_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.CLIENT_ORIGIN,
      'X-Title': 'Job Tracker',
    },
    body: JSON.stringify({
      model: model ?? env.OPENROUTER_DEFAULT_MODEL,
      messages,
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${text}`);
  }
  const data: any = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

export async function* streamGenerate(
  messages: ChatMsg[],
  model?: string
): AsyncGenerator<string, void, void> {
  const res = await fetch(OR_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.CLIENT_ORIGIN,
      'X-Title': 'Job Tracker',
    },
    body: JSON.stringify({
      model: model ?? env.OPENROUTER_DEFAULT_MODEL,
      messages,
      stream: true,
      max_tokens: 1500,
    }),
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${res.status}: ${text}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return;
      try {
        const json = JSON.parse(payload);
        const delta = json.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        /* keepalive lines */
      }
    }
  }
}

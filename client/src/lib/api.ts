const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type Status = 'wishlist' | 'applied' | 'interviewing' | 'offer' | 'rejected';
export type KitKind = 'cover' | 'bullets' | 'questions' | 'brief';

export interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  jdText: string;
  sourceUrl: string;
  status: Status;
  order: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Kit {
  _id: string;
  jobId: string;
  kind: KitKind;
  content: string;
  model: string;
  createdAt: string;
}

export interface JobSearchFilters {
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

export interface Me {
  email: string;
  masterResume: string;
  defaultModel: string;
}

export const api = {
  login: (password: string) =>
    req<{ ok: true }>('/auth/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => req<{ ok: true }>('/auth/logout', { method: 'POST' }),
  whoami: () => req<{ userId: string }>('/auth/me'),

  getMe: () => req<Me>('/me'),
  updateMe: (data: Partial<Me>) =>
    req<Me>('/me', { method: 'PUT', body: JSON.stringify(data) }),

  uploadResume: async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(BASE + '/me/resume', {
      method: 'POST',
      credentials: 'include',
      body: fd,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `http_${res.status}`);
    }
    return res.json() as Promise<Me & { filename: string; chars: number }>;
  },

  listJobs: () => req<Job[]>('/jobs'),
  createJob: (
    jdText: string,
    sourceUrl?: string,
    meta?: { title?: string; company?: string; location?: string }
  ) =>
    req<Job>('/jobs', {
      method: 'POST',
      body: JSON.stringify({ jdText, sourceUrl: sourceUrl || '', ...(meta ?? {}) }),
    }),
  updateJob: (id: string, data: Partial<Job>) =>
    req<Job>(`/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteJob: (id: string) => req<{ ok: true }>(`/jobs/${id}`, { method: 'DELETE' }),

  listKits: (jobId: string) => req<Kit[]>(`/jobs/${jobId}/kits`),

  searchJobs: (filters: JobSearchFilters) =>
    req<JobResult[]>('/search/jobs', { method: 'POST', body: JSON.stringify(filters) }),
};

export function streamKit(
  jobId: string,
  kind: KitKind,
  handlers: {
    onDelta: (text: string) => void;
    onDone: (meta: { id: string; createdAt: string }) => void;
    onError: (msg: string) => void;
  }
): { close: () => void } {
  const controller = new AbortController();
  (async () => {
    try {
      const res = await fetch(`${BASE}/jobs/${jobId}/kit`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        handlers.onError(`http_${res.status}`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const chunks = buf.split('\n\n');
        buf = chunks.pop() ?? '';
        for (const chunk of chunks) {
          const lines = chunk.split('\n');
          let event = 'message';
          let data = '';
          for (const line of lines) {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            else if (line.startsWith('data:')) data += line.slice(5).trim();
          }
          if (!data) continue;
          try {
            const parsed = JSON.parse(data);
            if (event === 'delta') handlers.onDelta(parsed.text);
            else if (event === 'done') handlers.onDone(parsed);
            else if (event === 'error') handlers.onError(parsed.message);
          } catch {
            /* ignore */
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') handlers.onError(err?.message ?? 'stream_failed');
    }
  })();
  return { close: () => controller.abort() };
}

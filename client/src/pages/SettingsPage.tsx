import { useEffect, useRef, useState } from 'react';
import { api, Me } from '../lib/api';

const MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'deepseek/deepseek-chat-v3.1:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  'anthropic/claude-haiku-4.5',
  'anthropic/claude-sonnet-4.6',
];

const ERR_LABEL: Record<string, string> = {
  unsupported_file_type: 'Unsupported file. Use PDF, DOCX, TXT, or MD.',
  empty_extraction: "Couldn't read any text from that file.",
  extract_failed: 'Failed to read that file. Is it valid?',
};

export default function SettingsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState('');
  const [uploadErr, setUploadErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getMe().then(setMe);
  }, []);

  if (!me) return <div className="p-6 text-[13px] text-ink-subtle">Loading…</div>;

  const save = async () => {
    setSaving(true);
    setSaved(false);
    const next = await api.updateMe({
      masterResume: me.masterResume,
      defaultModel: me.defaultModel,
    });
    setMe(next);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadErr('');
    setUploadInfo('');
    try {
      const res = await api.uploadResume(file);
      setMe({ email: res.email, masterResume: res.masterResume, defaultModel: res.defaultModel });
      setUploadInfo(`Loaded ${res.filename} (${res.chars.toLocaleString()} chars).`);
    } catch (err: any) {
      const code = String(err?.message ?? 'extract_failed');
      setUploadErr(ERR_LABEL[code] ?? code);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <header>
          <h1 className="text-[22px] font-semibold tracking-card-title">Settings</h1>
          <p className="text-[13px] text-ink-subtle mt-1">
            Your master resume powers every tailored kit. Upload a file or paste text.
          </p>
        </header>

        <section className="space-y-2">
          <label className="text-[12px] font-medium text-ink-muted">Default model</label>
          <select
            className="input"
            value={me.defaultModel}
            onChange={(e) => setMe({ ...me, defaultModel: e.target.value })}
          >
            {MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-medium text-ink-muted">Master resume</label>
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                className="hidden"
                onChange={onFile}
              />
              <button
                type="button"
                className="btn-secondary text-[12px] py-1.5"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {uploading ? 'Reading…' : 'Upload file'}
              </button>
            </div>
          </div>
          <p className="text-[12px] text-ink-tertiary">
            PDF, DOCX, TXT, or MD up to 5 MB. Extracted text is saved automatically — you can edit it below.
          </p>
          {uploadInfo && <p className="text-[12px] text-success">{uploadInfo}</p>}
          {uploadErr && <p className="text-[12px] text-red-400">{uploadErr}</p>}
          <textarea
            className="input min-h-[420px] font-mono text-[12px] leading-relaxed"
            placeholder="Paste your resume here, or use Upload file above…"
            value={me.masterResume}
            onChange={(e) => setMe({ ...me, masterResume: e.target.value })}
          />
        </section>

        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {saved && <span className="text-[13px] text-success">Saved.</span>}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { api, Job } from '../lib/api';

export default function AddJobModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (job: Job) => void;
}) {
  const [jdText, setJdText] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr('');
    setBusy(true);
    try {
      const job = await api.createJob(jdText, url || undefined);
      onCreated(job);
    } catch (e: any) {
      setErr(String(e?.message ?? 'failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-2xl p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-[18px] font-semibold tracking-card-title">Add Job</h2>
          <p className="text-[12px] text-ink-subtle mt-1">
            Paste the JD. We'll extract title, company, and location.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[12px] text-ink-muted">Source URL (optional)</label>
          <input
            className="input"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[12px] text-ink-muted">Job description</label>
          <textarea
            className="input min-h-[260px] text-[12px] leading-relaxed"
            placeholder="Paste the full job description here…"
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            autoFocus
          />
        </div>

        {err && <div className="text-[13px] text-red-400">{err}</div>}

        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={busy || jdText.trim().length < 20}
            onClick={submit}
          >
            {busy ? 'Adding…' : 'Add to Wishlist'}
          </button>
        </div>
      </div>
    </div>
  );
}

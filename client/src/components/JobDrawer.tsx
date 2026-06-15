import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { api, Job, Kit, KitKind, Status, streamKit } from '../lib/api';
import KitPanel from './KitPanel';

const STATUS_OPTIONS: { key: Status; label: string }[] = [
  { key: 'wishlist', label: 'Wishlist' },
  { key: 'applied', label: 'Applied' },
  { key: 'interviewing', label: 'Interviewing' },
  { key: 'offer', label: 'Offer' },
  { key: 'rejected', label: 'Rejected' },
];

const KIT_TABS: { key: KitKind; label: string }[] = [
  { key: 'cover', label: 'Cover letter' },
  { key: 'bullets', label: 'Resume bullets' },
  { key: 'questions', label: 'Interview Qs' },
  { key: 'brief', label: 'Company brief' },
];

export default function JobDrawer({
  jobId,
  onClose,
  onUpdated,
  onDeleted,
}: {
  jobId: string;
  onClose: () => void;
  onUpdated: (j: Job) => void;
  onDeleted: (id: string) => void;
}) {
  const [job, setJob] = useState<Job | null>(null);
  const [kits, setKits] = useState<Kit[]>([]);
  const [tab, setTab] = useState<KitKind>('cover');
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const [jobs, k] = await Promise.all([api.listJobs(), api.listKits(jobId)]);
      const j = jobs.find((x) => x._id === jobId) ?? null;
      setJob(j);
      setKits(k);
    })();
  }, [jobId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!job) {
    return (
      <DrawerShell onClose={onClose}>
        <div className="p-6 text-[13px] text-ink-subtle">Loading…</div>
      </DrawerShell>
    );
  }

  const patch = (partial: Partial<Job>) => {
    const updated = { ...job, ...partial };
    setJob(updated);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      const saved = await api.updateJob(job._id, partial);
      onUpdated(saved);
    }, 400);
  };

  const remove = async () => {
    if (!confirm('Delete this job?')) return;
    await api.deleteJob(job._id);
    onDeleted(job._id);
  };

  return (
    <DrawerShell onClose={onClose}>
      <div className="flex flex-col h-full">
        <header className="px-6 py-5 border-b border-hairline flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <input
              className="w-full bg-transparent text-[18px] font-semibold tracking-card-title outline-none placeholder:text-ink-tertiary"
              value={job.title}
              placeholder="Job title"
              onChange={(e) => patch({ title: e.target.value })}
            />
            <div className="flex items-center gap-2 mt-1.5">
              <input
                className="bg-transparent text-[12px] text-ink-subtle outline-none flex-1 placeholder:text-ink-tertiary"
                value={job.company}
                placeholder="Company"
                onChange={(e) => patch({ company: e.target.value })}
              />
              <span className="text-ink-tertiary">·</span>
              <input
                className="bg-transparent text-[12px] text-ink-subtle outline-none flex-1 placeholder:text-ink-tertiary"
                value={job.location}
                placeholder="Location"
                onChange={(e) => patch({ location: e.target.value })}
              />
            </div>
          </div>
          <button className="btn-ghost text-ink-subtle" onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="px-6 py-3 border-b border-hairline flex items-center gap-3">
          <label className="text-[12px] text-ink-subtle">Status</label>
          <select
            className="bg-surface-1 border border-hairline rounded-md px-2 py-1 text-[12px] text-ink"
            value={job.status}
            onChange={(e) => patch({ status: e.target.value as Status })}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          {job.sourceUrl && (
            <a
              href={job.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] text-primary hover:text-primary-hover ml-auto"
            >
              Source ↗
            </a>
          )}
          <button className="btn-ghost text-[12px] text-rose-400 hover:bg-surface-1" onClick={remove}>
            Delete
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <section className="px-6 py-4 space-y-2">
            <label className="text-[12px] text-ink-subtle">Notes</label>
            <textarea
              className="input min-h-[80px] text-[12px] leading-relaxed"
              placeholder="Recruiter name, follow-ups, salary range…"
              value={job.notes}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </section>

          <section className="px-6 py-3 border-t border-hairline">
            <div className="flex gap-1 mb-3 overflow-x-auto">
              {KIT_TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={clsx(
                    'px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors',
                    tab === t.key
                      ? 'bg-surface-2 text-ink'
                      : 'text-ink-subtle hover:text-ink hover:bg-surface-1'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <KitPanel
              jobId={job._id}
              kind={tab}
              kits={kits.filter((k) => k.kind === tab)}
              onGenerated={(newKit) => setKits((prev) => [newKit, ...prev])}
              generate={(onDelta, onDone, onError) =>
                streamKit(job._id, tab, { onDelta, onDone, onError })
              }
            />
          </section>

          <section className="px-6 py-4 border-t border-hairline">
            <label className="text-[12px] text-ink-subtle">Job description</label>
            <pre className="mt-2 whitespace-pre-wrap text-[12px] text-ink-muted font-mono leading-relaxed">
              {job.jdText}
            </pre>
          </section>
        </div>
      </div>
    </DrawerShell>
  );
}

function DrawerShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-2xl bg-canvas border-l border-hairline shadow-2xl animate-[slideIn_.2s_ease]">
        {children}
      </aside>
      <style>{`@keyframes slideIn { from { transform: translateX(20px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }`}</style>
    </div>
  );
}

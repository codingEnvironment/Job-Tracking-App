import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, JobResult, JobSearchFilters, Me } from '../lib/api';

const SOURCE_COLOR: Record<string, string> = {
  linkedin: '#4f9cf9',
  indeed: '#f59e0b',
  naukri: '#34d399',
  glassdoor: '#5e6ad2',
};

function sourceBadgeStyle(source: string) {
  const key = source.toLowerCase();
  const color = SOURCE_COLOR[key] ?? '#8892a4';
  return { color, background: `${color}18`, border: `1px solid ${color}30` };
}

interface SearchPageProps {
  filters: JobSearchFilters;
  results: JobResult[] | null;
  addedIndexes: Set<number>;
  onFiltersChange: (f: JobSearchFilters) => void;
  onResultsChange: (r: JobResult[] | null) => void;
  onAddedIndexesChange: (idx: Set<number>) => void;
}

export default function SearchPage({
  filters,
  results,
  addedIndexes,
  onFiltersChange,
  onResultsChange,
  onAddedIndexesChange,
}: SearchPageProps) {
  const [me, setMe] = useState<Me | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.getMe().then(setMe);
  }, []);

  const noResume = me !== null && !me.masterResume.trim();
  const locationMissing = !filters.remote && !filters.location?.trim();
  const canSearch = !noResume && !locationMissing;

  const search = async () => {
    setErr('');
    onResultsChange(null);
    // Reset Added marks — they're tied to result indexes, which become meaningless
    // the moment a new result set replaces the old one.
    onAddedIndexesChange(new Set());
    setBusy(true);
    try {
      const data = await api.searchJobs(filters);
      onResultsChange(data);
      if (data.length === 0) setErr('No results returned — try broader filters or a different location.');
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      if (msg.includes('location_required')) setErr('Provide a location or enable Remote.');
      else setErr(msg || 'Search failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const addToBoard = async (job: JobResult, index: number) => {
    const jdText = [
      job.title,
      job.company,
      job.location,
      job.salary ? `Salary: ${job.salary}` : '',
      '',
      job.description,
      job.url ? `Source: ${job.url}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    await api.createJob(jdText, job.url || undefined, {
      title: job.title,
      company: job.company,
      location: job.location,
    });
    onAddedIndexesChange(new Set(addedIndexes).add(index));
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        <header>
          <h1 className="text-[22px] font-semibold tracking-card-title">Job Search</h1>
          <p className="text-[13px] text-ink-subtle mt-1">
            Live search across LinkedIn, Indeed, Naukri, Glassdoor — matched to your resume.
          </p>
        </header>

        {/* No-resume warning */}
        {noResume && (
          <div className="rounded-lg border border-hairline bg-surface-1 px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium text-ink">Resume required</p>
              <p className="text-[12px] text-ink-subtle mt-0.5">
                Upload your resume in Settings so we can match jobs to your profile.
              </p>
            </div>
            <Link to="/settings" className="btn-primary text-[12px] whitespace-nowrap">
              Go to Settings
            </Link>
          </div>
        )}

        {/* Filter bar */}
        <div className="card p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-ink-muted">
                Location <span className="text-ink-tertiary">{filters.remote ? '(optional when Remote is on)' : '*'}</span>
              </label>
              <input
                className="input"
                placeholder="e.g. Bangalore, Mumbai, New York"
                value={filters.location}
                onChange={(e) => onFiltersChange({ ...filters, location: e.target.value })}
                disabled={busy}
              />
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-ink-muted">
                Role / Job title <span className="text-ink-tertiary">(optional)</span>
              </label>
              <input
                className="input"
                placeholder="e.g. Full Stack Developer, AWS Engineer"
                value={filters.role}
                onChange={(e) => onFiltersChange({ ...filters, role: e.target.value })}
                disabled={busy}
              />
            </div>

            {/* Salary min */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-ink-muted">
                Min salary <span className="text-ink-tertiary">(optional)</span>
              </label>
              <input
                className="input"
                placeholder="e.g. ₹15 LPA or $80k"
                value={filters.salaryMin}
                onChange={(e) => onFiltersChange({ ...filters, salaryMin: e.target.value })}
                disabled={busy}
              />
            </div>

            {/* Salary max */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-ink-muted">
                Max salary <span className="text-ink-tertiary">(optional)</span>
              </label>
              <input
                className="input"
                placeholder="e.g. ₹25 LPA or $120k"
                value={filters.salaryMax}
                onChange={(e) => onFiltersChange({ ...filters, salaryMax: e.target.value })}
                disabled={busy}
              />
            </div>
          </div>

          {/* Remote toggle + Search button */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <button
                type="button"
                role="switch"
                aria-checked={filters.remote}
                onClick={() => onFiltersChange({ ...filters, remote: !filters.remote })}
                disabled={busy}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus/50 ${
                  filters.remote ? 'bg-primary' : 'bg-surface-3'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    filters.remote ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
              <span className="text-[13px] text-ink-muted">Remote only</span>
            </label>

            <button
              className="btn-primary"
              onClick={search}
              disabled={busy || !canSearch}
            >
              {busy ? (
                <span className="flex items-center gap-2">
                  <Spinner /> Searching…
                </span>
              ) : (
                'Search Jobs'
              )}
            </button>
          </div>

          {!canSearch && !noResume && locationMissing && (
            <p className="text-[12px] text-ink-tertiary">
              Enter a location or enable Remote to search.
            </p>
          )}
        </div>

        {/* Error */}
        {err && <p className="text-[13px] text-red-400">{err}</p>}

        {/* Results */}
        {results !== null && results.length > 0 && (
          <div className="space-y-3">
            <p className="text-[12px] text-ink-subtle">{results.length} results found</p>
            {results.map((job, i) => (
              <ResultCard
                key={i}
                job={job}
                added={addedIndexes.has(i)}
                onAdd={() => addToBoard(job, i)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({
  job,
  added,
  onAdd,
}: {
  job: JobResult;
  added: boolean;
  onAdd: () => void;
}) {
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    setAdding(true);
    try {
      await onAdd();
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="card p-4 flex flex-col gap-3 hover:border-hairline-strong transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[14px] font-semibold tracking-body text-ink leading-snug">
              {job.title || 'Untitled role'}
            </h3>
            {job.remote && (
              <span
                className="text-[11px] font-medium px-1.5 py-0.5 rounded-full"
                style={{ color: '#34d399', background: '#34d39918' }}
              >
                Remote
              </span>
            )}
            <span
              className="text-[11px] font-medium px-1.5 py-0.5 rounded-full"
              style={sourceBadgeStyle(job.source)}
            >
              {job.source || 'Unknown'}
            </span>
          </div>
          <p className="text-[13px] text-ink-subtle mt-0.5">
            {job.company || 'Unknown company'}
            {job.location ? ` · ${job.location}` : ''}
            {job.salary ? ` · ${job.salary}` : ''}
          </p>
          {job.postedAt && (
            <p className="text-[11px] text-ink-tertiary mt-1 tracking-eyebrow uppercase">
              Posted {job.postedAt}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary text-[12px] py-1.5"
            >
              View ↗
            </a>
          )}
          <button
            className={`text-[12px] py-1.5 px-[14px] rounded-md font-medium transition-colors ${
              added
                ? 'bg-success/20 text-success border border-success/30 cursor-default'
                : 'btn-primary'
            }`}
            onClick={added ? undefined : handleAdd}
            disabled={adding}
          >
            {added ? 'Added ✓' : adding ? 'Adding…' : 'Add to Board'}
          </button>
        </div>
      </div>

      {job.description && (
        <p className="text-[12px] text-ink-subtle leading-relaxed">{job.description}</p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-3.5 w-3.5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

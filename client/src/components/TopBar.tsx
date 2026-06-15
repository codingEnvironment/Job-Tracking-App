import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';

// Three-stage pipeline mark — represents the funnel this app manages
function PipelineMark() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
      <rect x="0" y="0" width="4" height="14" rx="2" fill="#8892a4" />
      <rect x="7" y="2" width="4" height="10" rx="2" fill="#4f9cf9" />
      <rect x="14" y="5" width="4" height="4" rx="2" fill="#34d399" />
    </svg>
  );
}

export default function TopBar({ onLogout }: { onLogout: () => void }) {
  const { pathname } = useLocation();
  const link = (to: string, label: string) => (
    <Link
      to={to}
      className={clsx(
        'px-3 py-1.5 rounded-md text-[13px] transition-colors',
        pathname === to
          ? 'bg-surface-1 text-ink'
          : 'text-ink-subtle hover:text-ink hover:bg-surface-1'
      )}
    >
      {label}
    </Link>
  );
  return (
    <header className="h-12 flex items-center justify-between px-6 border-b border-hairline bg-canvas/90 backdrop-blur supports-[backdrop-filter]:bg-canvas/70">
      <div className="flex items-center gap-5">
        <Link to="/" className="flex items-center gap-2.5 text-[13px] font-semibold tracking-card-title">
          <PipelineMark />
          <span className="text-ink">JobTracker</span>
        </Link>
        <nav className="flex items-center gap-0.5">
          {link('/', 'Board')}
          {link('/search', 'Search')}
          {link('/settings', 'Settings')}
        </nav>
      </div>
      <button className="btn-ghost text-[12px] text-ink-tertiary hover:text-ink-subtle" onClick={onLogout}>
        Sign out
      </button>
    </header>
  );
}

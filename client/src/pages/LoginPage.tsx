import { useState } from 'react';
import { api } from '../lib/api';

const STAGES = [
  { color: '#8892a4', label: 'Wishlist', h: 56 },
  { color: '#4f9cf9', label: 'Applied', h: 44 },
  { color: '#f59e0b', label: 'Interviewing', h: 32 },
  { color: '#34d399', label: 'Offer', h: 20 },
];

export default function LoginPage({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await api.login(password);
      onLoggedIn();
    } catch {
      setErr('Incorrect password — try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Pipeline funnel illustration */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-end gap-1.5 h-14">
            {STAGES.map((s) => (
              <div
                key={s.label}
                className="w-8 rounded-t-sm transition-all"
                style={{ height: s.h, background: `${s.color}30`, border: `1px solid ${s.color}50` }}
                title={s.label}
              />
            ))}
          </div>
          <div className="text-center">
            <h1 className="text-[18px] font-semibold tracking-card-title text-ink">JobTracker</h1>
            <p className="text-[13px] text-ink-tertiary mt-0.5">Your job search, end to end.</p>
          </div>
        </div>

        {/* Login form */}
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-ink-subtle">Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          {err && (
            <p className="text-[12px] text-rose-400">{err}</p>
          )}
          <button className="btn-primary w-full" disabled={loading || !password}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

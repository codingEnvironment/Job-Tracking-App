import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import { Kit, KitKind } from '../lib/api';

interface Props {
  jobId: string;
  kind: KitKind;
  kits: Kit[];
  onGenerated: (kit: Kit) => void;
  generate: (
    onDelta: (text: string) => void,
    onDone: (meta: { id: string; createdAt: string }) => void,
    onError: (msg: string) => void
  ) => { close: () => void };
}

export default function KitPanel({ jobId, kind, kits, onGenerated, generate }: Props) {
  const [streaming, setStreaming] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const streamRef = useRef<{ close: () => void } | null>(null);

  useEffect(() => {
    setSelectedId(kits[0]?._id ?? null);
    setStreaming('');
    setErr('');
  }, [jobId, kind]);

  const run = () => {
    setBusy(true);
    setStreaming('');
    setErr('');
    setSelectedId(null);
    let acc = '';
    streamRef.current = generate(
      (text) => {
        acc += text;
        setStreaming(acc);
      },
      (meta) => {
        const newKit: Kit = {
          _id: meta.id,
          jobId,
          kind,
          content: acc,
          model: '',
          createdAt: meta.createdAt,
        };
        onGenerated(newKit);
        setSelectedId(meta.id);
        setStreaming('');
        setBusy(false);
      },
      (msg) => {
        setErr(msg);
        setBusy(false);
      }
    );
  };

  useEffect(() => () => streamRef.current?.close(), []);

  const selected = kits.find((k) => k._id === selectedId);
  const showing = streaming || selected?.content || '';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button className="btn-primary text-[12px] py-1.5" onClick={run} disabled={busy}>
          {busy ? 'Generating…' : selected ? 'Regenerate' : 'Generate'}
        </button>
        {kits.length > 0 && (
          <select
            className="bg-surface-1 border border-hairline rounded-md px-2 py-1.5 text-[12px] text-ink"
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={busy}
          >
            {kits.map((k, i) => (
              <option key={k._id} value={k._id}>
                v{kits.length - i} · {new Date(k.createdAt).toLocaleString()}
              </option>
            ))}
          </select>
        )}
        {showing && !busy && (
          <button
            className="btn-ghost text-[12px] py-1.5 ml-auto"
            onClick={() => navigator.clipboard.writeText(showing)}
          >
            Copy
          </button>
        )}
      </div>

      {err && <div className="text-[13px] text-red-400">Error: {err}</div>}

      <div className="rounded-lg border border-hairline bg-surface-1/60 p-4 min-h-[200px]">
        {!showing && !busy && (
          <p className="text-[12px] text-ink-tertiary text-center mt-16">
            No version yet. Click Generate.
          </p>
        )}
        {busy && !showing && (
          <p className="text-[12px] text-ink-tertiary text-center mt-16">Thinking…</p>
        )}
        {showing && (
          <div className="kit-prose">
            <ReactMarkdown>{showing}</ReactMarkdown>
            {busy && (
              <span className="inline-block w-1.5 h-4 align-middle bg-primary ml-0.5 animate-pulse" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

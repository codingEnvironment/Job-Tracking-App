import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Job } from '../lib/api';
import clsx from 'clsx';

export default function JobCard({
  job,
  stageColor,
  onClick,
  dragging,
}: {
  job: Job;
  stageColor?: string;
  onClick?: () => void;
  dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: job._id,
  });

  const style: React.CSSProperties = {
    ...(transform ? { transform: CSS.Translate.toString(transform) } : {}),
    borderLeft: stageColor ? `2px solid ${stageColor}60` : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (isDragging) return;
        if ((e.target as HTMLElement).closest('[data-no-open]')) return;
        onClick?.();
      }}
      className={clsx(
        'rounded-lg bg-surface-1 border border-hairline p-3 cursor-pointer select-none',
        'transition-all hover:bg-surface-2 hover:border-hairline-strong',
        (isDragging || dragging) && 'opacity-50 scale-[0.98]'
      )}
    >
      <div className="text-[13px] font-medium text-ink tracking-body line-clamp-2 leading-snug">
        {job.title || 'Untitled role'}
      </div>
      <div className="text-[12px] text-ink-subtle mt-1.5 flex items-center gap-1.5 min-w-0">
        <span className="truncate">{job.company || 'Unknown company'}</span>
        {job.location && (
          <>
            <span className="text-ink-tertiary flex-shrink-0">·</span>
            <span className="truncate text-ink-tertiary">{job.location}</span>
          </>
        )}
      </div>
    </div>
  );
}

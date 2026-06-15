import { useDroppable } from '@dnd-kit/core';
import { Job, Status } from '../lib/api';
import JobCard from './JobCard';

// Each stage has a color that communicates its emotional weight
export const STAGE_COLOR: Record<Status, string> = {
  wishlist: '#8892a4',
  applied: '#4f9cf9',
  interviewing: '#f59e0b',
  offer: '#34d399',
  rejected: '#f87171',
};

export default function Column({
  status,
  label,
  jobs,
  onCardClick,
}: {
  status: Status;
  label: string;
  jobs: Job[];
  onCardClick: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` });
  const color = STAGE_COLOR[status];

  return (
    <div className="w-[272px] flex-shrink-0 flex flex-col h-full">
      {/* Column header */}
      <div className="flex items-center justify-between px-1 pb-3">
        <span
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color }}
        >
          {label}
        </span>
        <span
          className="text-[11px] font-semibold tabular-nums rounded-full px-1.5 py-0.5 min-w-[20px] text-center"
          style={{
            color,
            background: `${color}18`,
          }}
        >
          {jobs.length}
        </span>
      </div>

      {/* Card list drop zone */}
      <div
        ref={setNodeRef}
        className="flex-1 rounded-lg p-2 space-y-2 overflow-y-auto transition-all"
        style={{
          background: isOver ? `${color}08` : 'rgba(15,16,17,0.6)',
          border: `1px solid ${isOver ? color + '40' : '#23252a'}`,
          borderTop: `2px solid ${isOver ? color + '80' : color + '30'}`,
        }}
      >
        {jobs.map((job) => (
          <JobCard key={job._id} job={job} stageColor={color} onClick={() => onCardClick(job._id)} />
        ))}
        {jobs.length === 0 && (
          <div
            className="flex items-center justify-center h-16 rounded-md text-[11px] font-medium select-none transition-colors"
            style={{
              color: isOver ? color : '#62666d',
              background: isOver ? `${color}10` : 'transparent',
              border: `1px dashed ${isOver ? color + '50' : '#2e303620'}`,
            }}
          >
            {isOver ? `Move here` : `No ${label.toLowerCase()} jobs`}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { api, Job, Status } from '../lib/api';
import Column, { STAGE_COLOR } from '../components/Column';
import JobCard from '../components/JobCard';
import AddJobModal from '../components/AddJobModal';
import JobDrawer from '../components/JobDrawer';

const COLUMNS: { key: Status; label: string }[] = [
  { key: 'wishlist', label: 'Wishlist' },
  { key: 'applied', label: 'Applied' },
  { key: 'interviewing', label: 'Interviewing' },
  { key: 'offer', label: 'Offer' },
  { key: 'rejected', label: 'Rejected' },
];

export default function BoardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const refresh = async () => {
    setLoading(true);
    const data = await api.listJobs();
    setJobs(data);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const byColumn = useMemo(() => {
    const map: Record<Status, Job[]> = {
      wishlist: [],
      applied: [],
      interviewing: [],
      offer: [],
      rejected: [],
    };
    for (const j of jobs) map[j.status].push(j);
    for (const k of Object.keys(map) as Status[])
      map[k].sort((a, b) => a.order - b.order);
    return map;
  }, [jobs]);

  const activeJob = activeId ? jobs.find((j) => j._id === activeId) : null;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const activeJobId = String(e.active.id);
    if (!e.over) return;
    const overId = String(e.over.id);

    const job = jobs.find((j) => j._id === activeJobId);
    if (!job) return;

    let targetStatus: Status = job.status;
    let neighborJob: Job | null = null;

    if (overId.startsWith('col:')) {
      targetStatus = overId.slice(4) as Status;
    } else {
      const overJob = jobs.find((j) => j._id === overId);
      if (overJob) {
        targetStatus = overJob.status;
        neighborJob = overJob;
      }
    }

    const list = byColumn[targetStatus].filter((j) => j._id !== activeJobId);
    let newOrder: number;
    if (!neighborJob || list.length === 0) {
      const last = list[list.length - 1];
      newOrder = (last?.order ?? 0) + 1000;
    } else {
      const idx = list.findIndex((j) => j._id === neighborJob!._id);
      const prev = idx > 0 ? list[idx - 1] : null;
      const next = list[idx];
      if (!prev) newOrder = next.order - 500;
      else newOrder = (prev.order + next.order) / 2;
    }

    setJobs((prev) =>
      prev.map((j) =>
        j._id === activeJobId ? { ...j, status: targetStatus, order: newOrder } : j
      )
    );

    try {
      await api.updateJob(activeJobId, { status: targetStatus, order: newOrder });
    } catch {
      refresh();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 pt-5 pb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-[15px] font-semibold tracking-card-title">Pipeline</h1>
          {!loading && (
            <div className="flex items-center gap-2">
              {COLUMNS.map((c) => {
                const count = byColumn[c.key].length;
                if (count === 0) return null;
                return (
                  <span
                    key={c.key}
                    className="text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded-full"
                    style={{ color: STAGE_COLOR[c.key], background: `${STAGE_COLOR[c.key]}18` }}
                    title={c.label}
                  >
                    {count}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <button className="btn-primary text-[13px]" onClick={() => setShowAdd(true)}>
          Add job
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex-1 overflow-x-auto px-6 pb-6">
          <div className="flex gap-4 min-w-max h-full">
            {COLUMNS.map((c) => (
              <Column
                key={c.key}
                status={c.key}
                label={c.label}
                jobs={byColumn[c.key]}
                onCardClick={(id) => setOpenJobId(id)}
              />
            ))}
          </div>
        </div>
        <DragOverlay>
          {activeJob ? (
            <div className="rotate-1 opacity-90">
              <JobCard job={activeJob} stageColor={STAGE_COLOR[activeJob.status]} dragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {showAdd && (
        <AddJobModal
          onClose={() => setShowAdd(false)}
          onCreated={(job) => {
            setJobs((prev) => [...prev, job]);
            setShowAdd(false);
            setOpenJobId(job._id);
          }}
        />
      )}

      {openJobId && (
        <JobDrawer
          jobId={openJobId}
          onClose={() => setOpenJobId(null)}
          onUpdated={(j) =>
            setJobs((prev) => prev.map((x) => (x._id === j._id ? j : x)))
          }
          onDeleted={(id) => {
            setJobs((prev) => prev.filter((j) => j._id !== id));
            setOpenJobId(null);
          }}
        />
      )}
    </div>
  );
}

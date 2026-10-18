"use client";

import { useState, useTransition } from "react";
import { saveTask } from "@/app/actions/tasks";
import { Alert, Modal, safeAction } from "@/components/ui/client";
import { CATEGORIES, DIFFICULTIES, TASK_STATUSES } from "@/lib/constants";
import type { ActionResult, LearningTask } from "@/lib/types";

export function TaskForm({ task, defaultDate, onDone }: { task?: LearningTask; defaultDate?: string; onDone: () => void }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        start(async () => {
          const res = await safeAction(() => saveTask(task?.id ?? null, form));
          setResult(res);
          if (res.ok) onDone();
        });
      }}
    >
      <div>
        <label className="label" htmlFor="t-title">Title</label>
        <input id="t-title" name="title" className="input" required maxLength={300} defaultValue={task?.title} />
      </div>
      <div>
        <label className="label" htmlFor="t-desc">Description</label>
        <textarea id="t-desc" name="description" className="input" rows={2} defaultValue={task?.description ?? ""} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="t-cat">Category</label>
          <select id="t-cat" name="category" className="input" defaultValue={task?.category ?? "playwright"}>
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="t-diff">Difficulty</label>
          <select id="t-diff" name="difficulty" className="input" defaultValue={task?.difficulty ?? "beginner"}>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="t-status">Status</label>
          <select id="t-status" name="status" className="input" defaultValue={task?.status ?? "not_started"}>
            {Object.entries(TASK_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="t-date">Planned date</label>
          <input id="t-date" name="planned_date" type="date" className="input" defaultValue={task?.planned_date ?? defaultDate} />
        </div>
        <div>
          <label className="label" htmlFor="t-est">Estimated (min)</label>
          <input id="t-est" name="estimated_minutes" type="number" min={0} max={1440} className="input" defaultValue={task?.estimated_minutes ?? 30} />
        </div>
        <div>
          <label className="label" htmlFor="t-act">Actual (min)</label>
          <input id="t-act" name="actual_minutes" type="number" min={0} max={1440} className="input" defaultValue={task?.actual_minutes ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="t-rating">Personal rating (1–5)</label>
          <input id="t-rating" name="rating" type="number" min={1} max={5} className="input" defaultValue={task?.rating ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="t-conf">Confidence (1–5)</label>
          <input id="t-conf" name="confidence" type="number" min={1} max={5} className="input" defaultValue={task?.confidence ?? ""} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="t-crit">Completion criteria</label>
        <input id="t-crit" name="completion_criteria" className="input" defaultValue={task?.completion_criteria ?? ""} />
      </div>
      <div>
        <label className="label" htmlFor="t-links">Resource links (one per line)</label>
        <textarea id="t-links" name="resource_links" className="input font-mono text-xs" rows={2} defaultValue={task?.resource_links.join("\n")} />
      </div>
      <div>
        <label className="label" htmlFor="t-notes">Notes</label>
        <textarea id="t-notes" name="notes" className="input" rows={3} defaultValue={task?.notes ?? ""} />
      </div>
      <Alert result={result && !result.ok ? result : null} />
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : task ? "Save changes" : "Add task"}</button>
      </div>
    </form>
  );
}

export function AddTaskButton({ defaultDate }: { defaultDate: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>+ Add task</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add task" wide>
        <TaskForm defaultDate={defaultDate} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { deleteTask, postponeTask, rescheduleOverdue, setTaskStatus } from "@/app/actions/tasks";
import { Badge } from "@/components/ui";
import { Alert, Modal, safeAction } from "@/components/ui/client";
import { categoryLabel, TASK_STATUSES } from "@/lib/constants";
import { addDays, formatDate, formatMinutes } from "@/lib/dates";
import type { ActionResult, LearningTask, TaskStatus } from "@/lib/types";
import { TaskCheck } from "./task-check";
import { TaskForm } from "./task-form";

const STATUS_TONE = { not_started: "zinc", in_progress: "blue", completed: "green", blocked: "red" } as const;

export function TaskItem({ task, today, showDate }: { task: LearningTask; today: string; showDate?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [minutes, setMinutes] = useState<string>(task.actual_minutes?.toString() ?? task.estimated_minutes.toString());
  const [pending, start] = useTransition();
  const overdue = task.status !== "completed" && task.planned_date !== null && task.planned_date < today;

  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => setResult(await safeAction(fn)));

  return (
    <li className="py-2.5">
      <div className="flex items-start gap-3">
        <span className="pt-0.5"><TaskCheck id={task.id} status={task.status} title={task.title} /></span>
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
          <span className={`text-sm ${task.status === "completed" ? "muted line-through" : "font-medium"}`}>{task.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
            <Badge>{categoryLabel(task.category)}</Badge>
            <Badge tone={STATUS_TONE[task.status]}>{TASK_STATUSES[task.status]}</Badge>
            <span className="muted">{task.difficulty}</span>
            <span className="muted">· {formatMinutes(task.estimated_minutes)}{task.actual_minutes !== null && ` (actual ${formatMinutes(task.actual_minutes)})`}</span>
            {showDate && <span className="muted">· {formatDate(task.planned_date)}</span>}
            {overdue && <Badge tone="amber">Overdue</Badge>}
            {task.is_custom && <Badge tone="indigo">My task</Badge>}
          </span>
        </button>
      </div>

      {expanded && (
        <div className="mt-3 ml-7 space-y-3 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-950">
          {task.description && <p>{task.description}</p>}
          {task.completion_criteria && <p><b>Done when:</b> {task.completion_criteria}</p>}
          {task.resource_links.length > 0 && (
            <ul className="space-y-0.5">
              {task.resource_links.map((l) => (
                <li key={l}><a href={l} target="_blank" rel="noreferrer" className="break-all text-indigo-600 hover:underline dark:text-indigo-400">{l}</a></li>
              ))}
            </ul>
          )}
          {task.notes && <p className="whitespace-pre-wrap"><b>Notes:</b> {task.notes}</p>}
          {(task.rating || task.confidence) && (
            <p className="muted text-xs">Rating {task.rating ?? "—"}/5 · Confidence {task.confidence ?? "—"}/5</p>
          )}

          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="label text-xs" htmlFor={`st-${task.id}`}>Status</label>
              <select id={`st-${task.id}`} className="input py-1.5" value={task.status} disabled={pending}
                onChange={(e) => run(() => setTaskStatus(task.id, e.target.value as TaskStatus))}>
                {Object.entries(TASK_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            {task.status !== "completed" && (
              <div className="flex items-end gap-1">
                <div>
                  <label className="label text-xs" htmlFor={`min-${task.id}`}>Time spent (min)</label>
                  <input id={`min-${task.id}`} type="number" min={0} max={1440} className="input w-24 py-1.5" value={minutes}
                    onChange={(e) => setMinutes(e.target.value)} />
                </div>
                <button className="btn-primary py-1.5" disabled={pending}
                  onClick={() => run(() => setTaskStatus(task.id, "completed", minutes === "" ? null : Number(minutes)))}>
                  Complete
                </button>
              </div>
            )}
            {task.status !== "completed" && (
              <>
                <button className="btn-secondary py-1.5" disabled={pending}
                  onClick={() => run(() => postponeTask(task.id, addDays(task.planned_date && task.planned_date > today ? task.planned_date : today, 1)))}>
                  Postpone 1 day
                </button>
                <input type="date" aria-label="Move to date" className="input w-auto py-1.5" min={today}
                  onChange={(e) => e.target.value && run(() => postponeTask(task.id, e.target.value))} />
              </>
            )}
            <button className="btn-secondary py-1.5" onClick={() => setEditing(true)}>Edit</button>
            <button className="btn-danger py-1.5" disabled={pending}
              onClick={() => confirm(`Delete "${task.title}"? This cannot be undone.`) && run(() => deleteTask(task.id))}>
              Delete
            </button>
          </div>
          <Alert result={result} />
        </div>
      )}

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit task" wide>
        <TaskForm task={task} onDone={() => setEditing(false)} />
      </Modal>
    </li>
  );
}

export function RescheduleOverdueButton({ count }: { count: number }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-2">
      <button className="btn-secondary" disabled={pending}
        onClick={() => start(async () => setResult(await safeAction(() => rescheduleOverdue(2))))}>
        {pending ? "Rescheduling…" : `Reschedule ${count} overdue`}
      </button>
      {result && !result.ok && <span role="alert" className="text-sm text-red-600">{result.error}</span>}
    </div>
  );
}

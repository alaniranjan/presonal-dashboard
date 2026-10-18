"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteMilestone, deleteProject, saveMilestone, saveProject, setMilestoneStatus } from "@/app/actions/projects";
import { Badge } from "@/components/ui";
import { ActionButton, Alert, Modal, safeAction } from "@/components/ui/client";
import { TASK_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import type { ActionResult, Milestone, MilestoneStatus, Project } from "@/lib/types";

function ProjectForm({ project, onDone }: { project?: Project; onDone: (id?: string) => void }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const area = (name: keyof Project, label: string, rows = 3) => (
    <div>
      <label className="label" htmlFor={`p-${name}`}>{label}</label>
      <textarea id={`p-${name}`} name={name} rows={rows} className="input"
        defaultValue={Array.isArray(project?.[name]) ? (project![name] as string[]).join("\n") : ((project?.[name] as string) ?? "")} />
    </div>
  );
  return (
    <form className="space-y-3" onSubmit={(e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      start(async () => {
        const res = await safeAction(() => saveProject(project?.id ?? null, form));
        setResult(res);
        if (res.ok) onDone("id" in res ? (res.id as string) : undefined);
      });
    }}>
      <div>
        <label className="label" htmlFor="p-name">Project name</label>
        <input id="p-name" name="name" className="input" required defaultValue={project?.name} />
      </div>
      {area("summary", "Summary", 2)}
      <div>
        <label className="label" htmlFor="p-repo">GitHub repository URL</label>
        <input id="p-repo" name="repo_url" type="url" className="input" placeholder="https://github.com/you/repo" defaultValue={project?.repo_url ?? ""} />
      </div>
      {area("requirements", "Requirements (one per line)")}
      {area("test_scenarios", "Test scenarios (one per line)")}
      {area("acceptance_criteria", "Acceptance criteria (one per line)")}
      {area("design_questions", "Interview questions about design decisions (one per line)")}
      <div>
        <label className="label" htmlFor="p-folder_structure">Folder-structure plan</label>
        <textarea id="p-folder_structure" name="folder_structure" rows={6} className="input font-mono text-xs" defaultValue={project?.folder_structure ?? ""} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="on_hold" defaultChecked={project?.status === "on_hold"} className="accent-indigo-600" />
        On hold
      </label>
      <Alert result={result && !result.ok ? result : null} />
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={() => onDone()}>Cancel</button>
        <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : project ? "Save project" : "Create project"}</button>
      </div>
    </form>
  );
}

export function NewProjectButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <button className="btn-secondary" onClick={() => setOpen(true)}>+ New project</button>
      <Modal open={open} onClose={() => setOpen(false)} title="New project" wide>
        <ProjectForm onDone={(id) => { setOpen(false); if (id) router.push(`/projects/${id}`); }} />
      </Modal>
    </>
  );
}

export function ProjectHeaderActions({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <button className="btn-secondary" onClick={() => setOpen(true)}>Edit project</button>
      <ActionButton className="btn-danger" confirmText="Delete this project and all its milestones? This cannot be undone."
        action={() => deleteProject(project.id)} onDone={(r) => r.ok && router.push("/projects")}>Delete</ActionButton>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit project" wide>
        <ProjectForm project={project} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function MilestoneForm({ projectId, milestone, onDone }: { projectId: string; milestone?: Milestone; onDone: () => void }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="space-y-3" onSubmit={(e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      start(async () => {
        const res = await safeAction(() => saveMilestone(projectId, milestone?.id ?? null, form));
        setResult(res);
        if (res.ok) onDone();
      });
    }}>
      <div>
        <label className="label" htmlFor="m-title">Milestone</label>
        <input id="m-title" name="title" className="input" required defaultValue={milestone?.title} />
      </div>
      <div>
        <label className="label" htmlFor="m-desc">Description</label>
        <textarea id="m-desc" name="description" rows={2} className="input" defaultValue={milestone?.description ?? ""} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="m-status">Status</label>
          <select id="m-status" name="status" className="input" defaultValue={milestone?.status ?? "not_started"}>
            {Object.entries(TASK_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="m-due">Due date</label>
          <input id="m-due" name="due_date" type="date" className="input" defaultValue={milestone?.due_date ?? ""} />
        </div>
      </div>
      <fieldset className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <legend className="px-1 text-sm font-medium">Evidence (required to complete)</legend>
        <label className="label" htmlFor="m-url">Link (commit, PR, report, build)</label>
        <input id="m-url" name="evidence_url" type="url" className="input" placeholder="https://github.com/…" defaultValue={milestone?.evidence_url ?? ""} />
        <label className="label mt-2" htmlFor="m-notes">Notes</label>
        <textarea id="m-notes" name="evidence_notes" rows={2} className="input" placeholder="What you built and how you verified it" defaultValue={milestone?.evidence_notes ?? ""} />
      </fieldset>
      <Alert result={result && !result.ok ? result : null} />
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : milestone ? "Save milestone" : "Add milestone"}</button>
      </div>
    </form>
  );
}

export function AddMilestoneButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn-secondary py-1.5" onClick={() => setOpen(true)}>+ Add milestone</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add milestone">
        <MilestoneForm projectId={projectId} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

const TONE = { not_started: "zinc", in_progress: "blue", completed: "green", blocked: "red" } as const;

export function MilestoneRow({ projectId, milestone, today }: { projectId: string; milestone: Milestone; today: string }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const m = milestone;
  const overdue = m.status !== "completed" && m.due_date && m.due_date < today;
  return (
    <li className="py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${m.status === "completed" ? "muted line-through" : ""}`}>{m.title}</p>
          {m.description && <p className="muted text-xs">{m.description}</p>}
          <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
            <Badge tone={TONE[m.status]}>{TASK_STATUSES[m.status]}</Badge>
            {m.due_date && <span className={overdue ? "text-amber-600" : "muted"}>due {formatDate(m.due_date)}</span>}
            {m.completed_at && <span className="muted">completed {formatDate(m.completed_at)}</span>}
          </div>
          {(m.evidence_url || m.evidence_notes) && (
            <div className="mt-1 text-xs">
              <span className="font-medium">Evidence: </span>
              {m.evidence_url && <a href={m.evidence_url} target="_blank" rel="noreferrer" className="break-all text-indigo-600 hover:underline dark:text-indigo-400">{m.evidence_url}</a>}
              {m.evidence_notes && <span className="muted"> {m.evidence_notes}</span>}
            </div>
          )}
          {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`ms-${m.id}`}>Status</label>
          <select id={`ms-${m.id}`} className="input w-auto py-1.5" value={m.status} disabled={pending}
            onChange={(e) => {
              const next = e.target.value as MilestoneStatus;
              start(async () => {
                const res = await safeAction(() => setMilestoneStatus(projectId, m.id, next));
                setError(res.ok ? null : res.error);
                // Completing needs evidence: open the form so it can be added right away.
                if (!res.ok && next === "completed") setEditing(true);
              });
            }}>
            {Object.entries(TASK_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="btn-ghost py-1.5" onClick={() => setEditing(true)}>Edit</button>
          <ActionButton className="btn-ghost py-1.5 text-red-600" confirmText={`Delete milestone "${m.title}"?`}
            action={() => deleteMilestone(projectId, m.id)}>Delete</ActionButton>
        </div>
      </div>
      <Modal open={editing} onClose={() => setEditing(false)} title="Edit milestone">
        <MilestoneForm projectId={projectId} milestone={m} onDone={() => setEditing(false)} />
      </Modal>
    </li>
  );
}

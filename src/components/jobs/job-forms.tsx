"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { deleteJob, deleteRound, saveJob, saveJobSearchLog, saveRound, setJobStatus, type Duplicate } from "@/app/actions/jobs";
import { ActionButton, Alert, Modal, safeAction } from "@/components/ui/client";
import { JOB_STATUSES, PORTALS, ROUND_OUTCOMES, ROUND_TYPES, WORK_MODES } from "@/lib/constants";
import type { ActionResult, InterviewRound, JobApplication, JobStatus, Resume } from "@/lib/types";

function Input({ name, label, type = "text", defaultValue, placeholder, required }: { name: string; label: string; type?: string; defaultValue?: string | null; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="label" htmlFor={`j-${name}`}>{label}</label>
      <input id={`j-${name}`} name={name} type={type} className="input" defaultValue={defaultValue ?? ""} placeholder={placeholder} required={required} />
    </div>
  );
}
function Area({ name, label, rows = 3, defaultValue, placeholder }: { name: string; label: string; rows?: number; defaultValue?: string | null; placeholder?: string }) {
  return (
    <div>
      <label className="label" htmlFor={`j-${name}`}>{label}</label>
      <textarea id={`j-${name}`} name={name} rows={rows} className="input" defaultValue={defaultValue ?? ""} placeholder={placeholder} />
    </div>
  );
}
function Select({ name, label, options, defaultValue, empty }: { name: string; label: string; options: Record<string, string>; defaultValue?: string | null; empty?: string }) {
  return (
    <div>
      <label className="label" htmlFor={`j-${name}`}>{label}</label>
      <select id={`j-${name}`} name={name} className="input" defaultValue={defaultValue ?? ""}>
        {empty !== undefined && <option value="">{empty}</option>}
        {Object.entries(options).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </div>
  );
}

export function JobForm({ job, resumes, today }: { job?: JobApplication; resumes: Pick<Resume, "id" | "version_name">[]; today: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [pending, start] = useTransition();

  const submit = (allowDuplicate: boolean) => {
    const form = new FormData(formRef.current!);
    start(async () => {
      const res = await safeAction(() => saveJob(job?.id ?? null, form, allowDuplicate));
      setResult(res);
      setDuplicates("duplicates" in res && res.duplicates ? res.duplicates : []);
      if (res.ok && "id" in res && res.id) router.push(`/jobs/${res.id}`);
    });
  };

  return (
    <form ref={formRef} className="space-y-6" onSubmit={(e) => { e.preventDefault(); submit(false); }}>
      <fieldset className="card grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="px-1 font-semibold">Role</legend>
        <Input name="company" label="Company" defaultValue={job?.company} required />
        <Input name="job_title" label="Job title" defaultValue={job?.job_title} placeholder="QA Automation Engineer" required />
        <Select name="status" label="Status" options={JOB_STATUSES} defaultValue={job?.status ?? "saved"} />
        <Input name="job_url" label="Job posting URL" type="url" defaultValue={job?.job_url} placeholder="https://…" />
        <Select name="portal" label="Portal" options={PORTALS} defaultValue={job?.portal ?? "linkedin"} />
        <Select name="resume_id" label="Resume version used" options={Object.fromEntries(resumes.map((r) => [r.id, r.version_name]))} defaultValue={job?.resume_id} empty="—" />
        <Input name="location" label="Location" defaultValue={job?.location} placeholder="Bengaluru" />
        <Select name="work_mode" label="Work mode" options={WORK_MODES} defaultValue={job?.work_mode} empty="—" />
        <Input name="experience_required" label="Experience required" defaultValue={job?.experience_required} placeholder="3–5 years" />
        <Input name="salary_range" label="Salary range" defaultValue={job?.salary_range} placeholder="Posted or recruiter-confirmed" />
        <Input name="date_found" label="Date found" type="date" defaultValue={job?.date_found ?? (job ? null : today)} />
        <Input name="date_applied" label="Date applied" type="date" defaultValue={job?.date_applied} />
        <div className="sm:col-span-2 lg:col-span-3">
          <Area name="required_skills" label="Required skills (comma separated)" rows={2} defaultValue={job?.required_skills.join(", ")} placeholder="Playwright, TypeScript, API testing, Jenkins, SQL" />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Area name="job_description" label="Job description" rows={6} defaultValue={job?.job_description} />
        </div>
      </fieldset>

      <fieldset className="card grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="px-1 font-semibold">Contacts and follow-up</legend>
        <Input name="recruiter_name" label="Recruiter name" defaultValue={job?.recruiter_name} />
        <Input name="recruiter_contact" label="Recruiter contact (only what they shared)" defaultValue={job?.recruiter_contact} />
        <Input name="follow_up_date" label="Next follow-up" type="date" defaultValue={job?.follow_up_date} />
        <div className="sm:col-span-2 lg:col-span-3"><Area name="referral_details" label="Referral details" rows={2} defaultValue={job?.referral_details} /></div>
        <div className="sm:col-span-2 lg:col-span-3"><Input name="next_action" label="Next action" defaultValue={job?.next_action} placeholder="e.g. send follow-up email on Monday" /></div>
      </fieldset>

      <fieldset className="card grid grid-cols-1 gap-3 sm:grid-cols-2">
        <legend className="px-1 font-semibold">Outcome</legend>
        <Area name="recruiter_feedback" label="Recruiter feedback" defaultValue={job?.recruiter_feedback} />
        <Area name="rejection_reason" label="Rejection reason" defaultValue={job?.rejection_reason} />
        <Area name="offer_details" label="Offer details" defaultValue={job?.offer_details} />
        <Area name="notes" label="Notes" defaultValue={job?.notes} />
      </fieldset>

      {duplicates.length > 0 && (
        <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-medium">Possible duplicate. You already have:</p>
          <ul className="mt-1 list-disc pl-5">
            {duplicates.map((d) => (
              <li key={d.id}><Link className="underline" href={`/jobs/${d.id}`}>{d.application_code} · {d.company} · {d.job_title}</Link> ({JOB_STATUSES[d.status as JobStatus]})</li>
            ))}
          </ul>
          <button type="button" className="btn-secondary mt-2" disabled={pending} onClick={() => submit(true)}>It&apos;s a different job, save anyway</button>
        </div>
      )}
      {!duplicates.length && <Alert result={result && !result.ok ? result : null} />}
      <div className="flex justify-end gap-2">
        <Link href={job ? `/jobs/${job.id}` : "/jobs"} className="btn-secondary">Cancel</Link>
        <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : job ? "Save changes" : "Add application"}</button>
      </div>
    </form>
  );
}

export function JobStatusSelect({ id, status }: { id: string; status: JobStatus }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-1">
      <label className="sr-only" htmlFor={`js-${id}`}>Status</label>
      <select id={`js-${id}`} className="input w-auto py-1 text-xs" value={status} disabled={pending}
        onChange={(e) => start(async () => {
          const res = await safeAction(() => setJobStatus(id, e.target.value as JobStatus));
          setErr(res.ok ? null : res.error);
        })}>
        {Object.entries(JOB_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      {err && <span role="alert" className="text-xs text-red-600">{err}</span>}
    </span>
  );
}

export function DeleteJobButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <ActionButton className="btn-danger" confirmText="Delete this application and its interview rounds?"
      action={() => deleteJob(id)} onDone={(r) => r.ok && router.push("/jobs")}>Delete</ActionButton>
  );
}

/* ---------------- Kanban ---------------- */

type Card = Pick<JobApplication, "id" | "company" | "job_title" | "status" | "follow_up_date" | "portal" | "application_code">;

export function KanbanBoard({ jobs, today }: { jobs: Card[]; today: string }) {
  const [items, setItems] = useState(jobs);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function move(id: string, status: JobStatus) {
    const prev = items;
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status } : x)));
    const res = await safeAction(() => setJobStatus(id, status));
    if (!res.ok) { setItems(prev); setError(res.error); } else setError(null);
  }

  return (
    <>
      {error && <p role="alert" className="mb-2 text-sm text-red-600">{error}</p>}
      <p className="muted mb-2 text-xs"><span className="hidden sm:inline">Drag cards between columns, or use the status menu on each card.</span><span className="sm:hidden">Swipe sideways through the stages that have applications. Use the menu on a card to move it.</span></p>
      <div className="relative -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
        {(Object.keys(JOB_STATUSES) as JobStatus[]).map((s) => {
          const col = items.filter((j) => j.status === s);
          // Empty stages are hidden on phones to save swiping; they stay as drop targets on larger screens.
          return (
            <section key={s} aria-label={JOB_STATUSES[s]}
              onDragOver={(e) => { e.preventDefault(); setOver(s); }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => { e.preventDefault(); setOver(null); if (dragId) move(dragId, s); setDragId(null); }}
              className={`w-[78vw] max-w-72 shrink-0 snap-start rounded-xl border p-2 sm:block sm:w-64 ${col.length === 0 ? "hidden" : ""} ${over === s ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40" : "border-zinc-200 bg-zinc-100/60 dark:border-zinc-800 dark:bg-zinc-900/50"}`}>
              <h3 className="mb-2 flex justify-between px-1 text-xs font-semibold uppercase tracking-wide">
                {JOB_STATUSES[s]} <span className="muted">{col.length}</span>
              </h3>
              <ul className="min-h-16 space-y-2">
                {col.map((j) => (
                  <li key={j.id} draggable onDragStart={() => setDragId(j.id)}
                    className="cursor-grab rounded-lg border border-zinc-200 bg-white p-2 text-sm shadow-sm active:cursor-grabbing dark:border-zinc-700 dark:bg-zinc-900">
                    <Link href={`/jobs/${j.id}`} className="font-medium hover:underline">{j.company}</Link>
                    <p className="muted text-xs">{j.job_title}</p>
                    <p className="muted mt-1 text-[11px]">
                      {j.application_code} · {PORTALS[j.portal as keyof typeof PORTALS]}
                      {j.follow_up_date && <span className={j.follow_up_date <= today ? " text-amber-600" : ""}> · follow up {j.follow_up_date.slice(5)}</span>}
                    </p>
                    <div className="mt-1.5">
                      <label className="sr-only" htmlFor={`k-${j.id}`}>Move {j.company}</label>
                      <select id={`k-${j.id}`} className="input w-full py-1 text-xs" value={j.status} onChange={(e) => move(j.id, e.target.value as JobStatus)}>
                        {Object.entries(JOB_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}

/* ---------------- Interview rounds ---------------- */

function toLocalInput(iso: string | null, tz: string) {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(iso));
  const g = (t: string) => parts.find((p) => p.type === t)?.value;
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

function RoundForm({ applicationId, round, tz, onDone }: { applicationId: string; round?: InterviewRound; tz: string; onDone: () => void }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="space-y-3" onSubmit={(e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      start(async () => {
        const res = await safeAction(() => saveRound(applicationId, round?.id ?? null, form));
        setResult(res);
        if (res.ok) onDone();
      });
    }}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select name="round_type" label="Round" options={ROUND_TYPES} defaultValue={round?.round_type ?? "technical_1"} />
        <Input name="scheduled_at" label="Date and time" type="datetime-local" defaultValue={toLocalInput(round?.scheduled_at ?? null, tz)} />
        <Select name="outcome" label="Outcome" options={ROUND_OUTCOMES} defaultValue={round?.outcome ?? "scheduled"} />
      </div>
      <Area name="questions_asked" label="Questions asked" rows={4} defaultValue={round?.questions_asked} placeholder="One per line, write them down right after the call" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_1fr]">
        <Input name="self_score" label="Your score (0–100)" type="number" defaultValue={round?.self_score?.toString()} />
        <Input name="weak_topics" label="Weak topics (comma separated)" defaultValue={round?.weak_topics.join(", ")} />
      </div>
      <Area name="feedback" label="Feedback / notes" defaultValue={round?.feedback} />
      <Alert result={result && !result.ok ? result : null} />
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save round"}</button>
      </div>
    </form>
  );
}

export function AddRoundButton({ applicationId, tz }: { applicationId: string; tz: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn-secondary py-1.5" onClick={() => setOpen(true)}>+ Add round</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Interview round" wide>
        <RoundForm applicationId={applicationId} tz={tz} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function RoundActions({ applicationId, round, tz }: { applicationId: string; round: InterviewRound; tz: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex gap-1">
      <button className="btn-ghost py-1 text-xs" onClick={() => setOpen(true)}>Edit</button>
      <ActionButton className="btn-ghost py-1 text-xs text-red-600" confirmText="Delete this round?" action={() => deleteRound(applicationId, round.id)}>Delete</ActionButton>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit interview round" wide>
        <RoundForm applicationId={applicationId} round={round} tz={tz} onDone={() => setOpen(false)} />
      </Modal>
    </div>
  );
}

/* ---------------- Daily routine ---------------- */

export function DailyRoutine({ date, items, log }: {
  date: string;
  items: string[];
  log: { checklist: Record<string, boolean>; applications_submitted: number; recruiter_messages: number; follow_ups_sent: number; notes: string | null } | null;
}) {
  const [done, setDone] = useState<Set<string>>(new Set(Object.keys(log?.checklist ?? {}).filter((k) => log?.checklist[k])));
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      start(async () => setResult(await safeAction(() => saveJobSearchLog(date, form))));
    }}>
      <div>
        <div className="mb-2 flex justify-between text-sm"><span className="font-medium">Checklist</span><span className="muted tabular-nums">{items.filter((i) => done.has(i)).length}/{items.length}</span></div>
        <ul className="space-y-1.5">
          {items.map((i) => (
            <li key={i}>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="done" value={i} className="h-4 w-4 accent-indigo-600" checked={done.has(i)}
                  onChange={(e) => setDone((d) => { const n = new Set(d); if (e.target.checked) n.add(i); else n.delete(i); return n; })} />
                <span className={done.has(i) ? "muted line-through" : ""}>{i}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {([["applications_submitted", "Applications submitted"], ["recruiter_messages", "Recruiter messages"], ["follow_ups_sent", "Follow-ups sent"]] as const).map(([k, label]) => (
          <div key={k}>
            <label className="label" htmlFor={`d-${k}`}>{label}</label>
            <input id={`d-${k}`} name={k} type="number" min={0} className="input" defaultValue={log?.[k] ?? 0} />
          </div>
        ))}
      </div>
      <div>
        <label className="label" htmlFor="d-notes">Notes</label>
        <textarea id="d-notes" name="notes" rows={2} className="input" defaultValue={log?.notes ?? ""} />
      </div>
      <Alert result={result} />
      <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save today's log"}</button>
    </form>
  );
}

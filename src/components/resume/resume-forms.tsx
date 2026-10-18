"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  deleteComparison, deleteIntroScript, deleteResume, deleteStarStory, duplicateResume, runComparison,
  saveIntroScript, saveResume, saveStarStory, setPrimaryResume,
} from "@/app/actions/resume";
import { ActionButton, Alert, Modal, safeAction } from "@/components/ui/client";
import type { ActionResult, Resume, StarStory } from "@/lib/types";

function useSubmit(fn: (form: FormData) => Promise<ActionResult>, onOk?: () => void) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const el = e.currentTarget;
    start(async () => {
      const res = await safeAction(() => fn(form));
      setResult(res);
      if (res.ok) {
        onOk?.();
        if (!onOk) el.reset();
      }
    });
  };
  return { result, pending, onSubmit };
}

function Field({ name, label, rows, defaultValue, placeholder, required }: { name: string; label: string; rows?: number; defaultValue?: string | null; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="label" htmlFor={`f-${name}`}>{label}</label>
      {rows
        ? <textarea id={`f-${name}`} name={name} rows={rows} className="input" defaultValue={defaultValue ?? ""} placeholder={placeholder} required={required} />
        : <input id={`f-${name}`} name={name} className="input" defaultValue={defaultValue ?? ""} placeholder={placeholder} required={required} />}
    </div>
  );
}

/* ---------------- Resume versions ---------------- */

function ResumeForm({ resume, onDone }: { resume?: Resume; onDone: () => void }) {
  const { result, pending, onSubmit } = useSubmit((f) => saveResume(resume?.id ?? null, f), onDone);
  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field name="version_name" label="Version name" defaultValue={resume?.version_name} placeholder="e.g. SDET – product companies v2" required />
        <Field name="target_role" label="Target role" defaultValue={resume?.target_role} placeholder="QA Automation Engineer" />
      </div>
      <Field name="summary" label="Professional summary" rows={3} defaultValue={resume?.summary} />
      <Field name="skills" label="Skills (comma or one per line)" rows={2} defaultValue={resume?.skills.join(", ")} placeholder="Playwright, TypeScript, API testing, SQL, Jenkins" />
      <Field name="experience_text" label="Experience" rows={5} defaultValue={resume?.experience_text} placeholder="Company, role, dates and bullet points" />
      <Field name="projects_text" label="Projects" rows={4} defaultValue={resume?.projects_text} />
      <Field name="achievements" label="Measurable achievements" rows={3} defaultValue={resume?.achievements} placeholder="Only results you can back up in an interview" />
      <Field name="content" label="Anything else (education, certifications you actually hold)" rows={3} defaultValue={resume?.content} />
      <Alert result={result && !result.ok ? result : null} />
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save version"}</button>
      </div>
    </form>
  );
}

export function NewResumeButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>+ New resume version</button>
      <Modal open={open} onClose={() => setOpen(false)} title="New resume version" wide>
        <ResumeForm onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function ResumeActions({ resume }: { resume: Resume }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      <button className="btn-secondary py-1.5" onClick={() => setOpen(true)}>Edit</button>
      <ActionButton className="btn-secondary py-1.5" action={() => duplicateResume(resume.id)}>Duplicate</ActionButton>
      {!resume.is_primary && <ActionButton className="btn-secondary py-1.5" action={() => setPrimaryResume(resume.id)}>Make primary</ActionButton>}
      <ActionButton className="btn-danger py-1.5" confirmText={`Delete "${resume.version_name}"?`} action={() => deleteResume(resume.id)}>Delete</ActionButton>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit resume version" wide>
        <ResumeForm resume={resume} onDone={() => setOpen(false)} />
      </Modal>
    </div>
  );
}

/* ---------------- JD comparison ---------------- */

export function CompareForm({ resumes }: { resumes: Pick<Resume, "id" | "version_name" | "is_primary">[] }) {
  const { result, pending, onSubmit } = useSubmit(runComparison);
  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="c-resume">Resume version</label>
          <select id="c-resume" name="resume_id" className="input" defaultValue={resumes.find((r) => r.is_primary)?.id}>
            {resumes.map((r) => <option key={r.id} value={r.id}>{r.version_name}</option>)}
          </select>
        </div>
        <Field name="company" label="Company" />
        <Field name="job_title" label="Job title" />
      </div>
      <Field name="jd_text" label="Job description" rows={8} placeholder="Paste the full job description, including requirements" required />
      <Alert result={result} />
      <button className="btn-primary" disabled={pending}>{pending ? "Comparing…" : "Compare"}</button>
    </form>
  );
}

export function DeleteComparison({ id }: { id: string }) {
  return <ActionButton className="btn-ghost py-1 text-xs text-red-600" confirmText="Delete this comparison?" action={() => deleteComparison(id)}>Delete</ActionButton>;
}

/* ---------------- Self-introduction ---------------- */

const TARGET_WORDS = { "30s": 75, "60s": 150, "2min": 300 } as const;
const SECONDS = { "30s": 30, "60s": 60, "2min": 120 } as const;

function Stopwatch({ limit }: { limit: number }) {
  const [running, setRunning] = useState(false);
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  const over = secs > limit;
  return (
    <div className="flex items-center gap-2">
      <span className={`w-14 font-mono text-lg tabular-nums ${over ? "text-red-600" : ""}`} aria-live="polite">
        {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
      </span>
      <button type="button" className="btn-secondary py-1" onClick={() => setRunning((r) => !r)}>{running ? "Stop" : "Start rehearsal timer"}</button>
      <button type="button" className="btn-ghost py-1" onClick={() => { setRunning(false); setSecs(0); }}>Reset</button>
      <span className="muted text-xs">target {limit}s</span>
    </div>
  );
}

/** Records audio in the browser for self-review only. Nothing is uploaded or evaluated. */
function Recorder() {
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  useEffect(() => setSupported(typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined"), []);
  if (!supported) return <p className="muted text-xs">Audio recording isn&apos;t available in this browser. Rehearse aloud with the timer instead.</p>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={recording ? "btn-danger py-1" : "btn-secondary py-1"}
        onClick={async () => {
          if (recording) { rec.current?.stop(); setRecording(false); return; }
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const chunks: Blob[] = [];
            const r = new MediaRecorder(stream);
            r.ondataavailable = (e) => chunks.push(e.data);
            r.onstop = () => {
              stream.getTracks().forEach((t) => t.stop());
              setUrl(URL.createObjectURL(new Blob(chunks, { type: r.mimeType })));
            };
            r.start();
            rec.current = r;
            setRecording(true);
            setError(null);
          } catch {
            setError("Microphone access was blocked.");
          }
        }}>
        {recording ? "■ Stop recording" : "● Record yourself"}
      </button>
      {url && <audio controls src={url} className="h-8" />}
      {error && <span className="text-xs text-red-600">{error}</span>}
      <span className="muted text-xs">Stays in this browser only. Listen back and rate yourself; it isn&apos;t evaluated automatically.</span>
    </div>
  );
}

export function IntroPractice({ duration, initial }: { duration: "30s" | "60s" | "2min"; initial: string }) {
  const [text, setText] = useState(initial);
  const { result, pending, onSubmit } = useSubmit(saveIntroScript, () => {});
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const target = TARGET_WORDS[duration];
  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <input type="hidden" name="duration" value={duration} />
      <div>
        <label className="label" htmlFor="intro-script">Your {duration} script</label>
        <textarea id="intro-script" name="script" rows={duration === "2min" ? 12 : duration === "60s" ? 8 : 5} className="input leading-6"
          value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Present (current role) → past (relevant experience and a project) → future (why this role)" />
        <p className={`mt-1 text-xs ${words > target * 1.2 ? "text-amber-600" : "muted"}`}>
          {words} words · about {target} words fits {duration} at a natural speaking pace
        </p>
      </div>
      <Stopwatch limit={SECONDS[duration]} />
      <Recorder />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr]">
        <div>
          <label className="label" htmlFor="intro-rating">Self-rating (1–5)</label>
          <input id="intro-rating" name="self_rating" type="number" min={1} max={5} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="intro-feedback">Feedback to yourself</label>
          <input id="intro-feedback" name="feedback" className="input" placeholder="e.g. too fast at the start; mention API testing" />
        </div>
      </div>
      <Alert result={result} />
      <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save as new version"}</button>
    </form>
  );
}

export function DeleteIntro({ id }: { id: string }) {
  return <ActionButton className="btn-ghost py-1 text-xs text-red-600" confirmText="Delete this version?" action={() => deleteIntroScript(id)}>Delete</ActionButton>;
}

/* ---------------- STAR stories ---------------- */

function StarForm({ story, onDone }: { story?: StarStory; onDone: () => void }) {
  const { result, pending, onSubmit } = useSubmit((f) => saveStarStory(story?.id ?? null, f), onDone);
  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field name="title" label="Title" defaultValue={story?.title} placeholder="Production checkout bug" required />
        <Field name="prompt" label="Question it answers" defaultValue={story?.prompt} placeholder="Tell me about a difficult bug you found" />
      </div>
      <Field name="situation" label="Situation" rows={2} defaultValue={story?.situation} />
      <Field name="task" label="Task" rows={2} defaultValue={story?.task} />
      <Field name="action" label="Action (what you did)" rows={3} defaultValue={story?.action} />
      <Field name="result" label="Result (real outcome, ideally measurable)" rows={2} defaultValue={story?.result} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_160px]">
        <Field name="tags" label="Tags (comma separated)" defaultValue={story?.tags.join(", ")} placeholder="conflict, debugging, project" />
        <div>
          <label className="label" htmlFor="f-self_rating">Self-rating (1–5)</label>
          <input id="f-self_rating" name="self_rating" type="number" min={1} max={5} className="input" defaultValue={story?.self_rating ?? ""} />
        </div>
      </div>
      <Alert result={result && !result.ok ? result : null} />
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onDone}>Cancel</button>
        <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save story"}</button>
      </div>
    </form>
  );
}

export function NewStarButton({ prompt }: { prompt?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={prompt ? "btn-ghost py-1 text-xs" : "btn-primary"} onClick={() => setOpen(true)}>{prompt ? "Write story" : "+ New STAR story"}</button>
      <Modal open={open} onClose={() => setOpen(false)} title="STAR story" wide>
        <StarForm story={prompt ? ({ title: "", prompt, tags: [] } as unknown as StarStory) : undefined} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function StarActions({ story }: { story: StarStory }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex gap-1">
      <button className="btn-ghost py-1 text-xs" onClick={() => setOpen(true)}>Edit</button>
      <ActionButton className="btn-ghost py-1 text-xs text-red-600" confirmText={`Delete "${story.title}"?`} action={() => deleteStarStory(story.id)}>Delete</ActionButton>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit STAR story" wide>
        <StarForm story={story} onDone={() => setOpen(false)} />
      </Modal>
    </div>
  );
}

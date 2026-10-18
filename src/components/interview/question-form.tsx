"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteQuestion, saveQuestion, toggleBookmark } from "@/app/actions/questions";
import { Alert, Modal, safeAction } from "@/components/ui/client";
import { categoryLabel, DIFFICULTIES, QUESTION_CATEGORIES } from "@/lib/constants";
import type { ActionResult, InterviewQuestion } from "@/lib/types";

export function QuestionForm({ question, onDone }: { question?: InterviewQuestion; onDone: (id?: string) => void }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        start(async () => {
          const res = await safeAction(() => saveQuestion(question?.id ?? null, form));
          setResult(res);
          if (res.ok) onDone("id" in res ? (res.id as string | undefined) : undefined);
        });
      }}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="q-cat">Section</label>
          <select id="q-cat" name="category" className="input" defaultValue={question?.category ?? "playwright"}>
            {QUESTION_CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="q-topic">Topic</label>
          <input id="q-topic" name="topic" className="input" required defaultValue={question?.topic} />
        </div>
        <div>
          <label className="label" htmlFor="q-diff">Difficulty</label>
          <select id="q-diff" name="difficulty" className="input" defaultValue={question?.difficulty ?? "beginner"}>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="q-q">Question</label>
        <textarea id="q-q" name="question" className="input" rows={3} required defaultValue={question?.question} />
      </div>
      <div>
        <label className="label" htmlFor="q-points">Expected answer points (one per line)</label>
        <textarea id="q-points" name="expected_points" className="input" rows={4} defaultValue={question?.expected_points.join("\n")} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="q-hints">Hints (one per line)</label>
          <textarea id="q-hints" name="hints" className="input" rows={3} defaultValue={question?.hints.join("\n")} />
        </div>
        <div>
          <label className="label" htmlFor="q-follow">Follow-up questions (one per line)</label>
          <textarea id="q-follow" name="follow_ups" className="input" rows={3} defaultValue={question?.follow_ups.join("\n")} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="q-model">Model answer</label>
        <textarea id="q-model" name="model_answer" className="input" rows={5} defaultValue={question?.model_answer ?? ""} />
      </div>
      <Alert result={result && !result.ok ? result : null} />
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={() => onDone()}>Cancel</button>
        <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : question ? "Save changes" : "Add question"}</button>
      </div>
    </form>
  );
}

export function AddQuestionButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <button className="btn-secondary" onClick={() => setOpen(true)}>+ Add question</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add interview question" wide>
        <QuestionForm onDone={(id) => { setOpen(false); if (id) router.push(`/interview/${id}`); }} />
      </Modal>
    </>
  );
}

export function EditQuestionButtons({ question }: { question: InterviewQuestion }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <>
      <button className="btn-secondary" onClick={() => setOpen(true)}>Edit</button>
      <button className="btn-danger" disabled={pending}
        onClick={() => {
          if (!confirm("Delete this question and all its saved attempts? This cannot be undone.")) return;
          start(async () => {
            const res = await safeAction(() => deleteQuestion(question.id));
            if (res.ok) router.push("/interview");
            else setError(res.error);
          });
        }}>Delete</button>
      {error && <span role="alert" className="text-sm text-red-600">{error}</span>}
      <Modal open={open} onClose={() => setOpen(false)} title="Edit question" wide>
        <QuestionForm question={question} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

export function BookmarkButton({ id, bookmarked }: { id: string; bookmarked: boolean }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useState(bookmarked);
  return (
    <button type="button" className="btn-ghost px-2" disabled={pending} aria-pressed={value}
      aria-label={value ? "Remove bookmark" : "Bookmark question"} title={value ? "Bookmarked" : "Bookmark"}
      onClick={() => {
        const next = !value;
        setValue(next);
        start(async () => {
          const res = await safeAction(() => toggleBookmark(id, next));
          if (!res.ok) setValue(!next);
        });
      }}>
      <span className={value ? "text-amber-500" : "muted"}>{value ? "★" : "☆"}</span>
    </button>
  );
}

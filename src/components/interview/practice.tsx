"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { saveQuestion, setQuestionStatus, submitAttempt } from "@/app/actions/questions";
import { Badge } from "@/components/ui";
import { Alert, safeAction } from "@/components/ui/client";
import { QUESTION_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import type { ActionResult, InterviewQuestion, QuestionStatus } from "@/lib/types";

type Step = "answer" | "review" | "result";
type Result = { score: number; status: QuestionStatus; feedback: string; reviseOn: string };

function Rating({ name, label, value, onChange, low, high }: { name: string; label: string; value: number; onChange: (v: number) => void; low: string; high: string }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex items-center gap-1">
        <span className="muted mr-1 text-xs">{low}</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border text-sm ${value === n ? "border-indigo-600 bg-indigo-600 text-white" : "border-zinc-300 dark:border-zinc-700"}`}>
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onChange(n)} className="sr-only" />
            {n}
          </label>
        ))}
        <span className="muted ml-1 text-xs">{high}</span>
      </div>
    </fieldset>
  );
}

export function Practice({ question, nextHref, nextLabel = "Next question →", mockInterviewId = null }: {
  question: InterviewQuestion; nextHref: string; nextLabel?: string; mockInterviewId?: string | null;
}) {
  const draftKey = `draft:${question.id}`;
  const [step, setStep] = useState<Step>("answer");
  const [answer, setAnswer] = useState("");
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [hints, setHints] = useState(0);
  const [revealedEarly, setRevealedEarly] = useState(false);
  const [covered, setCovered] = useState<string[]>([]);
  const [correctness, setCorrectness] = useState(3);
  const [clarity, setClarity] = useState(3);
  const [confidence, setConfidence] = useState(3);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<ActionResult | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, start] = useTransition();

  // Restore an unsent draft (per-browser convenience only — attempts are saved to the database).
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(draftKey) ?? "null");
      if (d?.answer) setAnswer(d.answer);
      if (d?.code) { setCode(d.code); setShowCode(true); }
    } catch {}
  }, [draftKey]);
  useEffect(() => {
    try {
      if (answer || code) localStorage.setItem(draftKey, JSON.stringify({ answer, code }));
    } catch {}
  }, [answer, code, draftKey]);

  function reset() {
    setStep("answer"); setAnswer(""); setCode(""); setShowCode(false); setHints(0); setRevealedEarly(false);
    setCovered([]); setCorrectness(3); setClarity(3); setConfidence(3); setNotes(""); setResult(null); setError(null);
  }

  function save() {
    start(async () => {
      const res = await safeAction(() => submitAttempt(question.id, {
        answer, code_snippet: code.trim() || null, hints_used: hints, revealed_answer: revealedEarly,
        points_covered: covered, correctness, clarity, confidence, notes: notes.trim() || null,
      }, mockInterviewId));
      if (!res.ok) { setError(res); return; }
      try { localStorage.removeItem(draftKey); } catch {}
      setResult(res as unknown as Result);
      setStep("result");
    });
  }

  const modelAnswer = question.model_answer && (
    <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="muted mb-1 text-xs font-medium uppercase">Model answer</div>
      <p className="whitespace-pre-wrap text-sm">{question.model_answer}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="mb-2 flex flex-wrap gap-2 text-xs">
          <Badge tone="indigo">{question.topic}</Badge>
          <Badge>{question.difficulty}</Badge>
          <Badge tone={question.status === "needs_improvement" ? "amber" : question.status === "strong" || question.status === "ready" ? "green" : "zinc"}>
            {QUESTION_STATUSES[question.status]}
          </Badge>
        </div>
        <p className="text-lg font-medium leading-snug">{question.question}</p>
      </div>

      {step === "answer" && (
        <div className="card space-y-3">
          <div>
            <label className="label" htmlFor="answer">Your answer</label>
            <textarea id="answer" className="input min-h-48 leading-6" value={answer} onChange={(e) => setAnswer(e.target.value)}
              placeholder="Answer as you would in the interview: definition, how it works, an example, trade-offs." />
            <p className="muted mt-1 text-xs">{answer.trim().split(/\s+/).filter(Boolean).length} words · draft kept in this browser until you save</p>
          </div>
          {showCode ? (
            <div>
              <label className="label" htmlFor="code">Code snippet (optional)</label>
              <textarea id="code" className="input min-h-32 font-mono text-xs" value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} />
            </div>
          ) : (
            <button type="button" className="btn-ghost px-0 text-sm" onClick={() => setShowCode(true)}>+ Add code snippet</button>
          )}

          {hints > 0 && (
            <ol className="space-y-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {question.hints.slice(0, hints).map((h, i) => <li key={i}><b>Hint {i + 1}:</b> {h}</li>)}
            </ol>
          )}
          {revealedEarly && modelAnswer}

          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={!answer.trim()} onClick={() => setStep("review")}>Submit answer for review</button>
            {hints < question.hints.length && (
              <button className="btn-secondary" onClick={() => setHints((h) => h + 1)}>Show hint ({hints + 1}/{question.hints.length})</button>
            )}
            {!revealedEarly && question.model_answer && (
              <button className="btn-ghost" onClick={() => {
                if (confirm("Reveal the model answer before attempting? Your score for this attempt will be capped at 60.")) setRevealedEarly(true);
              }}>I&apos;m stuck — reveal answer</button>
            )}
          </div>
        </div>
      )}

      {step === "review" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card space-y-3">
            <h2 className="text-sm font-semibold">Your answer</h2>
            <p className="whitespace-pre-wrap text-sm">{answer}</p>
            {code && <pre className="overflow-x-auto rounded-lg bg-zinc-100 p-3 text-xs dark:bg-zinc-950">{code}</pre>}
            <button className="btn-ghost px-0 text-sm" onClick={() => setStep("answer")}>← Edit answer</button>
          </div>
          <div className="card space-y-4">
            <h2 className="text-sm font-semibold">Review it honestly</h2>
            {question.expected_points.length > 0 && (
              <fieldset>
                <legend className="label">Which expected points did your answer cover?</legend>
                <ul className="space-y-1.5">
                  {question.expected_points.map((p) => (
                    <li key={p}>
                      <label className="flex items-start gap-2 text-sm">
                        <input type="checkbox" className="mt-1 accent-indigo-600" checked={covered.includes(p)}
                          onChange={(e) => setCovered((c) => (e.target.checked ? [...c, p] : c.filter((x) => x !== p)))} />
                        {p}
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>
            )}
            {modelAnswer}
            <Rating name="correctness" label="Correctness" value={correctness} onChange={setCorrectness} low="wrong" high="spot on" />
            <Rating name="clarity" label="Clarity" value={clarity} onChange={setClarity} low="rambling" high="crisp" />
            <Rating name="confidence" label="Confidence" value={confidence} onChange={setConfidence} low="guessing" high="certain" />
            <div>
              <label className="label" htmlFor="notes">Notes for next time (optional)</label>
              <textarea id="notes" className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Alert result={error} />
            <button className="btn-primary" disabled={pending} onClick={save}>{pending ? "Saving…" : "Save attempt"}</button>
            <p className="muted text-xs">Score = 50% points covered + 30% correctness + 20% clarity, minus 5 per hint. This is self-assessed; AI feedback is planned for Phase 7.</p>
          </div>
        </div>
      )}

      {step === "result" && result && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card space-y-3">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-semibold tabular-nums">{result.score}</span>
              <span className="muted">/ 100</span>
              <Badge tone={result.status === "needs_improvement" ? "amber" : result.status === "attempted" ? "zinc" : "green"}>{QUESTION_STATUSES[result.status]}</Badge>
            </div>
            <p className="text-sm">Saved. Next revision: <b>{formatDate(result.reviseOn, { weekday: "short" })}</b></p>
            <pre className="whitespace-pre-wrap font-sans text-sm">{result.feedback}</pre>
            <div className="flex flex-wrap gap-2">
              <Link href={nextHref} className="btn-primary">{nextLabel}</Link>
              {!mockInterviewId && <button className="btn-secondary" onClick={reset}>Try again</button>}
            </div>
          </div>
          <FollowUps question={question} />
        </div>
      )}
    </div>
  );
}

function FollowUps({ question }: { question: InterviewQuestion }) {
  const [added, setAdded] = useState<string[]>([]);
  const [pending, start] = useTransition();
  if (!question.follow_ups.length) return null;
  return (
    <div className="card">
      <h2 className="mb-2 text-sm font-semibold">Interviewer follow-ups</h2>
      <p className="muted mb-3 text-xs">Answer these aloud now. Add any you struggle with as a tracked question.</p>
      <ul className="space-y-2">
        {question.follow_ups.map((f) => (
          <li key={f} className="flex items-start justify-between gap-2 text-sm">
            <span>{f}</span>
            <button className="btn-ghost shrink-0 py-1 text-xs" disabled={pending || added.includes(f)}
              onClick={() => start(async () => {
                const fd = new FormData();
                fd.set("category", question.category);
                fd.set("topic", question.topic);
                fd.set("difficulty", question.difficulty);
                fd.set("question", f);
                const res = await safeAction(() => saveQuestion(null, fd));
                if (res.ok) setAdded((a) => [...a, f]);
              })}>
              {added.includes(f) ? "Added ✓" : "+ Track"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StatusSelect({ id, status }: { id: string; status: QuestionStatus }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <label className="sr-only" htmlFor="q-status">Status</label>
      <select id="q-status" className="input w-auto py-1.5" value={status} disabled={pending}
        onChange={(e) => start(async () => {
          const res = await safeAction(() => setQuestionStatus(id, e.target.value as QuestionStatus));
          setErr(res.ok ? null : res.error);
        })}>
        {Object.entries(QUESTION_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      {err && <span role="alert" className="text-xs text-red-600">{err}</span>}
    </span>
  );
}

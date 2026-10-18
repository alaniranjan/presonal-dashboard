"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { abandonMock, deleteMock, finishMock, startMock } from "@/app/actions/mock";
import { ActionButton, Alert, safeAction } from "@/components/ui/client";
import { categoryLabel, QUESTION_CATEGORIES } from "@/lib/constants";
import type { ActionResult } from "@/lib/types";

export function StartMockForm() {
  const router = useRouter();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      start(async () => {
        const res = await safeAction(() => startMock(form));
        setResult(res);
        if (res.ok && "id" in res && res.id) router.push(`/mock-interviews/${res.id}`);
      });
    }}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="m-type">Interview type</label>
          <select id="m-type" name="type" className="input" defaultValue="technical">
            <option value="technical">Technical (Playwright, framework, API, CI/CD, SQL…)</option>
            <option value="coding">Coding & problem solving</option>
            <option value="hr">HR & managerial</option>
            <option value="mixed">Full mixed round</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="m-count">Number of questions</label>
          <select id="m-count" name="count" className="input" defaultValue="5">
            {[3, 5, 7, 10].map((n) => <option key={n} value={n}>{n} questions</option>)}
          </select>
        </div>
      </div>
      <fieldset>
        <legend className="label">Limit to sections (optional; leave empty to use the type&apos;s sections)</legend>
        <div className="flex flex-wrap gap-2">
          {QUESTION_CATEGORIES.map((c) => (
            <label key={c} className="flex items-center gap-1.5 rounded-full border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-700">
              <input type="checkbox" name="categories" value={c} className="accent-indigo-600" />{categoryLabel(c)}
            </label>
          ))}
        </div>
      </fieldset>
      <Alert result={result && !result.ok ? result : null} />
      <button className="btn-primary" disabled={pending}>{pending ? "Preparing…" : "Start mock interview"}</button>
      <p className="muted text-xs">Questions due for revision and weak answers come first. One question at a time; answer before you see the expected points.</p>
    </form>
  );
}

export function ElapsedTimer({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return <span className="font-mono tabular-nums">--:--</span>;
  const s = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
  return <span className="font-mono tabular-nums" aria-label="Elapsed time">{Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}</span>;
}

export function FinishMockButton({ id, label = "Finish and see results" }: { id: string; label?: string }) {
  const router = useRouter();
  return <ActionButton className="btn-primary" action={() => finishMock(id)} onDone={(r) => r.ok && router.refresh()}>{label}</ActionButton>;
}

export function AbandonMockButton({ id }: { id: string }) {
  const router = useRouter();
  return <ActionButton className="btn-ghost" confirmText="End this mock interview without a score? Answers you saved stay in your history."
    action={() => abandonMock(id)} onDone={(r) => r.ok && router.push("/mock-interviews")}>End without scoring</ActionButton>;
}

export function DeleteMockButton({ id }: { id: string }) {
  return <ActionButton className="btn-ghost py-1 text-xs text-red-600" confirmText="Delete this mock interview record? Your answers stay in each question's history."
    action={() => deleteMock(id)}>Delete</ActionButton>;
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { generateStarterPlan } from "@/app/actions/setup";
import { Alert, safeAction } from "@/components/ui/client";
import type { ActionResult } from "@/lib/types";

export function GeneratePlan({ today }: { today: string }) {
  const [date, setDate] = useState(today);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="card border-indigo-200 bg-indigo-50/50 dark:border-indigo-900 dark:bg-indigo-950/30">
      <h2 className="text-lg font-semibold">Start your six-month plan</h2>
      <p className="muted mt-1 max-w-2xl text-sm">
        This copies the starter curriculum into your account: 6 months, 24 weeks, 144 daily tasks with resources and
        completion criteria, plus a starter bank of interview questions across all 10 categories. Nothing is marked
        complete, and you can edit, reschedule or delete anything afterwards.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label" htmlFor="start">Start date</label>
          <input id="start" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <button className="btn-primary" disabled={pending || !date}
          onClick={() => start(async () => {
            const res = await safeAction(() => generateStarterPlan(date));
            setResult(res);
            if (res.ok) router.refresh();
          })}>
          {pending ? "Creating your plan…" : "Create my plan"}
        </button>
      </div>
      <div className="mt-3"><Alert result={result} /></div>
    </div>
  );
}

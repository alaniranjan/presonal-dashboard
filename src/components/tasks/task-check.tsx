"use client";

import { useState, useTransition } from "react";
import { setTaskStatus } from "@/app/actions/tasks";
import { safeAction } from "@/components/ui/client";
import type { TaskStatus } from "@/lib/types";

/** Checkbox that marks a task completed / not started. Completion only happens on this explicit click. */
export function TaskCheck({ id, status, title }: { id: string; status: TaskStatus; title: string }) {
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const checked = optimistic ?? status === "completed";

  return (
    <span className="inline-flex items-center">
      <input
        type="checkbox"
        className="h-4 w-4 cursor-pointer accent-indigo-600"
        checked={checked}
        disabled={pending}
        aria-label={`Mark "${title}" ${checked ? "not completed" : "completed"}`}
        onChange={(e) => {
          const next = e.target.checked;
          setOptimistic(next);
          setError(null);
          start(async () => {
            const res = await safeAction(() => setTaskStatus(id, next ? "completed" : "not_started"));
            if (!res.ok) {
              setError(res.error);
              setOptimistic(null);
            } else {
              setOptimistic(null);
            }
          });
        }}
      />
      {error && <span role="alert" className="ml-2 text-xs text-red-600">{error}</span>}
    </span>
  );
}

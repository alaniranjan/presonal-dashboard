"use client";

import { useState, useTransition } from "react";
import { saveChecklistItems } from "@/app/actions/jobs";
import { Alert, safeAction } from "@/components/ui/client";
import type { ActionResult } from "@/lib/types";

export function ChecklistForm({ items }: { items: string[] }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="card max-w-3xl space-y-3" onSubmit={(e) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      start(async () => setResult(await safeAction(() => saveChecklistItems(form))));
    }}>
      <h2 className="font-semibold">Daily job-search routine</h2>
      <label className="label" htmlFor="items">Checklist items (one per line)</label>
      <textarea id="items" name="items" rows={10} className="input" defaultValue={items.join("\n")} />
      <Alert result={result} />
      <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save checklist"}</button>
    </form>
  );
}

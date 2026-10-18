"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/app/actions/profile";
import { Alert, safeAction } from "@/components/ui/client";
import type { ActionResult, Profile } from "@/lib/types";

const FIELDS: { name: keyof Profile; label: string; type?: string; placeholder?: string; step?: string }[] = [
  { name: "full_name", label: "Full name" },
  { name: "target_role", label: "Target role" },
  { name: "experience_years", label: "Experience (years)", type: "number", step: "0.5" },
  { name: "location", label: "Location", placeholder: "e.g. Bengaluru / Remote" },
  { name: "current_ctc", label: "Current CTC", placeholder: "e.g. 6 LPA" },
  { name: "target_salary", label: "Target salary", placeholder: "e.g. 10–12 LPA" },
  { name: "notice_period", label: "Notice period", placeholder: "e.g. 30 days" },
  { name: "weekly_hours", label: "Weekly availability (hours)", type: "number", step: "0.5" },
  { name: "daily_study_minutes", label: "Daily study target (minutes)", type: "number" },
  { name: "timezone", label: "Timezone", placeholder: "Asia/Kolkata" },
];

export function ProfileForm({ profile }: { profile: Profile }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="card max-w-3xl space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        start(async () => setResult(await safeAction(() => updateProfile(form))));
      }}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label className="label" htmlFor={`p-${f.name}`}>{f.label}</label>
            <input id={`p-${f.name}`} name={f.name} type={f.type ?? "text"} step={f.step} placeholder={f.placeholder}
              className="input" defaultValue={(profile[f.name] as string | number | null) ?? ""} />
          </div>
        ))}
      </div>
      <Alert result={result} />
      <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save profile"}</button>
    </form>
  );
}

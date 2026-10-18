"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, int, lines, str } from "@/lib/action-utils";
import { JOB_STATUSES, PORTALS, ROUND_OUTCOMES, ROUND_TYPES, WORK_MODES } from "@/lib/constants";
import { getTimezone } from "@/lib/data";
import { todayIn } from "@/lib/dates";
import { one, query, USER_ID } from "@/lib/db";
import type { ActionResult, JobStatus } from "@/lib/types";

function refresh(id?: string) {
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  if (id) revalidatePath(`/jobs/${id}`);
}

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.").nullable();
const keys = <T extends object>(o: T) => Object.keys(o) as [string, ...string[]];

const jobSchema = z.object({
  company: z.string().min(1, "Company is required.").max(200),
  job_title: z.string().min(1, "Job title is required.").max(200),
  job_url: z.string().url("Job URL must be a full link (https://…).").nullable(),
  portal: z.enum(keys(PORTALS)),
  location: z.string().max(200).nullable(),
  work_mode: z.enum(keys(WORK_MODES)).nullable(),
  job_description: z.string().max(50000).nullable(),
  required_skills: z.array(z.string().max(100)).max(100),
  experience_required: z.string().max(100).nullable(),
  salary_range: z.string().max(100).nullable(),
  date_found: date,
  date_applied: date,
  resume_id: z.string().uuid().nullable(),
  recruiter_name: z.string().max(200).nullable(),
  recruiter_contact: z.string().max(300).nullable(),
  referral_details: z.string().max(2000).nullable(),
  status: z.enum(keys(JOB_STATUSES)),
  follow_up_date: date,
  recruiter_feedback: z.string().max(10000).nullable(),
  rejection_reason: z.string().max(2000).nullable(),
  offer_details: z.string().max(5000).nullable(),
  next_action: z.string().max(1000).nullable(),
  notes: z.string().max(20000).nullable(),
});
const FIELDS = Object.keys(jobSchema.shape) as (keyof z.infer<typeof jobSchema>)[];

export type Duplicate = { id: string; company: string; job_title: string; status: string; application_code: string | null };
export type SaveJobResult = (ActionResult & { id?: string; duplicates?: Duplicate[] });

export async function saveJob(id: string | null, form: FormData, allowDuplicate = false): Promise<SaveJobResult> {
  const parsed = jobSchema.safeParse({
    ...Object.fromEntries(FIELDS.map((f) => [f, str(form, f)])),
    portal: str(form, "portal") ?? "linkedin",
    status: str(form, "status") ?? "saved",
    required_skills: lines(form, "required_skills").flatMap((l) => l.split(",")).map((s) => s.trim()).filter(Boolean),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const j = parsed.data;

  try {
    if (!allowDuplicate) {
      const duplicates = await query<Duplicate>(
        `select id, company, job_title, status, application_code from job_applications
         where ($1::uuid is null or id <> $1)
           and ((lower(trim(company)) = lower(trim($2)) and lower(trim(job_title)) = lower(trim($3)))
                or ($4::text is not null and job_url = $4))
         limit 5`,
        [id, j.company, j.job_title, j.job_url],
      );
      if (duplicates.length) {
        return { ok: false, error: "This looks like an application you already saved.", duplicates };
      }
    }

    const values = FIELDS.map((f) => j[f]);
    let appId = id;
    if (id) {
      await query(`update job_applications set ${FIELDS.map((f, i) => `${f} = $${i + 2}`).join(", ")} where id = $1`, [id, ...values]);
    } else {
      const row = await one<{ id: string }>(
        `insert into job_applications (${FIELDS.join(", ")}, application_code)
         values (${FIELDS.map((_, i) => `$${i + 1}`).join(", ")},
                 'APP-' || lpad((coalesce((select max(substring(application_code from 5)::int) from job_applications
                                           where application_code ~ '^APP-[0-9]+$'), 0) + 1)::text, 4, '0'))
         returning id`,
        values,
      );
      appId = row!.id;
    }
    refresh(appId!);
    return { ok: true, message: id ? "Application saved." : "Application added.", id: appId! };
  } catch (err) {
    return fail(err);
  }
}

export async function setJobStatus(id: string, status: JobStatus): Promise<ActionResult> {
  if (!(status in JOB_STATUSES)) return { ok: false, error: "Unknown status." };
  try {
    // Moving to Applied for the first time records the application date.
    await query(
      `update job_applications set status = $2,
         date_applied = case when $2 = 'applied' and date_applied is null then $3::date else date_applied end
       where id = $1`,
      [id, status, todayIn(await getTimezone())],
    );
  } catch (err) {
    return fail(err);
  }
  refresh(id);
  return { ok: true };
}

export async function deleteJob(id: string): Promise<ActionResult> {
  try {
    await query("delete from job_applications where id = $1", [id]);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true };
}

const roundSchema = z.object({
  round_type: z.enum(keys(ROUND_TYPES)),
  scheduled_at: z.string().nullable(),
  questions_asked: z.string().max(20000).nullable(),
  self_score: z.number().int().min(0).max(100).nullable(),
  weak_topics: z.array(z.string().max(100)).max(30),
  feedback: z.string().max(10000).nullable(),
  outcome: z.enum(keys(ROUND_OUTCOMES)),
});

export async function saveRound(applicationId: string, id: string | null, form: FormData): Promise<ActionResult> {
  const parsed = roundSchema.safeParse({
    round_type: str(form, "round_type") ?? "",
    scheduled_at: str(form, "scheduled_at"),
    questions_asked: str(form, "questions_asked"),
    self_score: int(form, "self_score"),
    weak_topics: (str(form, "weak_topics") ?? "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
    feedback: str(form, "feedback"),
    outcome: str(form, "outcome") ?? "scheduled",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const r = parsed.data;
  try {
    const tz = await getTimezone();
    // datetime-local values are wall-clock times in the user's timezone.
    const values = [r.round_type, r.scheduled_at, tz, r.questions_asked, r.self_score, r.weak_topics, r.feedback, r.outcome];
    if (id) {
      await query(
        `update interview_rounds set round_type = $2, scheduled_at = ($3::timestamp at time zone $4), questions_asked = $5,
           self_score = $6, weak_topics = $7, feedback = $8, outcome = $9 where id = $1`,
        [id, ...values],
      );
    } else {
      await query(
        `insert into interview_rounds (application_id, round_type, scheduled_at, questions_asked, self_score, weak_topics, feedback, outcome)
         values ($1, $2, ($3::timestamp at time zone $4), $5, $6, $7, $8, $9)`,
        [applicationId, ...values],
      );
    }
  } catch (err) {
    return fail(err);
  }
  refresh(applicationId);
  return { ok: true, message: "Round saved." };
}

export async function deleteRound(applicationId: string, id: string): Promise<ActionResult> {
  try {
    await query("delete from interview_rounds where id = $1", [id]);
  } catch (err) {
    return fail(err);
  }
  refresh(applicationId);
  return { ok: true };
}

export async function saveJobSearchLog(logDate: string, form: FormData): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) return { ok: false, error: "Invalid date." };
  const checklist = Object.fromEntries(form.getAll("done").map((v) => [String(v), true]));
  const counts = ["applications_submitted", "recruiter_messages", "follow_ups_sent"].map((k) => Math.max(0, Math.min(1000, int(form, k) ?? 0)));
  try {
    await query(
      `insert into job_search_logs (log_date, checklist, applications_submitted, recruiter_messages, follow_ups_sent, notes)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (user_id, log_date) do update set checklist = excluded.checklist,
         applications_submitted = excluded.applications_submitted, recruiter_messages = excluded.recruiter_messages,
         follow_ups_sent = excluded.follow_ups_sent, notes = excluded.notes`,
      [logDate, JSON.stringify(checklist), ...counts, str(form, "notes")],
    );
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Today's job-search log saved." };
}

export async function saveChecklistItems(form: FormData): Promise<ActionResult> {
  const items = lines(form, "items").slice(0, 30).map((i) => i.slice(0, 200));
  if (!items.length) return { ok: false, error: "Add at least one checklist item." };
  try {
    await query("update profiles set job_checklist = $2 where id = $1", [USER_ID, items]);
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/settings");
  refresh();
  return { ok: true, message: "Checklist saved." };
}

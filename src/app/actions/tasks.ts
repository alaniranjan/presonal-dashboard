"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, int, lines, str } from "@/lib/action-utils";
import { CATEGORIES, DIFFICULTIES, TASK_STATUSES } from "@/lib/constants";
import { getTimezone } from "@/lib/data";
import { addDays, todayIn } from "@/lib/dates";
import { query } from "@/lib/db";
import type { ActionResult, TaskStatus } from "@/lib/types";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required.").max(300),
  description: z.string().max(5000).nullable(),
  category: z.enum(Object.keys(CATEGORIES) as [string, ...string[]]),
  difficulty: z.enum(DIFFICULTIES),
  estimated_minutes: z.number().int().min(0).max(1440),
  actual_minutes: z.number().int().min(0).max(1440).nullable(),
  planned_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  status: z.enum(Object.keys(TASK_STATUSES) as [TaskStatus, ...TaskStatus[]]),
  notes: z.string().max(10000).nullable(),
  resource_links: z.array(z.string().url("Resource links must be full URLs (https://…).")).max(20),
  completion_criteria: z.string().max(2000).nullable(),
  rating: z.number().int().min(1).max(5).nullable(),
  confidence: z.number().int().min(1).max(5).nullable(),
});

function parseTask(form: FormData) {
  return taskSchema.safeParse({
    title: str(form, "title") ?? "",
    description: str(form, "description"),
    category: str(form, "category") ?? "",
    difficulty: str(form, "difficulty") ?? "beginner",
    estimated_minutes: int(form, "estimated_minutes") ?? 30,
    actual_minutes: int(form, "actual_minutes"),
    planned_date: str(form, "planned_date"),
    status: str(form, "status") ?? "not_started",
    notes: str(form, "notes"),
    resource_links: lines(form, "resource_links"),
    completion_criteria: str(form, "completion_criteria"),
    rating: int(form, "rating"),
    confidence: int(form, "confidence"),
  });
}

function refresh() {
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/roadmap");
}

export async function saveTask(id: string | null, form: FormData): Promise<ActionResult> {
  const parsed = parseTask(form);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const values = [d.title, d.description, d.category, d.difficulty, d.estimated_minutes, d.actual_minutes, d.planned_date,
    d.status, d.notes, d.resource_links, d.completion_criteria, d.rating, d.confidence];
  try {
    if (id) {
      // Keep the original completion time when editing an already-completed task.
      await query(
        `update learning_tasks set title = $2, description = $3, category = $4, difficulty = $5, estimated_minutes = $6,
           actual_minutes = $7, planned_date = $8, status = $9, notes = $10, resource_links = $11, completion_criteria = $12,
           rating = $13, confidence = $14,
           completed_at = case when $9 = 'completed' then coalesce(completed_at, now()) else null end
         where id = $1`,
        [id, ...values],
      );
    } else {
      await query(
        `insert into learning_tasks (title, description, category, difficulty, estimated_minutes, actual_minutes, planned_date,
           status, notes, resource_links, completion_criteria, rating, confidence, completed_at, is_custom)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, case when $8 = 'completed' then now() end, true)`,
        values,
      );
    }
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: id ? "Task updated." : "Task added." };
}

export async function setTaskStatus(
  id: string,
  status: TaskStatus,
  actualMinutes?: number | null,
): Promise<ActionResult> {
  if (!(status in TASK_STATUSES)) return { ok: false, error: "Unknown status." };
  if (actualMinutes != null && (!Number.isInteger(actualMinutes) || actualMinutes < 0 || actualMinutes > 1440)) {
    return { ok: false, error: "Time spent must be between 0 and 1440 minutes." };
  }
  try {
    await query(
      `update learning_tasks set status = $2,
         completed_at = case when $2 = 'completed' then now() else null end,
         actual_minutes = case when $3 then $4::int else actual_minutes end
       where id = $1`,
      [id, status, actualMinutes !== undefined, actualMinutes ?? null],
    );
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true };
}

export async function postponeTask(id: string, toDate: string): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(toDate)) return { ok: false, error: "Pick a valid date." };
  try {
    await query("update learning_tasks set planned_date = $2 where id = $1 and status <> 'completed'", [id, toDate]);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Task rescheduled." };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  try {
    await query("delete from learning_tasks where id = $1", [id]);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Task deleted." };
}

/**
 * Moves every overdue, unfinished task forward, spreading them over the next days
 * so that no single day gets more than `perDay` of them. Completed tasks are never touched.
 */
export async function rescheduleOverdue(perDay = 2): Promise<ActionResult> {
  try {
    const today = todayIn(await getTimezone());
    const overdue = await query<{ id: string }>(
      "select id from learning_tasks where planned_date < $1 and status <> 'completed' order by planned_date, created_at",
      [today],
    );
    if (!overdue.length) return { ok: true, message: "Nothing overdue." };
    await query(
      `update learning_tasks t set planned_date = v.d
       from jsonb_to_recordset($1::jsonb) as v(id uuid, d date) where t.id = v.id`,
      [JSON.stringify(overdue.map((t, i) => ({ id: t.id, d: addDays(today, Math.floor(i / perDay)) })))],
    );
    refresh();
    return { ok: true, message: `Rescheduled ${overdue.length} overdue task(s) from today onward.` };
  } catch (err) {
    return fail(err);
  }
}

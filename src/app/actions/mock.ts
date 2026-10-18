"use server";

import { revalidatePath } from "next/cache";
import { fail, int, str } from "@/lib/action-utils";
import { categoryLabel, QUESTION_CATEGORIES } from "@/lib/constants";
import { getTimezone } from "@/lib/data";
import { todayIn } from "@/lib/dates";
import { one, query } from "@/lib/db";
import type { ActionResult } from "@/lib/types";

const TYPES = {
  technical: { label: "Technical", categories: ["js-ts", "playwright", "framework", "api", "cicd", "sql", "manual", "debugging"] },
  coding: { label: "Coding", categories: ["coding", "js-ts"] },
  hr: { label: "HR & managerial", categories: ["hr"] },
  mixed: { label: "Full mixed round", categories: QUESTION_CATEGORIES as string[] },
} as const;

/**
 * Picks questions that need practice most: due revisions, then weak answers,
 * then never-attempted, then least recently practised — shuffled within each group.
 */
export async function startMock(form: FormData): Promise<ActionResult & { id?: string }> {
  const type = (str(form, "type") ?? "technical") as keyof typeof TYPES;
  if (!(type in TYPES)) return { ok: false, error: "Pick an interview type." };
  const count = Math.max(3, Math.min(10, int(form, "count") ?? 5));
  const picked = form.getAll("categories").map(String).filter((c) => QUESTION_CATEGORIES.includes(c as never));
  const categories = picked.length ? picked : [...TYPES[type].categories];

  try {
    const today = todayIn(await getTimezone());
    const rows = await query<{ id: string }>(
      `select q.id from interview_questions q
       left join revision_queue r on r.question_id = q.id and r.completed_at is null
       where q.category = any($1)
       order by case
         when r.due_date <= $2 then 0
         when q.status = 'needs_improvement' then 1
         when q.attempt_count = 0 then 2
         else 3 end,
         q.last_attempted_at asc nulls first, random()
       limit $3`,
      [categories, today, count],
    );
    if (rows.length === 0) return { ok: false, error: "No questions in those sections yet. Add some in Interview Practice." };
    const title = `${TYPES[type].label} mock: ${categories.length > 3 ? `${categories.length} sections` : categories.map(categoryLabel).join(", ")}`;
    const mock = await one<{ id: string }>(
      "insert into mock_interviews (title, interview_type, categories, question_ids) values ($1, $2, $3, $4) returning id",
      [title, type, categories, rows.map((r) => r.id)],
    );
    revalidatePath("/mock-interviews");
    return { ok: true, id: mock!.id };
  } catch (err) {
    return fail(err);
  }
}

export async function finishMock(id: string): Promise<ActionResult> {
  try {
    const mock = await one<{ question_ids: string[]; started_at: string }>("select question_ids, started_at from mock_interviews where id = $1", [id]);
    if (!mock) return { ok: false, error: "Mock interview not found." };
    const attempts = await query<{ score: number; question: string; category: string }>(
      `select distinct on (a.question_id) a.score, q.question, q.category
       from answer_attempts a join interview_questions q on q.id = a.question_id
       where a.mock_interview_id = $1 order by a.question_id, a.created_at desc`,
      [id],
    );
    if (!attempts.length) return { ok: false, error: "Answer at least one question before finishing." };
    const overall = Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length);
    const weak = attempts.filter((a) => a.score < 60).sort((a, b) => a.score - b.score);
    const strong = attempts.filter((a) => a.score >= 75);
    const lines = [
      `Answered ${attempts.length} of ${mock.question_ids.length} questions. Average score ${overall}.`,
      strong.length ? `Strong: ${strong.length} answer(s) scored 75 or more.` : "No answers reached 75 yet. Keep practising the expected points.",
      ...(weak.length ? ["Revise first:", ...weak.map((w) => `• ${w.question} (${categoryLabel(w.category)}, ${w.score})`)] : []),
      "Weak answers are already scheduled in your revision queue.",
    ];
    await query(
      `update mock_interviews set status = 'completed', overall_score = $2, feedback = $3, completed_at = now(),
         duration_seconds = extract(epoch from now() - started_at)::int where id = $1`,
      [id, overall, lines.join("\n")],
    );
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/mock-interviews");
  revalidatePath(`/mock-interviews/${id}`);
  revalidatePath("/reports");
  return { ok: true };
}

export async function abandonMock(id: string): Promise<ActionResult> {
  try {
    await query("update mock_interviews set status = 'abandoned', completed_at = now() where id = $1 and status = 'in_progress'", [id]);
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/mock-interviews");
  return { ok: true };
}

export async function deleteMock(id: string): Promise<ActionResult> {
  try {
    await query("delete from mock_interviews where id = $1", [id]);
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/mock-interviews");
  return { ok: true };
}

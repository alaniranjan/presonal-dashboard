"use server";

import { revalidatePath } from "next/cache";
import { fail } from "@/lib/action-utils";
import { one, transaction, USER_ID } from "@/lib/db";
import { buildQuestionRows, buildRoadmapRows, buildTaskRows } from "@/lib/seed/build";
import type { ActionResult } from "@/lib/types";

/**
 * Copies the starter roadmap and question bank into the database.
 * Runs once, in a single transaction; nothing is marked complete.
 */
export async function generateStarterPlan(startDate: string): Promise<ActionResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return { ok: false, error: "Pick a valid start date." };
  try {
    const profile = await one<{ roadmap_generated: boolean }>("select roadmap_generated from profiles where id = $1", [USER_ID]);
    if (profile?.roadmap_generated) return { ok: false, error: "Your plan already exists." };

    const counts = await transaction(async (db) => {
      const roadmapId = new Map<number, string>();
      for (const r of buildRoadmapRows()) {
        const { rows } = await db.query(
          `insert into learning_roadmaps (month_number, title, level, goal, outcome, weeks)
           values ($1, $2, $3, $4, $5, $6) returning id`,
          [r.month_number, r.title, r.level, r.goal, r.outcome, JSON.stringify(r.weeks)],
        );
        roadmapId.set(r.month_number, rows[0].id);
      }

      const tasks = buildTaskRows(startDate, (m) => roadmapId.get(m));
      await db.query(
        `insert into learning_tasks (roadmap_id, week_number, title, category, difficulty, estimated_minutes,
                                     description, resource_links, completion_criteria, planned_date)
         select * from jsonb_to_recordset($1::jsonb) as t(roadmap_id uuid, week_number int, title text, category text,
           difficulty text, estimated_minutes int, description text, resource_links text[], completion_criteria text, planned_date date)`,
        [JSON.stringify(tasks)],
      );

      const questions = buildQuestionRows();
      for (const q of questions) {
        await db.query(
          `insert into interview_questions (category, topic, difficulty, question, expected_points, hints, model_answer, follow_ups, is_sample)
           values ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
          [q.category, q.topic, q.difficulty, q.question, q.expected_points, q.hints, q.model_answer, q.follow_ups],
        );
      }

      await db.query("update profiles set roadmap_generated = true, start_date = $2 where id = $1", [USER_ID, startDate]);
      return { tasks: tasks.length, questions: questions.length };
    });

    revalidatePath("/", "layout");
    return { ok: true, message: `Created ${counts.tasks} tasks and ${counts.questions} starter questions.` };
  } catch (err) {
    return fail(err);
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, lines, str } from "@/lib/action-utils";
import { DIFFICULTIES, QUESTION_CATEGORIES, QUESTION_STATUSES } from "@/lib/constants";
import { addDays, todayIn } from "@/lib/dates";
import { buildFeedback, nextStatus, scoreAttempt } from "@/lib/scoring";
import { getTimezone } from "@/lib/data";
import { one, query, transaction } from "@/lib/db";
import type { ActionResult, QuestionStatus } from "@/lib/types";

const questionSchema = z.object({
  category: z.enum(QUESTION_CATEGORIES as [string, ...string[]]),
  topic: z.string().min(1, "Topic is required.").max(120),
  difficulty: z.enum(DIFFICULTIES),
  question: z.string().min(5, "Write the question.").max(4000),
  expected_points: z.array(z.string().max(500)).max(20),
  hints: z.array(z.string().max(500)).max(10),
  model_answer: z.string().max(10000).nullable(),
  follow_ups: z.array(z.string().max(500)).max(10),
});

function refresh(id?: string) {
  revalidatePath("/interview");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/interview/${id}`);
}

export async function saveQuestion(id: string | null, form: FormData): Promise<ActionResult & { id?: string }> {
  const parsed = questionSchema.safeParse({
    category: str(form, "category") ?? "",
    topic: str(form, "topic") ?? "",
    difficulty: str(form, "difficulty") ?? "beginner",
    question: str(form, "question") ?? "",
    expected_points: lines(form, "expected_points"),
    hints: lines(form, "hints"),
    model_answer: str(form, "model_answer"),
    follow_ups: lines(form, "follow_ups"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const q = parsed.data;
  const values = [q.category, q.topic, q.difficulty, q.question, q.expected_points, q.hints, q.model_answer, q.follow_ups];
  try {
    if (id) {
      await query(
        `update interview_questions set category = $2, topic = $3, difficulty = $4, question = $5, expected_points = $6,
           hints = $7, model_answer = $8, follow_ups = $9 where id = $1`,
        [id, ...values],
      );
      refresh(id);
      return { ok: true, message: "Question updated.", id };
    }
    const row = await one<{ id: string }>(
      `insert into interview_questions (category, topic, difficulty, question, expected_points, hints, model_answer, follow_ups)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
      values,
    );
    refresh();
    return { ok: true, message: "Question added.", id: row!.id };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteQuestion(id: string): Promise<ActionResult> {
  try {
    await query("delete from interview_questions where id = $1", [id]);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Question deleted." };
}

export async function toggleBookmark(id: string, bookmarked: boolean): Promise<ActionResult> {
  try {
    await query("update interview_questions set bookmarked = $2 where id = $1", [id, bookmarked]);
  } catch (err) {
    return fail(err);
  }
  refresh(id);
  return { ok: true };
}

export async function setQuestionStatus(id: string, status: QuestionStatus): Promise<ActionResult> {
  if (!(status in QUESTION_STATUSES)) return { ok: false, error: "Unknown status." };
  try {
    await query("update interview_questions set status = $2 where id = $1", [id, status]);
  } catch (err) {
    return fail(err);
  }
  refresh(id);
  return { ok: true, message: "Status updated." };
}

const attemptSchema = z.object({
  answer: z.string().min(1, "Write your answer before saving.").max(20000),
  code_snippet: z.string().max(20000).nullable(),
  hints_used: z.number().int().min(0).max(10),
  revealed_answer: z.boolean(),
  points_covered: z.array(z.string()),
  correctness: z.number().int().min(1).max(5),
  clarity: z.number().int().min(1).max(5),
  confidence: z.number().int().min(1).max(5),
  notes: z.string().max(5000).nullable(),
});
export type AttemptInput = z.infer<typeof attemptSchema>;

export async function submitAttempt(
  questionId: string,
  input: AttemptInput,
  mockInterviewId: string | null = null,
): Promise<ActionResult & { score?: number; status?: QuestionStatus; feedback?: string; reviseOn?: string }> {
  const parsed = attemptSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const a = parsed.data;
  try {
    const q = await one<{ expected_points: string[]; last_score: number | null }>(
      "select expected_points, last_score from interview_questions where id = $1",
      [questionId],
    );
    if (!q) return { ok: false, error: "Question not found." };

    const covered = a.points_covered.filter((p) => q.expected_points.includes(p));
    const { completeness, score } = scoreAttempt({
      totalPoints: q.expected_points.length,
      pointsCovered: covered.length,
      correctness: a.correctness,
      clarity: a.clarity,
      hintsUsed: a.hints_used,
      revealedBeforeAnswering: a.revealed_answer,
    });
    const feedback = buildFeedback({
      missed: q.expected_points.filter((p) => !covered.includes(p)),
      correctness: a.correctness,
      clarity: a.clarity,
      hintsUsed: a.hints_used,
      revealedBeforeAnswering: a.revealed_answer,
      notes: a.notes,
    });
    const { status, reviseInDays } = nextStatus(score, a.confidence, q.last_score);
    const reviseOn = addDays(todayIn(await getTimezone()), reviseInDays);
    const reason = status === "needs_improvement" ? `Scored ${score} — needs improvement` : `Spaced revision after scoring ${score}`;

    await transaction(async (db) => {
      await db.query(
        `insert into answer_attempts (question_id, answer, code_snippet, hints_used, revealed_answer, points_covered,
           completeness_score, correctness_rating, clarity_rating, confidence, score, feedback, feedback_source, mock_interview_id)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'self', $13)`,
        [questionId, a.answer, a.code_snippet, a.hints_used, a.revealed_answer, covered, completeness,
          a.correctness, a.clarity, a.confidence, score, feedback, mockInterviewId],
      );
      await db.query(
        `update interview_questions set status = $2, last_score = $3, last_confidence = $4, attempt_count = attempt_count + 1,
           first_attempted_at = coalesce(first_attempted_at, now()), last_attempted_at = now()
         where id = $1`,
        [questionId, status, score, a.confidence],
      );
      // Replace any open revision item with one scheduled from this attempt.
      await db.query("update revision_queue set completed_at = now() where question_id = $1 and completed_at is null", [questionId]);
      await db.query("insert into revision_queue (question_id, due_date, reason) values ($1, $2, $3)", [questionId, reviseOn, reason]);
    });

    refresh(questionId);
    if (mockInterviewId) revalidatePath(`/mock-interviews/${mockInterviewId}`);
    return { ok: true, score, status, feedback, reviseOn };
  } catch (err) {
    return fail(err);
  }
}

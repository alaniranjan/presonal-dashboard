import { categoryLabel, SKILLS } from "./constants";
import { addDays, dateIn, diffDays, startOfWeek } from "./dates";
import type { InterviewQuestion, LearningTask } from "./types";

export type TaskRow = Pick<
  LearningTask,
  "id" | "title" | "category" | "status" | "planned_date" | "completed_at" | "estimated_minutes" | "actual_minutes" | "roadmap_id" | "week_number"
>;
export type QuestionRow = Pick<InterviewQuestion, "id" | "category" | "status" | "last_score" | "attempt_count">;

export const PLAN_DAYS = 26 * 7; // 6 months ≈ 26 weeks

/** Minutes credited to a completed task: what the user logged, else the estimate. */
export function creditedMinutes(t: TaskRow) {
  return t.actual_minutes ?? t.estimated_minutes;
}

export function computeTaskMetrics(tasks: TaskRow[], today: string, tz: string, startDate: string | null) {
  const completedDate = (t: TaskRow) => (t.completed_at ? dateIn(t.completed_at, tz) : null);
  const done = tasks.filter((t) => t.status === "completed");
  const roadmapTasks = tasks.filter((t) => t.roadmap_id);
  const roadmapDone = roadmapTasks.filter((t) => t.status === "completed");

  const todayTasks = tasks.filter((t) => t.planned_date === today);
  const overdue = tasks.filter((t) => t.status !== "completed" && t.planned_date !== null && t.planned_date < today);
  const pending = tasks.filter((t) => t.status !== "completed" && (t.planned_date === null || t.planned_date >= today));

  const weekStart = startOfWeek(today);
  const thisWeekDone = done.filter((t) => (completedDate(t) ?? "") >= weekStart);
  const weekMinutes = thisWeekDone.reduce((s, t) => s + creditedMinutes(t), 0);
  const weekEstimatedOnly = thisWeekDone.filter((t) => t.actual_minutes === null).length;

  const activeDays = new Set(done.map(completedDate).filter(Boolean) as string[]);
  const daysElapsedThisWeek = diffDays(today, weekStart) + 1;
  const activeDaysThisWeek = [...activeDays].filter((d) => d >= weekStart && d <= today).length;

  // Streak: consecutive days with at least one completed task, ending today (or yesterday if nothing yet today).
  let streak = 0;
  let cursor = activeDays.has(today) ? today : addDays(today, -1);
  while (activeDays.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  // Last 8 weeks for the chart.
  const weekly = Array.from({ length: 8 }, (_, i) => {
    const ws = addDays(weekStart, -7 * (7 - i));
    const we = addDays(ws, 6);
    const completed = done.filter((t) => {
      const d = completedDate(t);
      return d !== null && d >= ws && d <= we;
    });
    const planned = tasks.filter((t) => t.planned_date !== null && t.planned_date >= ws && t.planned_date <= we);
    return {
      week: ws.slice(5),
      planned: planned.length,
      completed: completed.length,
      hours: Math.round((completed.reduce((s, t) => s + creditedMinutes(t), 0) / 60) * 10) / 10,
    };
  });

  const dayOfPlan = startDate ? Math.max(0, diffDays(today, startDate) + 1) : 0;
  const currentWeek = startDate ? Math.min(24, Math.max(1, Math.floor(diffDays(today, startDate) / 7) + 1)) : 1;

  return {
    roadmapTotal: roadmapTasks.length,
    roadmapDone: roadmapDone.length,
    roadmapPct: roadmapTasks.length ? (roadmapDone.length / roadmapTasks.length) * 100 : 0,
    todayTasks,
    todayDone: todayTasks.filter((t) => t.status === "completed").length,
    completedCount: done.length,
    pendingCount: pending.length,
    overdue,
    weekMinutes,
    weekEstimatedOnly,
    activeDaysThisWeek,
    daysElapsedThisWeek,
    streak,
    weekly,
    dayOfPlan,
    currentWeek,
  };
}

/**
 * Skill score (0–100) = average of task completion % and average latest interview score
 * for the categories behind that skill. If only one source has data, that source is used alone.
 */
export function computeSkillScores(tasks: TaskRow[], questions: QuestionRow[]) {
  return SKILLS.map((skill) => {
    const cats = skill.categories as readonly string[];
    const t = tasks.filter((x) => cats.includes(x.category));
    const taskPct = t.length ? (t.filter((x) => x.status === "completed").length / t.length) * 100 : null;
    const scored = questions.filter((q) => cats.includes(q.category) && q.last_score !== null);
    const qAvg = scored.length ? scored.reduce((s, q) => s + (q.last_score ?? 0), 0) / scored.length : null;
    const parts = [taskPct, qAvg].filter((v): v is number => v !== null);
    return {
      key: skill.key,
      label: skill.label,
      score: parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : null,
      taskPct: taskPct === null ? null : Math.round(taskPct),
      questionAvg: qAvg === null ? null : Math.round(qAvg),
      attempted: scored.length,
    };
  });
}

export function computeInterviewMetrics(questions: QuestionRow[]) {
  const total = questions.length;
  const ready = questions.filter((q) => q.status === "strong" || q.status === "ready").length;
  const attempted = questions.filter((q) => q.attempt_count > 0);
  const avg = attempted.length ? Math.round(attempted.reduce((s, q) => s + (q.last_score ?? 0), 0) / attempted.length) : null;

  const byCat = new Map<string, number[]>();
  for (const q of attempted) {
    byCat.set(q.category, [...(byCat.get(q.category) ?? []), q.last_score ?? 0]);
  }
  const weakTopics = [...byCat.entries()]
    .map(([cat, scores]) => ({ category: cat, label: categoryLabel(cat), avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), count: scores.length }))
    .filter((c) => c.avg < 65)
    .sort((a, b) => a.avg - b.avg);

  return {
    total,
    attempted: attempted.length,
    readyCount: ready,
    readinessPct: total ? Math.round((ready / total) * 100) : 0,
    avgScore: avg,
    weakTopics,
  };
}

export type JobRow = { status: string; date_applied: string | null; follow_up_date: string | null; portal: string };

const RESPONDED = ["recruiter_contacted", "screening", "technical_1", "technical_2", "hr", "offer"];
const INTERVIEWED = ["screening", "technical_1", "technical_2", "hr", "offer"];
const CLOSED = ["rejected", "offer"];

/** Funnel and weekly activity for the job search. Rates are out of applications actually submitted. */
export function computeJobStats(jobs: JobRow[], today: string) {
  const applied = jobs.filter((j) => j.date_applied !== null || (j.status !== "saved" && j.status !== "to_apply"));
  // Rejections after an interview still count as interviewed only if we know; status alone can't tell, so they don't.
  const responded = applied.filter((j) => RESPONDED.includes(j.status));
  const interviews = applied.filter((j) => INTERVIEWED.includes(j.status));
  const offers = applied.filter((j) => j.status === "offer");
  const rejected = applied.filter((j) => j.status === "rejected");
  const pct = (n: number) => (applied.length ? Math.round((n / applied.length) * 100) : 0);

  const weekStart = startOfWeek(today);
  const weekly = Array.from({ length: 8 }, (_, i) => {
    const ws = addDays(weekStart, -7 * (7 - i));
    const we = addDays(ws, 6);
    return { week: ws.slice(5), applied: jobs.filter((j) => j.date_applied && j.date_applied >= ws && j.date_applied <= we).length };
  });

  const byPortal = new Map<string, { applied: number; interviews: number }>();
  for (const j of applied) {
    const p = byPortal.get(j.portal) ?? { applied: 0, interviews: 0 };
    p.applied++;
    if (INTERVIEWED.includes(j.status)) p.interviews++;
    byPortal.set(j.portal, p);
  }

  return {
    total: jobs.length,
    applied: applied.length,
    responded: responded.length,
    interviews: interviews.length,
    offers: offers.length,
    rejected: rejected.length,
    responseRate: pct(responded.length),
    interviewRate: pct(interviews.length),
    offerRate: pct(offers.length),
    followUpsDue: jobs.filter((j) => j.follow_up_date && j.follow_up_date <= today && !CLOSED.includes(j.status)).length,
    thisWeek: jobs.filter((j) => j.date_applied && j.date_applied >= weekStart).length,
    weekly,
    byPortal: [...byPortal.entries()].map(([portal, v]) => ({ portal, ...v })),
  };
}

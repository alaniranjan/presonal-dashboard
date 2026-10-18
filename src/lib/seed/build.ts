import { addDays } from "@/lib/dates";
import { QUESTIONS } from "./questions";
import { ROADMAP } from "./roadmap";

/** Rows for learning_roadmaps (without ids). */
export function buildRoadmapRows() {
  return ROADMAP.map((m) => ({
    month_number: m.month,
    title: m.title,
    level: m.level,
    goal: m.goal,
    outcome: m.outcome,
    weeks: m.weeks.map((w, i) => ({ week: (m.month - 1) * 4 + i + 1, title: w.title, goal: w.goal, criteria: w.criteria })),
  }));
}

/** Rows for learning_tasks: five daily tasks plus a review day per week, dated from `startDate`. */
export function buildTaskRows(startDate: string, roadmapId: (month: number) => string | undefined) {
  return ROADMAP.flatMap((m) =>
    m.weeks.flatMap((w, wi) => {
      const week = (m.month - 1) * 4 + wi + 1;
      const weekStart = addDays(startDate, (week - 1) * 7);
      const daily = w.tasks.map(([title, category, difficulty, minutes, description, links], day) => ({
        roadmap_id: roadmapId(m.month),
        week_number: week,
        title,
        category,
        difficulty,
        estimated_minutes: minutes,
        description,
        resource_links: links ?? [],
        completion_criteria: null as string | null,
        planned_date: addDays(weekStart, day),
      }));
      const review = {
        roadmap_id: roadmapId(m.month),
        week_number: week,
        title: `Week ${week} review: ${w.title}`,
        category: "revision",
        difficulty: "beginner" as const,
        estimated_minutes: 60,
        description:
          "Catch up on unfinished tasks, re-attempt questions in your revision queue, and check this week's completion criteria.",
        resource_links: [] as string[],
        completion_criteria: w.criteria as string | null,
        planned_date: addDays(weekStart, 5),
      };
      return [...daily, review];
    }),
  );
}

/** Rows for interview_questions, flagged as starter samples. */
export function buildQuestionRows() {
  return QUESTIONS.map((q) => ({
    category: q.category,
    topic: q.topic,
    difficulty: q.difficulty,
    question: q.question,
    expected_points: q.points,
    hints: q.hints,
    model_answer: q.answer,
    follow_ups: q.followUps,
    is_sample: true,
  }));
}

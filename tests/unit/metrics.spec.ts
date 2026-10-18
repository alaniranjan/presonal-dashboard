import { expect, test } from "@playwright/test";
import { addDays, startOfWeek } from "../../src/lib/dates";
import { computeInterviewMetrics, computeSkillScores, computeTaskMetrics, type TaskRow } from "../../src/lib/metrics";

const TODAY = "2026-10-21"; // Wednesday
const TZ = "UTC";
let n = 0;
function task(p: Partial<TaskRow>): TaskRow {
  return { id: String(n++), title: "t", category: "playwright", status: "not_started", planned_date: TODAY, completed_at: null,
    estimated_minutes: 30, actual_minutes: null, roadmap_id: "r1", week_number: 1, ...p };
}
const done = (date: string, p: Partial<TaskRow> = {}) => task({ status: "completed", completed_at: `${date}T10:00:00Z`, planned_date: date, ...p });

test("dates: week starts on Monday", () => {
  expect(startOfWeek("2026-10-21")).toBe("2026-10-19");
  expect(startOfWeek("2026-10-25")).toBe("2026-10-19"); // Sunday
  expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
});

test("progress counts only tasks marked completed", () => {
  const m = computeTaskMetrics([done(TODAY), task({}), task({ status: "in_progress" }), task({ roadmap_id: null, is_custom: true } as never)], TODAY, TZ, "2026-10-19");
  expect(m.roadmapTotal).toBe(3);
  expect(m.roadmapDone).toBe(1);
  expect(m.todayDone).toBe(1);
  expect(m.todayTasks).toHaveLength(4);
});

test("overdue excludes completed tasks", () => {
  const m = computeTaskMetrics([task({ planned_date: "2026-10-19" }), done("2026-10-19")], TODAY, TZ, "2026-10-19");
  expect(m.overdue).toHaveLength(1);
});

test("study time uses logged minutes, falling back to the estimate", () => {
  const m = computeTaskMetrics([done(TODAY, { actual_minutes: 50 }), done("2026-10-20")], TODAY, TZ, "2026-10-19");
  expect(m.weekMinutes).toBe(80);
  expect(m.weekEstimatedOnly).toBe(1);
});

test("streak counts consecutive active days", () => {
  const m = computeTaskMetrics([done(TODAY), done("2026-10-20"), done("2026-10-19"), done("2026-10-17")], TODAY, TZ, "2026-10-01");
  expect(m.streak).toBe(3);
  const y = computeTaskMetrics([done("2026-10-20"), done("2026-10-19")], TODAY, TZ, "2026-10-01");
  expect(y.streak).toBe(2); // nothing yet today doesn't break the streak
});

test("current week follows the start date", () => {
  expect(computeTaskMetrics([], TODAY, TZ, "2026-10-19").currentWeek).toBe(1);
  expect(computeTaskMetrics([], TODAY, TZ, "2026-09-01").currentWeek).toBe(8);
});

test("skill score averages task completion and interview scores", () => {
  const tasks = [done(TODAY, { category: "api" }), task({ category: "api" })];
  const s = computeSkillScores(tasks, [{ id: "q", category: "api", status: "strong", last_score: 90, attempt_count: 1 }]);
  const api = s.find((x) => x.key === "api")!;
  expect(api.taskPct).toBe(50);
  expect(api.score).toBe(70);
  expect(s.find((x) => x.key === "sql")!.score).toBeNull();
});

test("weak topics are attempted categories averaging under 65", () => {
  const iv = computeInterviewMetrics([
    { id: "1", category: "sql", status: "needs_improvement", last_score: 40, attempt_count: 1 },
    { id: "2", category: "api", status: "strong", last_score: 90, attempt_count: 1 },
    { id: "3", category: "hr", status: "new", last_score: null, attempt_count: 0 },
  ]);
  expect(iv.weakTopics.map((w) => w.category)).toEqual(["sql"]);
  expect(iv.readinessPct).toBe(33);
});

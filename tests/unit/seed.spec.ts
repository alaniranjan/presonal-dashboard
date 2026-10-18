import { expect, test } from "@playwright/test";
import { CATEGORIES, QUESTION_CATEGORIES } from "../../src/lib/constants";
import { buildQuestionRows, buildTaskRows } from "../../src/lib/seed/build";
import { ROADMAP } from "../../src/lib/seed/roadmap";

test("roadmap has 6 months × 4 weeks × 5 tasks", () => {
  expect(ROADMAP).toHaveLength(6);
  for (const m of ROADMAP) {
    expect(m.weeks).toHaveLength(4);
    for (const w of m.weeks) expect(w.tasks).toHaveLength(5);
  }
});

test("generated tasks are valid and nothing starts completed", () => {
  const rows = buildTaskRows("2026-10-19", () => "id");
  expect(rows).toHaveLength(144);
  const keySets = new Set(rows.map((r) => Object.keys(r).sort().join(",")));
  expect(keySets.size).toBe(1); // bulk insert needs identical keys
  for (const r of rows) {
    expect(Object.keys(CATEGORIES)).toContain(r.category);
    for (const l of r.resource_links) expect(() => new URL(l)).not.toThrow();
    expect(r).not.toHaveProperty("status");
  }
  expect(rows[0].planned_date).toBe("2026-10-19");
  expect(rows.at(-1)!.planned_date).toBe("2027-04-03");
});

test("question bank covers all ten interview sections", () => {
  const rows = buildQuestionRows();
  for (const c of QUESTION_CATEGORIES) expect(rows.some((q) => q.category === c), c).toBe(true);
  for (const q of rows) {
    expect(q.expected_points.length).toBeGreaterThan(0);
    expect(q.hints.length).toBeGreaterThan(0);
    expect(q.is_sample).toBe(true);
  }
});

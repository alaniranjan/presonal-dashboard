import { expect, test } from "@playwright/test";
import { compareResume, findSkills } from "../../src/lib/jd-match";

test("finds skills with aliases and word boundaries", () => {
  expect(findSkills("Experience with Playwright, TypeScript and REST APIs; CI/CD in Jenkins")).toEqual(
    expect.arrayContaining(["Playwright", "TypeScript", "REST APIs", "CI/CD", "Jenkins"]),
  );
  // "java" must not match inside "javascript"
  expect(findSkills("Strong JavaScript skills")).not.toContain("Java");
  expect(findSkills("C# and .NET")).toContain("C#");
});

test("compares matched and missing skills", () => {
  const jd = "SDET with Playwright, TypeScript, SQL, Jenkins and Docker. Docker experience is a plus.";
  const resume = "Built a Playwright framework in TypeScript. Wrote SQL queries to validate orders.";
  const r = compareResume(jd, resume);
  expect(r.matched).toEqual(["Playwright", "TypeScript", "SQL"]);
  expect(r.missing).toEqual(["Jenkins", "Docker"]);
  expect(r.score).toBe(60);
  expect(r.suggestions.join(" ")).toContain("If not, add it to your learning plan");
});

test("suggests measurable outcomes when the resume has no numbers", () => {
  const r = compareResume("Playwright", "Automated tests with Playwright");
  expect(r.suggestions.some((s) => s.includes("measurable"))).toBe(true);
});

import { expect, test } from "@playwright/test";
import { buildFeedback, nextStatus, scoreAttempt } from "../../src/lib/scoring";

test.describe("scoreAttempt", () => {
  test("full marks when every point is covered with top ratings", () => {
    expect(scoreAttempt({ totalPoints: 4, pointsCovered: 4, correctness: 5, clarity: 5, hintsUsed: 0, revealedBeforeAnswering: false }))
      .toEqual({ completeness: 100, score: 100 });
  });

  test("weights points 50%, correctness 30%, clarity 20%", () => {
    // 2/4 points = 50 → 25; correctness 3 → 50 → 15; clarity 3 → 50 → 10
    expect(scoreAttempt({ totalPoints: 4, pointsCovered: 2, correctness: 3, clarity: 3, hintsUsed: 0, revealedBeforeAnswering: false }).score).toBe(50);
  });

  test("subtracts 5 per hint and never goes below 0", () => {
    expect(scoreAttempt({ totalPoints: 4, pointsCovered: 4, correctness: 5, clarity: 5, hintsUsed: 2, revealedBeforeAnswering: false }).score).toBe(90);
    expect(scoreAttempt({ totalPoints: 4, pointsCovered: 0, correctness: 1, clarity: 1, hintsUsed: 3, revealedBeforeAnswering: false }).score).toBe(0);
  });

  test("caps at 60 when the answer was revealed first", () => {
    expect(scoreAttempt({ totalPoints: 3, pointsCovered: 3, correctness: 5, clarity: 5, hintsUsed: 0, revealedBeforeAnswering: true }).score).toBe(60);
  });

  test("questions without expected points use ratings only", () => {
    expect(scoreAttempt({ totalPoints: 0, pointsCovered: 0, correctness: 5, clarity: 5, hintsUsed: 0, revealedBeforeAnswering: false }).score).toBe(100);
  });
});

test.describe("nextStatus", () => {
  test("weak answers come back tomorrow", () => {
    expect(nextStatus(40, 3, null)).toEqual({ status: "needs_improvement", reviseInDays: 1 });
  });
  test("middling answers stay attempted", () => {
    expect(nextStatus(60, 3, null)).toEqual({ status: "attempted", reviseInDays: 3 });
  });
  test("a first strong answer is strong, not ready", () => {
    expect(nextStatus(85, 5, null)).toEqual({ status: "strong", reviseInDays: 7 });
  });
  test("two strong answers in a row with confidence become ready", () => {
    expect(nextStatus(85, 4, 80)).toEqual({ status: "ready", reviseInDays: 21 });
    expect(nextStatus(85, 3, 80).status).toBe("strong");
  });
});

test("feedback lists missed points", () => {
  const fb = buildFeedback({ missed: ["Auto-waiting"], correctness: 2, clarity: 4, hintsUsed: 1, revealedBeforeAnswering: false, notes: null });
  expect(fb).toContain("• Auto-waiting");
  expect(fb).toContain("Correctness");
  expect(fb).toContain("1 hint");
});

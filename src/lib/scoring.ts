import type { QuestionStatus } from "./types";

export interface SelfAssessment {
  totalPoints: number;
  pointsCovered: number;
  correctness: number; // 1–5
  clarity: number; // 1–5
  hintsUsed: number;
  revealedBeforeAnswering: boolean;
}

/**
 * Score out of 100 from the user's own assessment:
 *  50% expected points covered, 30% correctness, 20% clarity,
 *  −5 per hint used, capped at 60 if the model answer was viewed before answering.
 */
export function scoreAttempt(a: SelfAssessment) {
  const completeness = a.totalPoints > 0 ? Math.round((a.pointsCovered / a.totalPoints) * 100) : 0;
  const correctness = ((a.correctness - 1) / 4) * 100;
  const clarity = ((a.clarity - 1) / 4) * 100;
  const base = a.totalPoints > 0 ? 0.5 * completeness + 0.3 * correctness + 0.2 * clarity : 0.6 * correctness + 0.4 * clarity;
  let score = Math.round(base - 5 * a.hintsUsed);
  if (a.revealedBeforeAnswering) score = Math.min(score, 60);
  return { completeness, score: Math.max(0, Math.min(100, score)) };
}

/** New status and how many days until the question should be revised again. */
export function nextStatus(score: number, confidence: number, previousScore: number | null) {
  let status: QuestionStatus;
  let reviseInDays: number;
  if (score < 50) {
    status = "needs_improvement";
    reviseInDays = 1;
  } else if (score < 75) {
    status = "attempted";
    reviseInDays = 3;
  } else if (previousScore !== null && previousScore >= 75 && confidence >= 4) {
    status = "ready";
    reviseInDays = 21;
  } else {
    status = "strong";
    reviseInDays = 7;
  }
  return { status, reviseInDays };
}

export function buildFeedback(opts: {
  missed: string[];
  correctness: number;
  clarity: number;
  hintsUsed: number;
  revealedBeforeAnswering: boolean;
  notes: string | null;
}) {
  const parts: string[] = [];
  if (opts.missed.length) parts.push(`Missed points:\n${opts.missed.map((m) => `• ${m}`).join("\n")}`);
  else parts.push("Covered every expected point.");
  if (opts.correctness <= 2) parts.push("Correctness: revisit the fundamentals for this topic before the next attempt.");
  if (opts.clarity <= 2) parts.push("Clarity: structure the answer — definition, how it works, example, trade-off.");
  if (opts.hintsUsed) parts.push(`Used ${opts.hintsUsed} hint(s).`);
  if (opts.revealedBeforeAnswering) parts.push("Model answer was viewed before answering — retry from memory later.");
  if (opts.notes) parts.push(`My notes: ${opts.notes}`);
  return parts.join("\n\n");
}

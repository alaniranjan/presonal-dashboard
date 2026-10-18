import type { QuestionStatus, TaskStatus } from "./types";

/** Shared by learning tasks and interview questions (sections A–J of the interview center). */
export const CATEGORIES = {
  "js-ts": { label: "JavaScript & TypeScript", short: "JS/TS" },
  playwright: { label: "Playwright", short: "Playwright" },
  framework: { label: "Framework design", short: "Framework" },
  api: { label: "API testing & Postman", short: "API" },
  cicd: { label: "Jenkins, Git & CI/CD", short: "CI/CD" },
  sql: { label: "SQL & database testing", short: "SQL" },
  manual: { label: "Manual testing & test design", short: "Manual" },
  coding: { label: "Coding & problem solving", short: "Coding" },
  hr: { label: "HR & managerial", short: "HR" },
  debugging: { label: "Real-world debugging", short: "Debugging" },
  career: { label: "Resume & job search", short: "Career" },
  revision: { label: "Revision & weekly review", short: "Revision" },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;
export const QUESTION_CATEGORIES = Object.keys(CATEGORIES).filter(
  (k) => k !== "career" && k !== "revision",
) as CategoryKey[];

export function categoryLabel(key: string) {
  return CATEGORIES[key as CategoryKey]?.label ?? key;
}

/** Dashboard skill scores and which task/question categories feed each one. */
export const SKILLS = [
  { key: "typescript", label: "TypeScript", categories: ["js-ts", "coding"] },
  { key: "playwright", label: "Playwright", categories: ["playwright", "framework", "debugging"] },
  { key: "api", label: "API", categories: ["api"] },
  { key: "jenkins", label: "Jenkins & CI/CD", categories: ["cicd"] },
  { key: "sql", label: "SQL", categories: ["sql"] },
] as const;

export const TASK_STATUSES: Record<TaskStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
  blocked: "Blocked",
};

export const QUESTION_STATUSES: Record<QuestionStatus, string> = {
  new: "New",
  attempted: "Attempted",
  needs_improvement: "Needs Improvement",
  strong: "Strong",
  ready: "Ready for Interview",
};

export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

export const JOB_STATUSES = {
  saved: "Saved",
  to_apply: "To Apply",
  applied: "Applied",
  recruiter_contacted: "Recruiter Contacted",
  screening: "Screening",
  technical_1: "Technical Round 1",
  technical_2: "Technical Round 2",
  hr: "HR Round",
  offer: "Offer",
  rejected: "Rejected",
  on_hold: "On Hold",
} as const;

/** Statuses that mean the application is still moving. */
export const ACTIVE_JOB_STATUSES = ["applied", "recruiter_contacted", "screening", "technical_1", "technical_2", "hr"];
/** Statuses that mean the recruiter/company responded. */
export const RESPONDED_JOB_STATUSES = ["recruiter_contacted", "screening", "technical_1", "technical_2", "hr", "offer"];
export const INTERVIEW_JOB_STATUSES = ["screening", "technical_1", "technical_2", "hr", "offer"];

export const PORTALS = {
  linkedin: "LinkedIn",
  naukri: "Naukri",
  indeed: "Indeed",
  referral: "Referral",
  company_site: "Company site",
  other: "Other",
} as const;

export const PORTAL_LINKS = [
  { label: "LinkedIn Jobs", href: "https://www.linkedin.com/jobs/" },
  { label: "Naukri", href: "https://www.naukri.com/" },
  { label: "Indeed", href: "https://www.indeed.com/" },
];

export const WORK_MODES = { onsite: "On-site", hybrid: "Hybrid", remote: "Remote" } as const;

export const ROUND_TYPES = {
  screening: "Screening",
  technical_1: "Technical 1",
  technical_2: "Technical 2",
  manager: "Manager",
  hr: "HR",
  other: "Other",
} as const;

export const ROUND_OUTCOMES = {
  scheduled: "Scheduled",
  pending: "Awaiting result",
  passed: "Passed",
  failed: "Not selected",
  cancelled: "Cancelled",
} as const;

export const MILESTONE_STATUSES = TASK_STATUSES;

export const PROJECT_STATUS = {
  not_started: { label: "Not started", tone: "zinc" },
  in_progress: { label: "In progress", tone: "blue" },
  completed: { label: "Completed", tone: "green" },
  on_hold: { label: "On hold", tone: "amber" },
} as const;

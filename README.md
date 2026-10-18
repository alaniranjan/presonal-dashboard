# QA Career Command Center

A personal web app for a six-month switch into a **QA Automation Engineer / SDET** role (Playwright + TypeScript).
It runs in practice mode with no sign-in, and saves everything to a local PostgreSQL database.
It covers a learning roadmap, daily tasks, interview practice with saved attempts, and (in later phases)
projects, resume tools and a job tracker. Every number on the dashboard is computed from rows you saved.

## Stack

- **Next.js 15 (App Router) + TypeScript + Tailwind CSS v4**: server components for reads, server actions for writes
- **PostgreSQL** (local, via `pg`): all data is saved in the `qa_career` database on your Mac
- **Practice mode**: no sign-in. One local profile; every row belongs to that single practice user
- **Playwright Test**: unit tests for scoring and metrics logic, plus browser E2E tests
- **Recharts** for charts, **zod** for validating every server action

## Run it locally

Requires Node 20+ and PostgreSQL running locally (Homebrew: `brew services start postgresql@14`).

```bash
cp .env.example .env.local   # DATABASE_URL=postgresql://localhost:5432/qa_career
npm install
npm run db:setup             # creates the database and tables (safe to re-run)
npm run dev                  # http://localhost:3000
```

Then click **Create my plan** on the dashboard.

## Tests

| Command | What it runs |
|---|---|
| `npm run test:unit` | Scoring, metrics, date and seed-data tests (no browser, no server) |
| `npm run test:e2e` | Browser tests on port 3100 against a throwaway `qa_career_test` database, which is reset on every run. Your `qa_career` data is never touched |
| `npm run typecheck` / `npm run lint` | TypeScript and ESLint |

## Architecture

```
src/
  app/
    actions/               server actions: setup (plan generation), tasks, questions, profile
    (app)/                 pages: dashboard, roadmap, tasks, interview, settings
  components/              UI primitives, sidebar, task + interview client components
  lib/
    db.ts                  PostgreSQL pool, query helpers, transactions
    metrics.ts             pure dashboard calculations (unit-tested)
    scoring.ts             attempt scoring + spaced revision rules (unit-tested)
    seed/                  starter curriculum (24 weeks, 144 tasks) and 31 interview questions
db/                        SQL schema (15 tables, constraints, indexes), applied by scripts/db-setup.mjs
tests/unit, tests/e2e      Playwright tests
```

**Key rules enforced in code and in the database**

- A task counts as completed only when you mark it complete. A DB check requires `completed_at` whenever the status is `completed`.
- Rescheduling only moves unfinished tasks. Completed work is never touched.
- A project milestone can't be completed without evidence (DB check; used from Phase 5 on).
- Interview flow: answer first. Hints come one at a time. Revealing the model answer early asks for confirmation and caps that attempt's score at 60.
- Every attempt is stored in `answer_attempts`, never overwritten, and schedules the next revision:
  under 50 → 1 day, 50–74 → 3 days, strong → 7 days, ready → 21 days.

**How scores are calculated**

- *Attempt score* = 50% of expected points covered + 30% correctness + 20% clarity, minus 5 per hint. This is self-assessed until AI feedback (Phase 7) is added.
- *Skill score* = average of that skill's task completion % and its latest interview scores.
- *Interview readiness* = share of questions with status Strong or Ready.
- *Study time* = logged minutes for completed tasks. When none are logged, the estimate is used, and the dashboard says how many tasks were counted that way.

**Sample data**: the roadmap and the questions flagged `is_sample` / "starter" are curriculum content copied into your account once.
No progress, scores or applications are ever seeded.

## Feature checklist

| Area | Status |
|---|---|
| Practice mode (no sign-in), local PostgreSQL backend, migrations (`npm run db:setup`) | ✅ Built · E2E-tested |
| Profile settings + configurable job-search checklist | ✅ Built · E2E-tested |
| Dashboard: progress, today, study time, streak, overdue, skill scores, readiness, weekly + monthly charts, revision due, current projects, follow-ups, interviews | ✅ Built · metrics unit-tested |
| Six-month roadmap (24 weeks, 144 tasks, criteria, resources) | ✅ Built · E2E-tested |
| Daily tasks: day/week/month/overdue/all views, filters, add/edit/delete, postpone, bulk reschedule, time logging | ✅ Built · E2E-tested |
| Interview practice: 10 sections, hints, self-review scoring, attempt history, statuses, bookmarks, revision queue, follow-ups | ✅ Built · E2E + unit-tested |
| Mock interviews: picks due or weak questions first, timed, one at a time, overall score and feedback | ✅ Built · E2E-tested |
| Projects: 4 starter projects (requirements, folder plan, scenarios, acceptance criteria, design questions); milestones require evidence; status follows milestones | ✅ Built · E2E-tested |
| Resume Lab: versions (duplicate, primary), JD comparison (matched/missing skills, honest suggestions), 30s/60s/2min self-intro with timer + optional local recording, STAR stories | ✅ Built · E2E + unit-tested |
| Job applications: table with filters/search/sort/pagination, Kanban (drag or menu), duplicate detection, interview rounds, daily routine, stats, CSV export | ✅ Built · E2E + unit-tested |
| Reports: daily/weekly/monthly study time vs plan, topic scores (first vs latest), repeated mistakes, weak skills, project completion, application funnel, deadlines, CSV exports | ✅ Built · E2E-tested |
| AI feedback (optional, server-side) | ⏳ Not built: all scoring is self-assessed |
| Jenkinsfile + CI reports | ⏳ Not built |

Notes: audio recordings stay in your browser and aren't evaluated. Nothing reads from or posts to LinkedIn, Naukri or Indeed; the portal buttons just open those sites.

## Troubleshooting

- **Page shows "database does not exist" or "relation does not exist"**: run `npm run db:setup`.
- **"connect ECONNREFUSED"**: PostgreSQL isn't running. Start it with `brew services start postgresql@14`.
- **Back up your data**: `pg_dump qa_career > backup.sql`. To restore: `psql qa_career < backup.sql`.
- **Start over completely**: `dropdb qa_career && npm run db:setup`. This deletes all your progress.

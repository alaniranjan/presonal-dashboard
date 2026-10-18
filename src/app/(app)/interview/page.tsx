import Link from "next/link";
import { AddQuestionButton, BookmarkButton } from "@/components/interview/question-form";
import { Badge, Card, EmptyState, PageHeader, Stat, type Tone } from "@/components/ui";
import { categoryLabel, DIFFICULTIES, QUESTION_CATEGORIES, QUESTION_STATUSES } from "@/lib/constants";
import { getContext } from "@/lib/data";
import { one, query } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { computeInterviewMetrics } from "@/lib/metrics";
import type { InterviewQuestion, QuestionStatus } from "@/lib/types";

const PAGE_SIZE = 20;
const STATUS_TONE: Record<QuestionStatus, Tone> = { new: "zinc", attempted: "blue", needs_improvement: "amber", strong: "green", ready: "green" };
type Search = { view?: string; category?: string; status?: string; difficulty?: string; q?: string; page?: string };

export default async function InterviewPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { today } = await getContext();
  const view = sp.view === "revision" ? "revision" : sp.view === "bookmarked" ? "bookmarked" : "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const href = (patch: Partial<Search>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/interview?${p}`;
  };

  const [all, revision] = await Promise.all([
    query<Pick<InterviewQuestion, "id" | "category" | "status" | "last_score" | "attempt_count">>(
      "select id, category, status, last_score, attempt_count from interview_questions"),
    query<{ id: string; due_date: string; reason: string | null; question_id: string }>(
      "select id, due_date, reason, question_id from revision_queue where completed_at is null order by due_date"),
  ]);
  const iv = computeInterviewMetrics(all);
  const dueCount = revision.filter((r) => r.due_date <= today).length;
  const neverPractised = all.filter((q) => q.attempt_count === 0).length;

  let questions: InterviewQuestion[] = [];
  let total = 0;
  if (view === "revision") {
    questions = await query<InterviewQuestion>(
      `select q.* from revision_queue r join interview_questions q on q.id = r.question_id
       where r.completed_at is null order by r.due_date`);
    total = questions.length;
  } else {
    const where: string[] = [];
    const params: unknown[] = [];
    const p = (v: unknown) => `$${params.push(v)}`;
    if (view === "bookmarked") where.push("bookmarked");
    if (sp.category && QUESTION_CATEGORIES.includes(sp.category as never)) where.push(`category = ${p(sp.category)}`);
    if (sp.status && sp.status in QUESTION_STATUSES) where.push(`status = ${p(sp.status)}`);
    if (sp.difficulty && DIFFICULTIES.includes(sp.difficulty as never)) where.push(`difficulty = ${p(sp.difficulty)}`);
    if (sp.q) {
      const term = p(`%${sp.q.replace(/[%_\\]/g, "")}%`);
      where.push(`(question ilike ${term} or topic ilike ${term})`);
    }
    const whereSql = where.length ? `where ${where.join(" and ")}` : "";
    const [rows, count] = await Promise.all([
      query<InterviewQuestion>(
        `select * from interview_questions ${whereSql} order by category, created_at limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}`, params),
      one<{ n: number }>(`select count(*)::int as n from interview_questions ${whereSql}`, params),
    ]);
    questions = rows;
    total = count?.n ?? rows.length;
  }
  const revisionById = new Map(revision.map((r) => [r.question_id, r]));
  const catCount = (c: string) => all.filter((q) => q.category === c).length;

  return (
    <>
      <PageHeader title="Interview practice"
        description="One question at a time. Answer first, use hints if you're stuck, then review against the expected points."
        actions={<>
          <AddQuestionButton />
          <Link className="btn-primary" href={`/interview/next${sp.category ? `?category=${sp.category}` : ""}`}>
            Practise next {sp.category ? categoryLabel(sp.category).split(" ")[0] : ""} question →
          </Link>
        </>} />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Questions" value={iv.total} sub={`${neverPractised} never practised`} />
        <Stat label="Average score" value={iv.avgScore ?? "—"} sub={`${iv.attempted} attempted`} />
        <Stat label="Strong / ready" value={iv.readyCount} sub={`${iv.readinessPct}% interview-ready`} />
        <Stat label="Due for revision" value={dueCount} sub={`${revision.length} in queue`} />
      </div>

      <div className="chiprow mb-4" aria-label="Sections">
        <Link href={href({ category: undefined, page: undefined })}
          className={`rounded-full border px-3 py-1 text-xs ${!sp.category ? "border-indigo-600 bg-indigo-600 text-white" : "border-zinc-300 dark:border-zinc-700"}`}>
          All ({all.length})
        </Link>
        {QUESTION_CATEGORIES.map((c, i) => (
          <Link key={c} href={href({ category: c, page: undefined })}
            className={`rounded-full border px-3 py-1 text-xs ${sp.category === c ? "border-indigo-600 bg-indigo-600 text-white" : "border-zinc-300 dark:border-zinc-700"}`}>
            {String.fromCharCode(65 + i)}. {categoryLabel(c)} ({catCount(c)})
          </Link>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <nav aria-label="Question views" className="tabbar">
          {(["all", "revision", "bookmarked"] as const).map((v) => (
            <Link key={v} href={href({ view: v === "all" ? undefined : v, page: undefined })} aria-current={v === view ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 ${v === view ? "bg-indigo-600 text-white" : "muted"}`}>
              {v === "all" ? "All questions" : v === "revision" ? `Revision queue (${revision.length})` : "Bookmarked"}
            </Link>
          ))}
        </nav>
        {view !== "revision" && (
          <form action="/interview" className="flex flex-wrap gap-2">
            {sp.category && <input type="hidden" name="category" value={sp.category} />}
            {view !== "all" && <input type="hidden" name="view" value={view} />}
            <input name="q" placeholder="Search questions" aria-label="Search questions" className="input w-full py-1.5 sm:w-44" defaultValue={sp.q} />
            <select name="status" aria-label="Status" className="input w-auto py-1.5" defaultValue={sp.status ?? ""}>
              <option value="">Any status</option>
              {Object.entries(QUESTION_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select name="difficulty" aria-label="Difficulty" className="input w-auto py-1.5" defaultValue={sp.difficulty ?? ""}>
              <option value="">Any difficulty</option>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <button className="btn-secondary py-1.5">Filter</button>
          </form>
        )}
      </div>

      <Card>
        {questions.length === 0 ? (
          <EmptyState title={view === "revision" ? "Your revision queue is empty" : "No questions match"}>
            {view === "revision" ? "Every saved attempt schedules its next revision here — weaker answers come back sooner." : "Try clearing filters or add your own question."}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {questions.map((q) => {
              const rev = revisionById.get(q.id);
              return (
                <li key={q.id} className="flex items-start gap-2 py-3">
                  <BookmarkButton id={q.id} bookmarked={q.bookmarked} />
                  <Link href={`/interview/${q.id}`} className="min-w-0 flex-1 group">
                    <p className="text-sm font-medium group-hover:underline">{q.question}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                      <Badge>{categoryLabel(q.category)}</Badge>
                      <span className="muted">{q.topic} · {q.difficulty}</span>
                      <Badge tone={STATUS_TONE[q.status]}>{QUESTION_STATUSES[q.status]}</Badge>
                      {q.last_score !== null && <span className="muted">last score {q.last_score} · {q.attempt_count} attempt(s)</span>}
                      {rev && <span className={rev.due_date <= today ? "text-amber-600" : "muted"}>revise {rev.due_date <= today ? "now" : formatDate(rev.due_date)}</span>}
                      {q.is_sample && <span className="muted">· starter</span>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {view !== "revision" && total > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="muted">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
            <div className="flex gap-2">
              {page > 1 && <Link className="btn-secondary py-1" href={href({ page: String(page - 1) })}>Previous</Link>}
              {page * PAGE_SIZE < total && <Link className="btn-secondary py-1" href={href({ page: String(page + 1) })}>Next</Link>}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

import Link from "next/link";
import { AddTaskButton } from "@/components/tasks/task-form";
import { RescheduleOverdueButton, TaskItem } from "@/components/tasks/task-item";
import { Card, EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { CATEGORIES, TASK_STATUSES } from "@/lib/constants";
import { getContext } from "@/lib/data";
import { one, query } from "@/lib/db";
import { addDays, formatDate, formatMinutes, startOfMonth, startOfWeek, weekdayShort } from "@/lib/dates";
import type { LearningTask } from "@/lib/types";

const VIEWS = ["day", "week", "month", "overdue", "all"] as const;
type View = (typeof VIEWS)[number];
const PAGE_SIZE = 25;

type Search = { view?: string; date?: string; category?: string; status?: string; q?: string; page?: string };

export default async function TasksPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { today } = await getContext();
  const view: View = (VIEWS as readonly string[]).includes(sp.view ?? "") ? (sp.view as View) : "day";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date! : today;
  const page = Math.max(1, Number(sp.page) || 1);

  const href = (patch: Partial<Search>) => {
    const p = new URLSearchParams(Object.entries({ view, date, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/tasks?${p}`;
  };

  let rangeStart = date;
  let rangeEnd = date;
  if (view === "week") {
    rangeStart = startOfWeek(date);
    rangeEnd = addDays(rangeStart, 6);
  } else if (view === "month") {
    rangeStart = startOfWeek(startOfMonth(date));
    rangeEnd = addDays(rangeStart, 41);
  }

  const where: string[] = [];
  const params: unknown[] = [];
  const p = (v: unknown) => `$${params.push(v)}`;
  if (view === "day" || view === "week" || view === "month") where.push(`planned_date between ${p(rangeStart)} and ${p(rangeEnd)}`);
  else if (view === "overdue") where.push(`planned_date < ${p(today)} and status <> 'completed'`);
  if (sp.category && sp.category in CATEGORIES) where.push(`category = ${p(sp.category)}`);
  if (sp.status && sp.status in TASK_STATUSES) where.push(`status = ${p(sp.status)}`);
  if (sp.q) where.push(`title ilike ${p(`%${sp.q.replace(/[%_\\]/g, "")}%`)}`);
  const whereSql = where.length ? `where ${where.join(" and ")}` : "";
  const limitSql = view === "all" ? `limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}` : "";

  const [tasks, totalRow, overdueRow] = await Promise.all([
    query<LearningTask>(`select * from learning_tasks ${whereSql} order by planned_date nulls last, created_at ${limitSql}`, params),
    one<{ n: number }>(`select count(*)::int as n from learning_tasks ${whereSql}`, params),
    one<{ n: number }>("select count(*)::int as n from learning_tasks where planned_date < $1 and status <> 'completed'", [today]),
  ]);
  const total = totalRow?.n ?? tasks.length;
  const overdueCount = overdueRow?.n ?? 0;

  return (
    <>
      <PageHeader title="Daily tasks" description="Plan, complete and reschedule your learning. Progress only counts tasks you mark complete."
        actions={<><RescheduleOverdueButton count={overdueCount} /><AddTaskButton defaultDate={view === "day" ? date : today} /></>} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <nav aria-label="Task views" className="tabbar">
          {VIEWS.map((v) => (
            <Link key={v} href={href({ view: v, page: undefined })} aria-current={v === view ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 capitalize ${v === view ? "bg-indigo-600 text-white" : "muted hover:text-zinc-900 dark:hover:text-zinc-100"}`}>
              {v}{v === "overdue" && overdueCount ? ` (${overdueCount})` : ""}
            </Link>
          ))}
        </nav>
        <form className="flex flex-wrap gap-2" action="/tasks">
          <input type="hidden" name="view" value={view} />
          <input type="hidden" name="date" value={date} />
          <input name="q" placeholder="Search tasks" aria-label="Search tasks" className="input w-full py-1.5 sm:w-40" defaultValue={sp.q} />
          <select name="category" aria-label="Category" className="input w-auto py-1.5" defaultValue={sp.category ?? ""}>
            <option value="">All categories</option>
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select name="status" aria-label="Status" className="input w-auto py-1.5" defaultValue={sp.status ?? ""}>
            <option value="">All statuses</option>
            {Object.entries(TASK_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="btn-secondary py-1.5">Filter</button>
          {(sp.q || sp.category || sp.status) && <Link href={href({ q: undefined, category: undefined, status: undefined })} className="btn-ghost py-1.5">Clear</Link>}
        </form>
      </div>

      {(view === "day" || view === "week" || view === "month") && (
        <div className="mb-4 flex items-center gap-2">
          <Link className="btn-secondary px-2 py-1" aria-label="Previous"
            href={href({ date: view === "day" ? addDays(date, -1) : view === "week" ? addDays(date, -7) : addDays(startOfMonth(date), -1) })}>←</Link>
          <Link className="btn-secondary py-1" href={href({ date: today })}>Today</Link>
          <Link className="btn-secondary px-2 py-1" aria-label="Next"
            href={href({ date: view === "day" ? addDays(date, 1) : view === "week" ? addDays(date, 7) : addDays(startOfMonth(date), 32) })}>→</Link>
          <span className="ml-2 font-medium">
            {view === "day" && formatDate(date, { weekday: "long", year: "numeric" })}
            {view === "week" && `${formatDate(rangeStart)} – ${formatDate(rangeEnd, { year: "numeric" })}`}
            {view === "month" && formatDate(date, { day: undefined, month: "long", year: "numeric" })}
          </span>
        </div>
      )}

      {view === "day" && <DayView tasks={tasks} today={today} date={date} />}
      {view === "week" && <WeekView tasks={tasks} today={today} start={rangeStart} href={href} />}
      {view === "month" && <MonthView tasks={tasks} today={today} start={rangeStart} month={date.slice(0, 7)} href={href} />}
      {(view === "overdue" || view === "all") && (
        <Card>
          {tasks.length === 0 ? (
            <EmptyState title={view === "overdue" ? "Nothing overdue — nice work." : "No tasks match these filters."} />
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {tasks.map((t) => <TaskItem key={t.id} task={t} today={today} showDate />)}
            </ul>
          )}
          {view === "all" && total > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="muted">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
              <div className="flex gap-2">
                {page > 1 && <Link className="btn-secondary py-1" href={href({ page: String(page - 1) })}>Previous</Link>}
                {page * PAGE_SIZE < total && <Link className="btn-secondary py-1" href={href({ page: String(page + 1) })}>Next</Link>}
              </div>
            </div>
          )}
        </Card>
      )}
    </>
  );
}

function DayView({ tasks, today, date }: { tasks: LearningTask[]; today: string; date: string }) {
  const done = tasks.filter((t) => t.status === "completed");
  const planned = tasks.reduce((s, t) => s + t.estimated_minutes, 0);
  const spent = done.reduce((s, t) => s + (t.actual_minutes ?? t.estimated_minutes), 0);
  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Checklist · {done.length}/{tasks.length} complete</h2>
        <span className="muted text-xs">Planned {formatMinutes(planned)} · done {formatMinutes(spent)}</span>
      </div>
      <ProgressBar value={tasks.length ? (done.length / tasks.length) * 100 : 0} label="Today's completion" />
      {tasks.length === 0 ? (
        <div className="mt-4"><EmptyState title={`Nothing planned for ${date === today ? "today" : formatDate(date)}`}>Use “Add task” to plan something.</EmptyState></div>
      ) : (
        <ul className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
          {tasks.map((t) => <TaskItem key={t.id} task={t} today={today} />)}
        </ul>
      )}
    </Card>
  );
}

function WeekView({ tasks, today, start, href }: { tasks: LearningTask[]; today: string; start: string; href: (p: Partial<Search>) => string }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-7">
      {days.map((d) => {
        const dt = tasks.filter((t) => t.planned_date === d);
        const done = dt.filter((t) => t.status === "completed").length;
        return (
          <div key={d} className={`card p-3 ${d === today ? "ring-2 ring-indigo-500" : ""}`}>
            <Link href={href({ view: "day", date: d })} className="mb-2 flex items-baseline justify-between hover:underline">
              <span className="text-sm font-semibold">{weekdayShort(d)} {formatDate(d)}</span>
              <span className="muted text-xs">{done}/{dt.length}</span>
            </Link>
            {dt.length === 0 ? <p className="muted text-xs">No tasks</p> : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {dt.map((t) => <TaskItem key={t.id} task={t} today={today} />)}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ tasks, today, start, month, href }: { tasks: LearningTask[]; today: string; start: string; month: string; href: (p: Partial<Search>) => string }) {
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  return (
    <div className="card p-1.5 sm:p-2">
      <div className="grid grid-cols-7 gap-0.5 text-xs sm:gap-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="muted px-1 py-1 text-center font-medium sm:px-2 sm:text-left"><span className="sm:hidden">{d[0]}</span><span className="hidden sm:inline">{d}</span></div>)}
        {days.map((d) => {
          const dt = tasks.filter((t) => t.planned_date === d);
          const done = dt.filter((t) => t.status === "completed").length;
          const overdue = dt.some((t) => t.status !== "completed" && d < today);
          return (
            <Link key={d} href={href({ view: "day", date: d })}
              className={`min-h-14 min-w-0 rounded-md border p-1 hover:border-indigo-400 sm:min-h-20 sm:p-1.5 ${d.slice(0, 7) === month ? "" : "opacity-40"} ${d === today ? "border-indigo-500" : "border-zinc-200 dark:border-zinc-800"}`}>
              <div className="flex flex-col items-center sm:flex-row sm:justify-between">
                <span className="font-medium">{Number(d.slice(8))}</span>
                {dt.length > 0 && <span className={`text-[10px] sm:text-xs ${overdue ? "text-amber-600" : done === dt.length ? "text-emerald-600" : "muted"}`}>{done}/{dt.length}</span>}
              </div>
              <ul className="mt-1 hidden space-y-0.5 sm:block">
                {dt.slice(0, 2).map((t) => <li key={t.id} className={`truncate ${t.status === "completed" ? "muted line-through" : ""}`}>{t.title}</li>)}
                {dt.length > 2 && <li className="muted">+{dt.length - 2} more</li>}
              </ul>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

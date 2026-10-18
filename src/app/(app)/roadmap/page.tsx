import Link from "next/link";
import { TaskCheck } from "@/components/tasks/task-check";
import { Badge, EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { categoryLabel, TASK_STATUSES } from "@/lib/constants";
import { getContext } from "@/lib/data";
import { query } from "@/lib/db";
import { formatDate, formatMinutes } from "@/lib/dates";
import { computeTaskMetrics } from "@/lib/metrics";
import type { LearningTask, Roadmap } from "@/lib/types";

export default async function RoadmapPage() {
  const { profile, today } = await getContext();
  if (!profile.roadmap_generated) {
    return (
      <>
        <PageHeader title="Six-month roadmap" />
        <EmptyState title="No roadmap yet" action={<Link className="btn-primary" href="/dashboard">Create my plan</Link>}>
          Create your plan from the dashboard to see your monthly and weekly goals here.
        </EmptyState>
      </>
    );
  }

  const [roadmaps, tasks] = await Promise.all([
    query<Roadmap>("select * from learning_roadmaps order by month_number"),
    query<LearningTask>("select * from learning_tasks where roadmap_id is not null order by planned_date, created_at"),
  ]);
  const { currentWeek } = computeTaskMetrics(tasks, today, profile.timezone, profile.start_date);

  return (
    <>
      <PageHeader title="Six-month roadmap"
        description={`Started ${formatDate(profile.start_date, { year: "numeric" })}. You're in week ${currentWeek}. Tick tasks here or in Daily Tasks.`} />
      <div className="space-y-4">
        {roadmaps.map((r) => {
          const mt = tasks.filter((t) => t.roadmap_id === r.id);
          const done = mt.filter((t) => t.status === "completed").length;
          const isCurrent = r.weeks.some((w) => w.week === currentWeek);
          return (
            <details key={r.id} open={isCurrent} className="card group">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-semibold text-white">M{r.month_number}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{r.title}</h2>
                    <Badge tone="indigo">{r.level}</Badge>
                    {isCurrent && <Badge tone="green">Current</Badge>}
                  </div>
                  <p className="muted text-sm">{r.outcome}</p>
                </div>
                <div className="w-40">
                  <div className="muted mb-1 text-right text-xs tabular-nums">{done}/{mt.length} tasks</div>
                  <ProgressBar value={mt.length ? (done / mt.length) * 100 : 0} label={`Month ${r.month_number} progress`} />
                </div>
              </summary>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {r.weeks.map((w) => {
                  const wt = mt.filter((t) => t.week_number === w.week);
                  const wd = wt.filter((t) => t.status === "completed").length;
                  return (
                    <div key={w.week} className={`rounded-lg border p-3 ${w.week === currentWeek ? "border-indigo-300 dark:border-indigo-800" : "border-zinc-200 dark:border-zinc-800"}`}>
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="text-sm font-semibold">Week {w.week}: {w.title}</h3>
                        <span className="muted text-xs tabular-nums">{wd}/{wt.length}</span>
                      </div>
                      <p className="muted mt-0.5 text-xs">{w.goal}</p>
                      <ul className="mt-2 space-y-1.5">
                        {wt.map((t) => (
                          <li key={t.id} className="flex items-start gap-2 text-sm">
                            <span className="pt-0.5"><TaskCheck id={t.id} status={t.status} title={t.title} /></span>
                            <span className="min-w-0 flex-1">
                              <span className={t.status === "completed" ? "muted line-through" : ""}>{t.title}</span>
                              <span className="muted block text-xs">
                                {formatDate(t.planned_date)} · {categoryLabel(t.category)} · {formatMinutes(t.estimated_minutes)}
                                {t.status !== "completed" && t.status !== "not_started" && ` · ${TASK_STATUSES[t.status]}`}
                                {t.status !== "completed" && t.planned_date && t.planned_date < today && <span className="text-amber-600"> · overdue</span>}
                              </span>
                              {t.resource_links.length > 0 && (
                                <span className="flex flex-wrap gap-2 text-xs">
                                  {t.resource_links.map((l) => (
                                    <a key={l} href={l} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">
                                      {new URL(l).hostname.replace("www.", "")}
                                    </a>
                                  ))}
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 border-t border-zinc-100 pt-2 text-xs dark:border-zinc-800"><b>Done when:</b> {w.criteria}</p>
                    </div>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}

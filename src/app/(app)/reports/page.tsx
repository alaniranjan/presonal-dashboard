import Link from "next/link";
import { SimpleBarChart } from "@/components/charts";
import { Badge, Card, EmptyState, PageHeader, ProgressBar, Stat } from "@/components/ui";
import { categoryLabel, ROUND_TYPES } from "@/lib/constants";
import { getContext } from "@/lib/data";
import { addDays, formatDate, formatMinutes } from "@/lib/dates";
import { query } from "@/lib/db";
import { computeJobStats, computeSkillScores, type JobRow, type QuestionRow, type TaskRow } from "@/lib/metrics";

const PERIODS = { day: { label: "Daily", count: 14 }, week: { label: "Weekly", count: 12 }, month: { label: "Monthly", count: 6 } } as const;
type Period = keyof typeof PERIODS;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const sp = await searchParams;
  const period: Period = sp.period && sp.period in PERIODS ? (sp.period as Period) : "week";
  const { profile, today } = await getContext();
  const tz = profile.timezone;

  const [progress, topics, mistakes, projects, jobs, overdue, followUps, milestones, rounds, mocks, tasks, questions] = await Promise.all([
    query<{ period: string; planned: number; completed: number; planned_minutes: number; actual_minutes: number }>(
      `with p as (
         select d::date as period from generate_series(
           date_trunc($1, ($2::date - ($3 || ' ' || $1)::interval)::timestamp) + ('1 ' || $1)::interval,
           date_trunc($1, $2::date::timestamp), ('1 ' || $1)::interval) d)
       select p.period::text,
         count(t.id) filter (where date_trunc($1, t.planned_date::timestamp)::date = p.period)::int planned,
         count(t.id) filter (where t.status = 'completed' and date_trunc($1, (t.completed_at at time zone $4)::timestamp)::date = p.period)::int completed,
         coalesce(sum(t.estimated_minutes) filter (where date_trunc($1, t.planned_date::timestamp)::date = p.period), 0)::int planned_minutes,
         coalesce(sum(coalesce(t.actual_minutes, t.estimated_minutes)) filter (where t.status = 'completed'
           and date_trunc($1, (t.completed_at at time zone $4)::timestamp)::date = p.period), 0)::int actual_minutes
       from p left join learning_tasks t on true group by p.period order by p.period`,
      [period, today, PERIODS[period].count, tz]),
    query<{ category: string; questions: number; attempts: number; latest: number; first: number }>(
      `select q.category, count(*)::int questions, sum(q.attempt_count)::int attempts,
         round(avg(q.last_score))::int latest, round(avg(f.score))::int first
       from interview_questions q
       join lateral (select score from answer_attempts x where x.question_id = q.id order by created_at limit 1) f on true
       where q.attempt_count > 0 group by q.category order by latest asc`),
    query<{ id: string; question: string; category: string; missed: string; n: number }>(
      `select q.id, q.question, q.category, m.missed, count(*)::int n
       from answer_attempts a join interview_questions q on q.id = a.question_id
       cross join lateral unnest(q.expected_points) as m(missed)
       where not (m.missed = any(a.points_covered))
       group by q.id, q.question, q.category, m.missed order by n desc, q.question limit 12`),
    query<{ id: string; name: string; status: string; total: number; done: number }>(
      `select p.id, p.name, p.status, count(m.id)::int total, count(m.id) filter (where m.status = 'completed')::int done
       from projects p left join project_milestones m on m.project_id = p.id group by p.id order by p.sort_order, p.created_at`),
    query<JobRow>("select status, date_applied, follow_up_date, portal from job_applications"),
    query<{ id: string; title: string; planned_date: string }>(
      "select id, title, planned_date from learning_tasks where status <> 'completed' and planned_date < $1 order by planned_date limit 8", [today]),
    query<{ id: string; company: string; job_title: string; follow_up_date: string }>(
      `select id, company, job_title, follow_up_date from job_applications
       where follow_up_date <= $1 and status not in ('rejected', 'offer') order by follow_up_date limit 8`, [addDays(today, 7)]),
    query<{ id: string; title: string; due_date: string; project_id: string; name: string }>(
      `select m.id, m.title, m.due_date, m.project_id, p.name from project_milestones m join projects p on p.id = m.project_id
       where m.status <> 'completed' and m.due_date <= $1 order by m.due_date limit 8`, [addDays(today, 14)]),
    query<{ id: string; round_type: string; scheduled_at: string; company: string; application_id: string }>(
      `select r.id, r.round_type, r.scheduled_at, a.company, a.id application_id from interview_rounds r
       join job_applications a on a.id = r.application_id where r.outcome = 'scheduled' and r.scheduled_at >= now()
       order by r.scheduled_at limit 8`),
    query<{ id: string; title: string; overall_score: number; completed_at: string }>(
      "select id, title, overall_score, completed_at from mock_interviews where status = 'completed' order by completed_at desc limit 8"),
    query<TaskRow>("select id, title, category, status, planned_date, completed_at, estimated_minutes, actual_minutes, roadmap_id, week_number from learning_tasks"),
    query<QuestionRow>("select id, category, status, last_score, attempt_count from interview_questions"),
  ]);

  const js = computeJobStats(jobs, today);
  const weakSkills = computeSkillScores(tasks, questions).filter((s) => s.score !== null && s.score < 50);
  const totals = progress.reduce((a, p) => ({ planned: a.planned + p.planned_minutes, actual: a.actual + p.actual_minutes, done: a.done + p.completed, tasks: a.tasks + p.planned }), { planned: 0, actual: 0, done: 0, tasks: 0 });
  const label = (d: string) => period === "month" ? formatDate(d, { day: undefined, month: "short" }) : period === "week" ? `wk ${formatDate(d)}` : formatDate(d, { weekday: "short" });
  const chartData = progress.map((p) => ({ period: label(p.period), planned: Math.round(p.planned_minutes / 6) / 10, actual: Math.round(p.actual_minutes / 6) / 10 }));

  return (
    <>
      <PageHeader title="Reports" description="Every figure is calculated from records you saved."
        actions={<>
          <a className="btn-secondary" href="/api/export/tasks" download>Tasks CSV</a>
          <a className="btn-secondary" href="/api/export/attempts" download>Interview attempts CSV</a>
          <a className="btn-secondary" href="/api/export/applications" download>Applications CSV</a>
        </>} />

      <Card title="Study time vs planned" action={
        <nav aria-label="Report period" className="tabbar text-xs">
          {(Object.keys(PERIODS) as Period[]).map((p) => (
            <Link key={p} href={`/reports?period=${p}`} aria-current={p === period ? "page" : undefined}
              className={`rounded-md px-2.5 py-1 ${p === period ? "bg-indigo-600 text-white" : "muted"}`}>{PERIODS[p].label}</Link>
          ))}
        </nav>}>
        <div className="mb-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Tasks completed" value={totals.done} sub={`of ${totals.tasks} planned in this range`} />
          <Stat label="Study time" value={formatMinutes(totals.actual)} sub={`planned ${formatMinutes(totals.planned)}`} />
          <Stat label="Time vs plan" value={totals.planned ? `${Math.round((totals.actual / totals.planned) * 100)}%` : "—"} />
          <Stat label="Mock interviews" value={mocks.length} sub={mocks.length ? `latest ${mocks[0].overall_score}` : "none completed"} />
        </div>
        <SimpleBarChart data={chartData} xKey="period" label={`${PERIODS[period].label} planned versus actual study hours`}
          bars={[{ key: "planned", label: "Planned hours", color: "#a1a1aa" }, { key: "actual", label: "Actual hours", color: "#4f46e5" }]} />
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-indigo-600 dark:text-indigo-400">Show table</summary>
          <table className="mt-2 w-full text-left text-sm">
            <thead className="muted text-xs uppercase"><tr>{["Period", "Planned tasks", "Completed", "Planned time", "Actual time"].map((h) => <th key={h} scope="col" className="py-1 font-medium">{h}</th>)}</tr></thead>
            <tbody className="tabular-nums">
              {progress.map((p) => <tr key={p.period}><td className="py-1">{label(p.period)}</td><td>{p.planned}</td><td>{p.completed}</td><td>{formatMinutes(p.planned_minutes)}</td><td>{formatMinutes(p.actual_minutes)}</td></tr>)}
            </tbody>
          </table>
          <p className="muted mt-1 text-xs">Actual time uses the minutes you logged; completed tasks without a log count at their estimate.</p>
        </details>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Interview scores by topic">
          {topics.length === 0 ? <p className="muted text-sm">Answer questions in Interview Practice to see topic scores.</p> : (
            <table className="w-full text-left text-sm">
              <thead className="muted text-xs uppercase"><tr><th scope="col" className="py-1 font-medium">Topic</th><th scope="col" className="font-medium">First</th><th scope="col" className="font-medium">Latest</th><th scope="col" className="font-medium">Change</th><th scope="col" className="font-medium">Attempts</th></tr></thead>
              <tbody className="tabular-nums">
                {topics.map((t) => {
                  const change = t.latest - t.first;
                  return (
                    <tr key={t.category}>
                      <td className="py-1">{categoryLabel(t.category)}</td><td>{t.first}</td>
                      <td className={t.latest < 50 ? "text-amber-600" : t.latest >= 75 ? "text-emerald-600" : ""}>{t.latest}</td>
                      <td className={change > 0 ? "text-emerald-600" : change < 0 ? "text-red-600" : "muted"}>{change > 0 ? `+${change}` : change}</td>
                      <td>{t.attempts}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Repeated mistakes">
          {mistakes.length === 0 ? <p className="muted text-sm">Points you miss in answers show up here, most frequent first.</p> : (
            <ul className="space-y-2 text-sm">
              {mistakes.map((m) => (
                <li key={m.id + m.missed} className="flex items-start justify-between gap-3">
                  <span><span className="font-medium">{m.missed}</span>
                    <Link href={`/interview/${m.id}`} className="muted block text-xs hover:underline">{categoryLabel(m.category)} · {m.question}</Link></span>
                  <Badge tone="amber">missed {m.n}×</Badge>
                </li>
              ))}
            </ul>
          )}
          {weakSkills.length > 0 && (
            <div className="mt-4"><div className="muted mb-1 text-xs font-medium uppercase">Weak skills (score under 50)</div>
              <div className="flex flex-wrap gap-1">{weakSkills.map((s) => <Badge key={s.key} tone="amber">{s.label} · {s.score}</Badge>)}</div></div>
          )}
        </Card>

        <Card title="Project completion">
          {projects.length === 0 ? <p className="muted text-sm">No projects yet. <Link className="underline" href="/projects">Add them</Link>.</p> : (
            <ul className="space-y-3">
              {projects.map((p) => (
                <li key={p.id}>
                  <div className="mb-1 flex justify-between gap-2 text-sm"><Link href={`/projects/${p.id}`} className="truncate hover:underline">{p.name}</Link><span className="muted shrink-0 tabular-nums">{p.done}/{p.total}</span></div>
                  <ProgressBar value={p.total ? (p.done / p.total) * 100 : 0} label={`${p.name} completion`} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Application funnel">
          {js.total === 0 ? <p className="muted text-sm">No applications tracked yet.</p> : (
            <ul className="space-y-2 text-sm">
              {([["Applied", js.applied], ["Recruiter responded", js.responded], ["Reached interviews", js.interviews], ["Offers", js.offers]] as const).map(([l, n]) => (
                <li key={l}>
                  <div className="mb-1 flex justify-between"><span>{l}</span><span className="tabular-nums">{n}{js.applied ? ` · ${Math.round((n / js.applied) * 100)}%` : ""}</span></div>
                  <ProgressBar value={js.applied ? (n / js.applied) * 100 : 0} label={`${l} share of applications`} />
                </li>
              ))}
            </ul>
          )}
          <p className="muted mt-3 text-xs">Application-to-interview conversion: <b>{js.interviewRate}%</b> · rejected {js.rejected}</p>
        </Card>
      </div>

      <h2 className="mt-6 mb-3 text-lg font-semibold">Upcoming deadlines and overdue items</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card title={`Overdue tasks`} action={<Link className="text-xs text-indigo-600 dark:text-indigo-400" href="/tasks?view=overdue">All →</Link>}>
          {overdue.length === 0 ? <p className="muted text-sm">None.</p> : <ul className="space-y-1 text-sm">{overdue.map((t) => <li key={t.id}>{t.title} <span className="text-xs text-amber-600">{formatDate(t.planned_date)}</span></li>)}</ul>}
        </Card>
        <Card title="Follow-ups (next 7 days)">
          {followUps.length === 0 ? <p className="muted text-sm">None.</p> : <ul className="space-y-1 text-sm">{followUps.map((f) => <li key={f.id}><Link className="hover:underline" href={`/jobs/${f.id}`}>{f.company}</Link> <span className={`text-xs ${f.follow_up_date <= today ? "text-amber-600" : "muted"}`}>{formatDate(f.follow_up_date)}</span></li>)}</ul>}
        </Card>
        <Card title="Milestones (next 14 days)">
          {milestones.length === 0 ? <p className="muted text-sm">None with due dates.</p> : <ul className="space-y-1 text-sm">{milestones.map((m) => <li key={m.id}><Link className="hover:underline" href={`/projects/${m.project_id}`}>{m.title}</Link> <span className={`text-xs ${m.due_date < today ? "text-amber-600" : "muted"}`}>{formatDate(m.due_date)}</span></li>)}</ul>}
        </Card>
        <Card title="Interview rounds">
          {rounds.length === 0 ? <p className="muted text-sm">None scheduled.</p> : <ul className="space-y-1 text-sm">{rounds.map((r) => <li key={r.id}><Link className="hover:underline" href={`/jobs/${r.application_id}`}>{r.company}</Link> · {ROUND_TYPES[r.round_type as keyof typeof ROUND_TYPES]} <span className="muted text-xs">{new Date(r.scheduled_at).toLocaleString("en-IN", { timeZone: tz, dateStyle: "medium", timeStyle: "short" })}</span></li>)}</ul>}
        </Card>
      </div>

      {mocks.length > 0 && (
        <Card title="Recent mock interviews" className="mt-4">
          <ul className="flex flex-wrap gap-2">{mocks.map((m) => <li key={m.id}><Link href={`/mock-interviews/${m.id}`}><Badge tone={m.overall_score >= 75 ? "green" : m.overall_score >= 50 ? "blue" : "amber"}>{formatDate(m.completed_at)} · {m.overall_score}</Badge></Link></li>)}</ul>
        </Card>
      )}
      {progress.every((p) => p.planned === 0) && js.total === 0 && topics.length === 0 && (
        <div className="mt-4"><EmptyState title="Reports fill in as you work">Complete tasks, answer questions and track applications.</EmptyState></div>
      )}
    </>
  );
}

import Link from "next/link";
import { GeneratePlan } from "@/components/dashboard/generate-plan";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { TaskCheck } from "@/components/tasks/task-check";
import { Badge, Card, EmptyState, PageHeader, ProgressBar, Stat, TextLink } from "@/components/ui";
import { ACTIVE_JOB_STATUSES, categoryLabel, PROJECT_STATUS } from "@/lib/constants";
import { getContext } from "@/lib/data";
import { one, query } from "@/lib/db";
import { addDays, formatDate, formatMinutes } from "@/lib/dates";
import { computeInterviewMetrics, computeSkillScores, computeTaskMetrics, PLAN_DAYS, type QuestionRow, type TaskRow } from "@/lib/metrics";
import type { Roadmap } from "@/lib/types";


export default async function DashboardPage() {
  const { profile, today } = await getContext();

  if (!profile.roadmap_generated) {
    return (
      <>
        <PageHeader title={`Welcome${profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`}
          description="Set up your plan to start tracking real progress." />
        <GeneratePlan today={today} />
      </>
    );
  }

  const [tasks, questions, revisionRows, roadmaps, activeJobs, followUps, roundRows, projects] = await Promise.all([
    query<TaskRow>("select id, title, category, status, planned_date, completed_at, estimated_minutes, actual_minutes, roadmap_id, week_number from learning_tasks"),
    query<QuestionRow>("select id, category, status, last_score, attempt_count from interview_questions"),
    query<{ id: string; due_date: string; reason: string | null; question_id: string; question: string; category: string }>(
      `select r.id, r.due_date, r.reason, q.id as question_id, q.question, q.category
       from revision_queue r join interview_questions q on q.id = r.question_id
       where r.completed_at is null and r.due_date <= $1 order by r.due_date limit 6`, [today]),
    query<Pick<Roadmap, "id" | "month_number" | "title" | "level" | "weeks">>(
      "select id, month_number, title, level, weeks from learning_roadmaps order by month_number"),
    one<{ n: number }>("select count(*)::int as n from job_applications where status = any($1)", [ACTIVE_JOB_STATUSES]),
    query<{ id: string; company: string; job_title: string; follow_up_date: string }>(
      `select id, company, job_title, follow_up_date from job_applications
       where status not in ('rejected', 'offer') and follow_up_date is not null and follow_up_date <= $1
       order by follow_up_date limit 5`, [addDays(today, 3)]),
    query<{ id: string; round_type: string; scheduled_at: string; company: string }>(
      `select r.id, r.round_type, r.scheduled_at, a.company
       from interview_rounds r join job_applications a on a.id = r.application_id
       where r.outcome = 'scheduled' and r.scheduled_at >= now() order by r.scheduled_at limit 5`),
    query<{ id: string; name: string; status: keyof typeof PROJECT_STATUS; total: number; done: number; next_title: string | null; next_due: string | null }>(
      `select p.id, p.name, p.status, count(m.id)::int total, count(m.id) filter (where m.status = 'completed')::int done,
         (select title from project_milestones x where x.project_id = p.id and x.status <> 'completed' order by sort_order limit 1) next_title,
         (select due_date from project_milestones x where x.project_id = p.id and x.status <> 'completed' order by sort_order limit 1)::text next_due
       from projects p left join project_milestones m on m.project_id = p.id
       where p.status <> 'completed' group by p.id order by (p.status = 'in_progress') desc, p.sort_order limit 3`),
  ]);
  const revision = revisionRows.map((r) => ({ ...r, interview_questions: { id: r.question_id, question: r.question, category: r.category } }));
  const rounds = roundRows.map((r) => ({ ...r, job_applications: { company: r.company } }));

  const m = computeTaskMetrics(tasks, today, profile.timezone, profile.start_date);
  const skills = computeSkillScores(tasks, questions);
  const iv = computeInterviewMetrics(questions);
  const currentPlan = roadmaps.flatMap((r) => r.weeks.map((w) => ({ ...w, month: r.month_number, monthTitle: r.title, level: r.level })))
    .find((w) => w.week === m.currentWeek);
  const monthly = roadmaps.map((r) => {
    const mt = tasks.filter((t) => t.roadmap_id === r.id);
    const done = mt.filter((t) => t.status === "completed").length;
    return { ...r, total: mt.length, done };
  });

  return (
    <>
      <PageHeader
        title={`Day ${Math.min(m.dayOfPlan, PLAN_DAYS)} of ${PLAN_DAYS}`}
        description={`${formatDate(today, { weekday: "long", year: "numeric" })} · ${currentPlan ? `Month ${currentPlan.month}, week ${currentPlan.week}: ${currentPlan.title}` : ""}`}
        actions={<Link href="/tasks" className="btn-primary">Open today&apos;s tasks</Link>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="6-month progress" value={`${Math.round(m.roadmapPct)}%`} sub={`${m.roadmapDone} / ${m.roadmapTotal} roadmap tasks`} />
        <Stat label="Today" value={`${m.todayDone} / ${m.todayTasks.length}`} sub="tasks completed" />
        <Stat label="Study this week" value={formatMinutes(m.weekMinutes)}
          sub={m.weekEstimatedOnly ? `${m.weekEstimatedOnly} task(s) counted at estimate` : "from logged time"} />
        <Stat label="Streak" value={`${m.streak} day${m.streak === 1 ? "" : "s"}`} sub={`${m.activeDaysThisWeek}/${m.daysElapsedThisWeek} active days this week`} />
        <Stat label="Overdue" value={m.overdue.length} sub={`${m.pendingCount} upcoming · ${m.completedCount} done`} />
        <Stat label="Interview readiness" value={`${iv.readinessPct}%`} sub={`${iv.readyCount} of ${iv.total} questions strong`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Today's priorities" className="lg:col-span-2" action={<TextLink href="/tasks">All tasks →</TextLink>}>
          {m.todayTasks.length === 0 ? (
            <EmptyState title="Nothing planned for today">
              {m.overdue.length ? `You have ${m.overdue.length} overdue task(s) you could catch up on.` : "Add a task or enjoy a rest day."}
            </EmptyState>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {m.todayTasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2">
                  <TaskCheck id={t.id} status={t.status} title={t.title} />
                  <span className={`min-w-0 flex-1 text-sm ${t.status === "completed" ? "muted line-through" : ""}`}>{t.title}</span>
                  <span className="hidden sm:inline-flex"><Badge>{categoryLabel(t.category)}</Badge></span>
                  <span className="muted w-12 shrink-0 text-right text-xs tabular-nums">{formatMinutes(t.estimated_minutes)}</span>
                </li>
              ))}
            </ul>
          )}
          {m.overdue.length > 0 && (
            <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
              {m.overdue.length} overdue task(s). <Link className="underline" href="/tasks?view=overdue">Review and reschedule</Link>
            </p>
          )}
        </Card>

        <Card title="Current milestone">
          {currentPlan ? (
            <div className="space-y-2 text-sm">
              <div className="flex gap-2"><Badge tone="indigo">Month {currentPlan.month}</Badge><Badge>{currentPlan.level}</Badge></div>
              <p className="font-medium">Week {currentPlan.week}: {currentPlan.title}</p>
              <p className="muted">{currentPlan.goal}</p>
              <p><span className="font-medium">Done when: </span>{currentPlan.criteria}</p>
              <TextLink href="/roadmap">View roadmap →</TextLink>
            </div>
          ) : <p className="muted text-sm">Your plan has finished — keep revising and applying.</p>}
        </Card>

        <Card title="Weekly progress" className="lg:col-span-2">
          <WeeklyChart data={m.weekly} />
        </Card>

        <Card title="Skill scores" action={<span className="muted text-xs" title="Average of task completion % and latest interview scores for each skill">ⓘ how it&apos;s calculated</span>}>
          <ul className="space-y-3">
            {skills.map((s) => (
              <li key={s.key}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{s.label}</span>
                  <span className="tabular-nums">{s.score === null ? "—" : `${s.score}`}</span>
                </div>
                <ProgressBar value={s.score ?? 0} label={`${s.label} score`} />
                <div className="muted mt-0.5 text-xs">
                  Tasks {s.taskPct ?? 0}% · {s.attempted ? `interview avg ${s.questionAvg} (${s.attempted} answered)` : "no questions answered yet"}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Monthly progress">
          <ul className="space-y-3">
            {monthly.map((r) => (
              <li key={r.id}>
                <div className="mb-1 flex justify-between gap-2 text-sm">
                  <span className="truncate">M{r.month_number}: {r.title}</span>
                  <span className="muted shrink-0 tabular-nums">{r.done}/{r.total}</span>
                </div>
                <ProgressBar value={r.total ? (r.done / r.total) * 100 : 0} label={`Month ${r.month_number} progress`} />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Current projects" action={<TextLink href="/projects">All projects →</TextLink>}>
          {projects.length === 0 ? (
            <p className="muted text-sm">No open projects. <Link className="underline" href="/projects">Add the starter projects</Link>.</p>
          ) : (
            <ul className="space-y-3">
              {projects.map((p) => (
                <li key={p.id}>
                  <div className="mb-1 flex justify-between gap-2 text-sm">
                    <Link href={`/projects/${p.id}`} className="truncate hover:underline">{p.name}</Link>
                    <Badge tone={PROJECT_STATUS[p.status].tone}>{p.done}/{p.total}</Badge>
                  </div>
                  <ProgressBar value={p.total ? (p.done / p.total) * 100 : 0} label={`${p.name} progress`} />
                  {p.next_title && <p className="muted mt-1 text-xs">Next: {p.next_title}{p.next_due ? ` · due ${formatDate(p.next_due)}` : ""}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Due for revision" action={<TextLink href="/interview?view=revision">Revision queue →</TextLink>}>
          {revision.length === 0 ? (
            <p className="muted text-sm">{iv.attempted ? "Nothing due today." : "Answer a question to start your revision queue."}</p>
          ) : (
            <ul className="space-y-2">
              {revision.map((r) => r.interview_questions && (
                <li key={r.id} className="text-sm">
                  <Link href={`/interview/${r.interview_questions.id}`} className="hover:underline">{r.interview_questions.question}</Link>
                  <div className="muted text-xs">{categoryLabel(r.interview_questions.category)} · due {formatDate(r.due_date)}</div>
                </li>
              ))}
            </ul>
          )}
          {iv.weakTopics.length > 0 && (
            <div className="mt-4">
              <div className="muted mb-1 text-xs font-medium uppercase">Weak topics</div>
              <div className="flex flex-wrap gap-1">
                {iv.weakTopics.map((w) => <Badge key={w.category} tone="amber">{w.label} · {w.avg}</Badge>)}
              </div>
            </div>
          )}
        </Card>

        <Card title="Job search">
          <div className="text-sm">
            <p><span className="text-2xl font-semibold tabular-nums">{activeJobs?.n ?? 0}</span> <span className="muted">active applications</span></p>
            <div className="muted mt-3 mb-1 text-xs font-medium uppercase">Follow-ups due (next 3 days)</div>
            {followUps.length === 0 ? <p className="muted">None.</p> : (
              <ul className="space-y-1">
                {followUps.map((f) => <li key={f.id}>{f.company} — {f.job_title} <span className="muted">({formatDate(f.follow_up_date)})</span></li>)}
              </ul>
            )}
            <div className="muted mt-3 mb-1 text-xs font-medium uppercase">Upcoming interviews</div>
            {rounds.length === 0 ? <p className="muted">None scheduled.</p> : (
              <ul className="space-y-1">
                {rounds.map((r) => (
                  <li key={r.id}>{r.job_applications?.company} · {r.round_type.replace("_", " ")} <span className="muted">({formatDate(r.scheduled_at.slice(0, 10))})</span></li>
                ))}
              </ul>
            )}
            <div className="mt-3"><TextLink href="/jobs">Open job tracker →</TextLink></div>
          </div>
        </Card>
      </div>
    </>
  );
}

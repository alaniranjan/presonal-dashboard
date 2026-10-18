import Link from "next/link";
import { SimpleBarChart } from "@/components/charts";
import { DailyRoutine, JobStatusSelect, KanbanBoard } from "@/components/jobs/job-forms";
import { Badge, Card, EmptyState, PageHeader, Stat } from "@/components/ui";
import { JOB_STATUSES, PORTAL_LINKS, PORTALS } from "@/lib/constants";
import { getContext } from "@/lib/data";
import { addDays, formatDate } from "@/lib/dates";
import { one, query } from "@/lib/db";
import { computeJobStats, type JobRow } from "@/lib/metrics";
import type { JobApplication } from "@/lib/types";

const VIEWS = { table: "Tracker", board: "Kanban board", routine: "Daily routine", stats: "Job-search stats" } as const;
const FILTERS = {
  all: { label: "All", sql: "true" },
  active: { label: "Active", sql: "status in ('applied','recruiter_contacted','screening','technical_1','technical_2','hr')" },
  interviews: { label: "Interviews", sql: "status in ('screening','technical_1','technical_2','hr')" },
  followups: { label: "Follow-ups due", sql: "follow_up_date <= $TODAY and status not in ('rejected','offer')" },
  rejected: { label: "Rejected", sql: "status = 'rejected'" },
  offers: { label: "Offers", sql: "status = 'offer'" },
} as const;
const SORTS = {
  updated: { label: "Recently updated", sql: "updated_at desc" },
  applied: { label: "Date applied", sql: "date_applied desc nulls last" },
  followup: { label: "Follow-up date", sql: "follow_up_date asc nulls last" },
  company: { label: "Company", sql: "lower(company) asc" },
} as const;
const PAGE_SIZE = 20;
const STATUS_TONE: Record<string, "zinc" | "blue" | "indigo" | "green" | "red" | "amber"> = {
  saved: "zinc", to_apply: "zinc", applied: "blue", recruiter_contacted: "indigo", screening: "indigo",
  technical_1: "indigo", technical_2: "indigo", hr: "indigo", offer: "green", rejected: "red", on_hold: "amber",
};

type Search = { view?: string; filter?: string; q?: string; portal?: string; sort?: string; page?: string };

export default async function JobsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { profile, today } = await getContext();
  const view = (sp.view && sp.view in VIEWS ? sp.view : "table") as keyof typeof VIEWS;
  const href = (patch: Partial<Search>) => {
    const p = new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/jobs?${p}`;
  };

  return (
    <>
      <PageHeader title="Job applications"
        description="Track applications you find on LinkedIn, Naukri, Indeed, referrals and career sites. Everything is entered by you; nothing is fetched from the portals."
        actions={<>
          <a className="btn-secondary" href="/api/export/applications" download>Export CSV</a>
          <Link className="btn-primary" href="/jobs/new">+ Add application</Link>
        </>} />
      <nav aria-label="Job views" className="tabbar mb-4 sm:w-fit">
        {(Object.keys(VIEWS) as (keyof typeof VIEWS)[]).map((v) => (
          <Link key={v} href={`/jobs?view=${v}`} aria-current={v === view ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 ${v === view ? "bg-indigo-600 text-white" : "muted"}`}>{VIEWS[v]}</Link>
        ))}
      </nav>
      {view === "table" && <Tracker sp={sp} today={today} href={href} />}
      {view === "board" && <Board today={today} />}
      {view === "routine" && <Routine today={today} items={profile.job_checklist} />}
      {view === "stats" && <Stats today={today} />}
    </>
  );
}

async function Tracker({ sp, today, href }: { sp: Search; today: string; href: (p: Partial<Search>) => string }) {
  const filter = (sp.filter && sp.filter in FILTERS ? sp.filter : "all") as keyof typeof FILTERS;
  const sort = (sp.sort && sp.sort in SORTS ? sp.sort : "updated") as keyof typeof SORTS;
  const page = Math.max(1, Number(sp.page) || 1);
  const params: unknown[] = [today];
  const where = [FILTERS[filter].sql.replace("$TODAY", "$1")];
  if (sp.q) {
    params.push(`%${sp.q.replace(/[%_\\]/g, "")}%`);
    where.push(`(company ilike $${params.length} or job_title ilike $${params.length} or application_code ilike $${params.length})`);
  }
  if (sp.portal && sp.portal in PORTALS) {
    params.push(sp.portal);
    where.push(`portal = $${params.length}`);
  }
  const whereSql = `where ${where.join(" and ")} and $1::date is not null`;
  const [jobs, count, counts] = await Promise.all([
    query<JobApplication & { version_name: string | null }>(
      `select a.*, (select r.version_name from resumes r where r.id = a.resume_id) as version_name
       from job_applications a ${whereSql}
       order by ${SORTS[sort].sql} limit ${PAGE_SIZE} offset ${(page - 1) * PAGE_SIZE}`, params),
    one<{ n: number }>(`select count(*)::int n from job_applications ${whereSql}`, params),
    query<{ key: string; n: number }>(
      Object.entries(FILTERS).map(([k, f]) => `select '${k}' as key, count(*)::int n from job_applications where ${f.sql.replace("$TODAY", "$1")}`).join(" union all "),
      [today]),
  ]);
  const total = count?.n ?? 0;
  const n = (k: string) => counts.find((c) => c.key === k)?.n ?? 0;

  return (
    <>
      <div className="chiprow mb-3">
        {(Object.keys(FILTERS) as (keyof typeof FILTERS)[]).map((f) => (
          <Link key={f} href={href({ filter: f === "all" ? undefined : f, page: undefined })}
            className={`rounded-full border px-3 py-1 text-xs ${f === filter ? "border-indigo-600 bg-indigo-600 text-white" : "border-zinc-300 dark:border-zinc-700"}`}>
            {FILTERS[f].label} ({n(f)})
          </Link>
        ))}
      </div>
      <form action="/jobs" className="mb-4 flex flex-wrap gap-2">
        {sp.filter && <input type="hidden" name="filter" value={sp.filter} />}
        <input name="q" placeholder="Search company, title or ID" aria-label="Search applications" className="input w-full py-1.5 sm:w-56" defaultValue={sp.q} />
        <select name="portal" aria-label="Portal" className="input w-auto py-1.5" defaultValue={sp.portal ?? ""}>
          <option value="">All portals</option>
          {Object.entries(PORTALS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="sort" aria-label="Sort by" className="input w-auto py-1.5" defaultValue={sort}>
          {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>Sort: {v.label}</option>)}
        </select>
        <button className="btn-secondary py-1.5">Apply</button>
      </form>

      {jobs.length > 0 && (
        <ul className="space-y-2 md:hidden">
          {jobs.map((j) => (
            <li key={j.id} className="card p-3">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/jobs/${j.id}`} className="min-w-0">
                  <span className="block truncate font-medium">{j.company}</span>
                  <span className="muted block truncate text-xs">{j.job_title}{j.location ? ` · ${j.location}` : ""}</span>
                </Link>
                <span className="muted shrink-0 font-mono text-[11px]">{j.application_code}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <JobStatusSelect id={j.id} status={j.status} />
                <span className="muted">{PORTALS[j.portal as keyof typeof PORTALS]}</span>
                {j.date_applied && <span className="muted">applied {formatDate(j.date_applied)}</span>}
                {j.follow_up_date && (
                  <span className={j.follow_up_date <= today && !["rejected", "offer"].includes(j.status) ? "font-medium text-amber-600" : "muted"}>
                    follow up {formatDate(j.follow_up_date)}
                  </span>
                )}
              </div>
              {j.next_action && <p className="muted mt-1 truncate text-xs">Next: {j.next_action}</p>}
            </li>
          ))}
        </ul>
      )}
      <Card className={`overflow-x-auto p-0 ${jobs.length ? "hidden md:block" : ""}`}>
        {jobs.length === 0 ? (
          <div className="p-4"><EmptyState title={total === 0 && filter === "all" && !sp.q ? "No applications yet" : "Nothing matches"}>
            Add jobs as you find them. Paste the posting link so duplicates are caught.
          </EmptyState></div>
        ) : (
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="muted border-b border-zinc-200 text-xs uppercase dark:border-zinc-800">
              <tr>
                {["ID", "Company / role", "Portal", "Status", "Applied", "Follow-up", "Resume", "Next action"].map((h) => <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {jobs.map((j) => (
                <tr key={j.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  <td className="muted px-3 py-2 font-mono text-xs">{j.application_code}</td>
                  <td className="px-3 py-2">
                    <Link href={`/jobs/${j.id}`} className="font-medium hover:underline">{j.company}</Link>
                    <div className="muted text-xs">{j.job_title}{j.location ? ` · ${j.location}` : ""}</div>
                  </td>
                  <td className="px-3 py-2">{PORTALS[j.portal as keyof typeof PORTALS]}</td>
                  <td className="px-3 py-2"><JobStatusSelect id={j.id} status={j.status} /></td>
                  <td className="px-3 py-2 tabular-nums">{formatDate(j.date_applied)}</td>
                  <td className={`px-3 py-2 tabular-nums ${j.follow_up_date && j.follow_up_date <= today && !["rejected", "offer"].includes(j.status) ? "font-medium text-amber-600" : ""}`}>{formatDate(j.follow_up_date)}</td>
                  <td className="muted px-3 py-2 text-xs">{j.version_name ?? "—"}</td>
                  <td className="muted max-w-48 truncate px-3 py-2 text-xs">{j.next_action ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="muted">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
          <div className="flex gap-2">
            {page > 1 && <Link className="btn-secondary py-1" href={href({ page: String(page - 1) })}>Previous</Link>}
            {page * PAGE_SIZE < total && <Link className="btn-secondary py-1" href={href({ page: String(page + 1) })}>Next</Link>}
          </div>
        </div>
      )}
    </>
  );
}

async function Board({ today }: { today: string }) {
  const jobs = await query<Pick<JobApplication, "id" | "company" | "job_title" | "status" | "follow_up_date" | "portal" | "application_code" | "updated_at">>(
    "select id, company, job_title, status, follow_up_date, portal, application_code, updated_at from job_applications order by updated_at desc");
  if (!jobs.length) return <EmptyState title="No applications yet" action={<Link className="btn-primary" href="/jobs/new">+ Add application</Link>} />;
  return <KanbanBoard key={jobs.map((j) => j.id + j.status + j.updated_at).join()} jobs={jobs} today={today} />;
}

async function Routine({ today, items }: { today: string; items: string[] }) {
  const logs = await query<{ log_date: string; checklist: Record<string, boolean>; applications_submitted: number; recruiter_messages: number; follow_ups_sent: number; notes: string | null }>(
    "select * from job_search_logs where log_date >= $1 order by log_date desc", [addDays(today, -13)]);
  const todayLog = logs.find((l) => l.log_date === today) ?? null;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card title={`Today · ${formatDate(today, { weekday: "long" })}`} className="lg:col-span-2">
        <DailyRoutine date={today} items={items} log={todayLog} />
        <p className="muted mt-3 text-xs">Edit the checklist items in Settings.</p>
      </Card>
      <div className="space-y-4">
        <Card title="Open the portals">
          <ul className="space-y-1 text-sm">
            {PORTAL_LINKS.map((p) => <li key={p.href}><a className="text-indigo-600 hover:underline dark:text-indigo-400" href={p.href} target="_blank" rel="noreferrer">{p.label} ↗</a></li>)}
          </ul>
          <p className="muted mt-2 text-xs">Opens the real site in a new tab. This app doesn&apos;t sign in to or read from any portal.</p>
        </Card>
        <Card title="Last 14 days">
          {logs.length === 0 ? <p className="muted text-sm">No logs yet.</p> : (
            <ul className="space-y-1 text-sm">
              {logs.map((l) => {
                const done = items.filter((i) => l.checklist[i]).length;
                return (
                  <li key={l.log_date} className="flex justify-between gap-2">
                    <span>{formatDate(l.log_date, { weekday: "short" })}</span>
                    <span className="muted tabular-nums">{done}/{items.length} · {l.applications_submitted} applied · {l.follow_ups_sent} follow-ups</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

async function Stats({ today }: { today: string }) {
  const jobs = await query<JobRow>("select status, date_applied, follow_up_date, portal from job_applications");
  const s = computeJobStats(jobs, today);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Applied" value={s.applied} sub={`${s.thisWeek} this week`} />
        <Stat label="Recruiter responses" value={s.responded} sub={`${s.responseRate}% response rate`} />
        <Stat label="Interviews" value={s.interviews} sub={`${s.interviewRate}% of applications`} />
        <Stat label="Offers" value={s.offers} sub={`${s.offerRate}% of applications`} />
        <Stat label="Rejected" value={s.rejected} />
        <Stat label="Follow-ups due" value={s.followUpsDue} sub={<Link className="underline" href="/jobs?filter=followups">view</Link>} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Applications per week" className="lg:col-span-2">
          <SimpleBarChart data={s.weekly} xKey="week" bars={[{ key: "applied", label: "Applications" }]} label="Applications submitted per week, last 8 weeks" />
        </Card>
        <Card title="By portal">
          {s.byPortal.length === 0 ? <p className="muted text-sm">No submitted applications yet.</p> : (
            <table className="w-full text-sm">
              <thead className="muted text-xs uppercase"><tr><th scope="col" className="py-1 text-left font-medium">Portal</th><th scope="col" className="text-right font-medium">Applied</th><th scope="col" className="text-right font-medium">Interviews</th></tr></thead>
              <tbody>
                {s.byPortal.map((p) => (
                  <tr key={p.portal}><td className="py-1">{PORTALS[p.portal as keyof typeof PORTALS]}</td><td className="text-right tabular-nums">{p.applied}</td><td className="text-right tabular-nums">{p.interviews}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="muted mt-3 text-xs">Rates are out of applications you actually submitted. A rejection after an interview counts as rejected.</p>
        </Card>
      </div>
      <Card title="Status breakdown">
        <div className="flex flex-wrap gap-2">
          {Object.entries(JOB_STATUSES).map(([k, v]) => <Badge key={k} tone={STATUS_TONE[k]}>{v}: {jobs.filter((j) => j.status === k).length}</Badge>)}
        </div>
      </Card>
    </div>
  );
}

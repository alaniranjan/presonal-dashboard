import Link from "next/link";
import { notFound } from "next/navigation";
import { AddRoundButton, DeleteJobButton, JobStatusSelect, RoundActions } from "@/components/jobs/job-forms";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { PORTALS, ROUND_OUTCOMES, ROUND_TYPES, WORK_MODES } from "@/lib/constants";
import { getContext } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { one, query } from "@/lib/db";
import type { InterviewRound, JobApplication } from "@/lib/types";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-1.5 text-sm">
      <dt className="muted">{label}</dt>
      <dd className="min-w-0 break-words">{children || <span className="muted">—</span>}</dd>
    </div>
  );
}

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [{ profile, today }, job, rounds] = await Promise.all([
    getContext(),
    one<JobApplication & { version_name: string | null }>(
      "select a.*, r.version_name from job_applications a left join resumes r on r.id = a.resume_id where a.id = $1", [id]),
    query<InterviewRound>("select * from interview_rounds where application_id = $1 order by scheduled_at nulls last, created_at", [id]),
  ]);
  if (!job) notFound();
  const fmtTime = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: profile.timezone, dateStyle: "medium", timeStyle: "short" });
  const followDue = job.follow_up_date && job.follow_up_date <= today && !["rejected", "offer"].includes(job.status);

  return (
    <>
      <Link href="/jobs" className="btn-ghost mb-2 px-2">← Applications</Link>
      <PageHeader title={`${job.company} · ${job.job_title}`}
        description={`${job.application_code} · added ${formatDate(job.created_at, { year: "numeric" })}`}
        actions={<><JobStatusSelect id={job.id} status={job.status} /><Link href={`/jobs/${job.id}/edit`} className="btn-secondary">Edit</Link><DeleteJobButton id={job.id} /></>} />

      {followDue && <p role="status" className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">Follow-up due {formatDate(job.follow_up_date)}{job.next_action ? `: ${job.next_action}` : ""}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Details" className="lg:col-span-2">
          <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
            <Row label="Posting">{job.job_url && <a href={job.job_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">{job.job_url}</a>}</Row>
            <Row label="Portal">{PORTALS[job.portal as keyof typeof PORTALS]}</Row>
            <Row label="Location">{[job.location, job.work_mode && WORK_MODES[job.work_mode as keyof typeof WORK_MODES]].filter(Boolean).join(" · ")}</Row>
            <Row label="Experience">{job.experience_required}</Row>
            <Row label="Salary range">{job.salary_range}</Row>
            <Row label="Found / applied">{`${formatDate(job.date_found)} / ${formatDate(job.date_applied)}`}</Row>
            <Row label="Resume version">{job.version_name}</Row>
            <Row label="Required skills">{job.required_skills.length > 0 && <span className="flex flex-wrap gap-1">{job.required_skills.map((s) => <Badge key={s}>{s}</Badge>)}</span>}</Row>
            <Row label="Recruiter">{[job.recruiter_name, job.recruiter_contact].filter(Boolean).join(" · ")}</Row>
            <Row label="Referral">{job.referral_details}</Row>
            <Row label="Next action">{job.next_action}</Row>
            <Row label="Follow-up">{job.follow_up_date && formatDate(job.follow_up_date, { weekday: "short", year: "numeric" })}</Row>
            <Row label="Recruiter feedback"><span className="whitespace-pre-wrap">{job.recruiter_feedback}</span></Row>
            <Row label="Rejection reason">{job.rejection_reason}</Row>
            <Row label="Offer">{job.offer_details}</Row>
            <Row label="Notes"><span className="whitespace-pre-wrap">{job.notes}</span></Row>
          </dl>
          {job.job_description && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-indigo-600 dark:text-indigo-400">Job description</summary>
              <p className="mt-2 whitespace-pre-wrap">{job.job_description}</p>
              <Link href="/resume?tab=match" className="mt-2 inline-block text-indigo-600 hover:underline dark:text-indigo-400">Compare it with a resume →</Link>
            </details>
          )}
        </Card>

        <Card title={`Interview rounds (${rounds.length})`} action={<AddRoundButton applicationId={job.id} tz={profile.timezone} />}>
          {rounds.length === 0 ? <EmptyState title="No rounds yet">Add screening, technical, manager and HR rounds as they get scheduled.</EmptyState> : (
            <ol className="space-y-3">
              {rounds.map((r) => (
                <li key={r.id} className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{ROUND_TYPES[r.round_type as keyof typeof ROUND_TYPES]}</p>
                      <p className="muted text-xs">{r.scheduled_at ? fmtTime(r.scheduled_at) : "Not scheduled"}</p>
                    </div>
                    <Badge tone={r.outcome === "passed" ? "green" : r.outcome === "failed" ? "red" : r.outcome === "scheduled" ? "blue" : "zinc"}>
                      {ROUND_OUTCOMES[r.outcome as keyof typeof ROUND_OUTCOMES]}
                    </Badge>
                  </div>
                  {r.self_score !== null && <p className="mt-1 text-xs">Self score: {r.self_score}</p>}
                  {r.weak_topics.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{r.weak_topics.map((t) => <Badge key={t} tone="amber">{t}</Badge>)}</div>}
                  {r.questions_asked && <details className="mt-1"><summary className="cursor-pointer text-xs text-indigo-600 dark:text-indigo-400">Questions asked</summary><p className="mt-1 whitespace-pre-wrap text-xs">{r.questions_asked}</p></details>}
                  {r.feedback && <p className="muted mt-1 whitespace-pre-wrap text-xs">{r.feedback}</p>}
                  <RoundActions applicationId={job.id} round={r} tz={profile.timezone} />
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}

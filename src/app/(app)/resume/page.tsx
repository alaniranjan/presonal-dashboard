import Link from "next/link";
import {
  CompareForm, DeleteComparison, DeleteIntro, IntroPractice, NewResumeButton, NewStarButton, ResumeActions, StarActions,
} from "@/components/resume/resume-forms";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { query } from "@/lib/db";
import type { IntroScript, JdComparison, Resume, StarStory } from "@/lib/types";

const TABS = { resumes: "Resume versions", match: "Job description match", intro: "Self-introduction", star: "STAR stories" } as const;
type Tab = keyof typeof TABS;
const DURATIONS = ["30s", "60s", "2min"] as const;

const STAR_PROMPTS = [
  "Tell me about yourself and your current project.",
  "Describe a production defect or difficult bug you found.",
  "Tell me about a time you disagreed with a developer.",
  "Explain how you handled flaky tests or a failing CI pipeline.",
  "Describe a time you met a tight release deadline.",
  "Explain the automation framework you built and why you designed it that way.",
  "What is your biggest weakness and what are you doing about it?",
];

const SPEAKING_PROMPTS = [
  "Explain the Page Object Model to a new team member in one minute.",
  "Walk me through what happens when you run `npx playwright test` in CI.",
  "Describe your current project's domain, team and your role.",
  "Why are you looking for a change, and why this company?",
  "Explain the difference between smoke, sanity and regression testing.",
  "What are your salary expectations and notice period?",
];

export default async function ResumeLab({ searchParams }: { searchParams: Promise<{ tab?: string; d?: string }> }) {
  const sp = await searchParams;
  const tab: Tab = sp.tab && sp.tab in TABS ? (sp.tab as Tab) : "resumes";

  return (
    <>
      <PageHeader title="Resume Lab"
        description="Keep honest, targeted resume versions and rehearse how you talk about your experience. Nothing here invents experience for you."
        actions={tab === "resumes" ? <NewResumeButton /> : tab === "star" ? <NewStarButton /> : undefined} />
      <nav aria-label="Resume Lab sections" className="tabbar mb-4 sm:w-fit">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <Link key={t} href={`/resume?tab=${t}`} aria-current={t === tab ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 ${t === tab ? "bg-indigo-600 text-white" : "muted"}`}>{TABS[t]}</Link>
        ))}
      </nav>
      {tab === "resumes" && <Resumes />}
      {tab === "match" && <Match />}
      {tab === "intro" && <Intro duration={DURATIONS.includes(sp.d as never) ? (sp.d as (typeof DURATIONS)[number]) : "60s"} />}
      {tab === "star" && <Stars />}
    </>
  );
}

async function Resumes() {
  const resumes = await query<Resume & { applications: number }>(
    `select r.*, (select count(*)::int from job_applications a where a.resume_id = r.id) applications
     from resumes r order by r.is_primary desc, r.updated_at desc`,
  );
  if (!resumes.length) {
    return <EmptyState title="No resume versions yet">Create your base resume, then duplicate it for each type of role you target.</EmptyState>;
  }
  return (
    <div className="space-y-4">
      {resumes.map((r) => (
        <Card key={r.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">{r.version_name}</h2>
                {r.is_primary && <Badge tone="indigo">Primary</Badge>}
                {r.target_role && <Badge>{r.target_role}</Badge>}
              </div>
              <p className="muted mt-0.5 text-xs">
                Created {formatDate(r.created_at, { year: "numeric" })} · updated {formatDate(r.updated_at)} · used in {r.applications} application(s)
              </p>
            </div>
            <ResumeActions resume={r} />
          </div>
          {r.summary && <p className="mt-3 text-sm">{r.summary}</p>}
          {r.skills.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{r.skills.map((s) => <Badge key={s}>{s}</Badge>)}</div>}
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-indigo-600 dark:text-indigo-400">Show experience, projects and achievements</summary>
            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
              {([["Experience", r.experience_text], ["Projects", r.projects_text], ["Achievements", r.achievements]] as const).map(([label, v]) => (
                <div key={label}>
                  <div className="muted text-xs font-medium uppercase">{label}</div>
                  <p className="whitespace-pre-wrap">{v || "—"}</p>
                </div>
              ))}
            </div>
          </details>
        </Card>
      ))}
    </div>
  );
}

async function Match() {
  const [resumes, comparisons] = await Promise.all([
    query<Pick<Resume, "id" | "version_name" | "is_primary">>("select id, version_name, is_primary from resumes order by is_primary desc, updated_at desc"),
    query<JdComparison & { version_name: string | null }>(
      `select c.*, r.version_name from jd_comparisons c left join resumes r on r.id = c.resume_id order by c.created_at desc limit 20`),
  ]);
  return (
    <div className="space-y-4">
      <Card title="Compare a resume with a job description">
        {resumes.length === 0
          ? <p className="muted text-sm">Create a resume version first (Resume versions tab).</p>
          : <CompareForm resumes={resumes} />}
        <p className="muted mt-3 text-xs">Matching uses a dictionary of about 55 QA/SDET skills and their common spellings. It reports what is and isn&apos;t in your resume, and it never adds skills you don&apos;t have.</p>
      </Card>
      {comparisons.map((c) => (
        <Card key={c.id}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-semibold">{[c.job_title, c.company].filter(Boolean).join(" · ") || "Job description"}</h2>
              <p className="muted text-xs">{c.version_name ?? "Deleted resume"} · {formatDate(c.created_at, { year: "numeric" })}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-semibold tabular-nums ${(c.match_score ?? 0) >= 70 ? "text-emerald-600" : (c.match_score ?? 0) >= 40 ? "text-amber-600" : "text-red-600"}`}>{c.match_score}%</span>
              <DeleteComparison id={c.id} />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="muted mb-1 text-xs font-medium uppercase">Matching skills ({c.matched_skills.length})</div>
              <div className="flex flex-wrap gap-1">{c.matched_skills.length ? c.matched_skills.map((s) => <Badge key={s} tone="green">{s}</Badge>) : <span className="muted text-sm">None</span>}</div>
            </div>
            <div>
              <div className="muted mb-1 text-xs font-medium uppercase">Missing skills ({c.missing_skills.length})</div>
              <div className="flex flex-wrap gap-1">{c.missing_skills.length ? c.missing_skills.map((s) => <Badge key={s} tone="amber">{s}</Badge>) : <span className="muted text-sm">None. Every detected skill is covered.</span>}</div>
            </div>
          </div>
          {c.suggestions.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{c.suggestions.map((s) => <li key={s}>{s}</li>)}</ul>
          )}
        </Card>
      ))}
    </div>
  );
}

async function Intro({ duration }: { duration: (typeof DURATIONS)[number] }) {
  const versions = await query<IntroScript>("select * from intro_scripts where duration = $1 order by created_at desc", [duration]);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <div className="mb-3 flex gap-1">
          {DURATIONS.map((d) => (
            <Link key={d} href={`/resume?tab=intro&d=${d}`} aria-current={d === duration ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-xs ${d === duration ? "border-indigo-600 bg-indigo-600 text-white" : "border-zinc-300 dark:border-zinc-700"}`}>
              {d === "2min" ? "2 minutes" : d === "60s" ? "60 seconds" : "30 seconds"}
            </Link>
          ))}
        </div>
        <IntroPractice key={duration} duration={duration} initial={versions[0]?.script ?? ""} />
      </Card>
      <div className="space-y-4">
        <Card title={`Saved versions (${versions.length})`}>
          {versions.length === 0 ? <p className="muted text-sm">No versions saved yet.</p> : (
            <ol className="space-y-3">
              {versions.map((v, i) => (
                <li key={v.id} className="text-sm">
                  <details>
                    <summary className="flex cursor-pointer items-center gap-2">
                      <span className="font-medium">v{versions.length - i}</span>
                      <span className="muted text-xs">{new Date(v.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                      {v.self_rating && <Badge>{v.self_rating}/5</Badge>}
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap">{v.script}</p>
                    {v.feedback && <p className="muted mt-1 text-xs">Feedback: {v.feedback}</p>}
                    <DeleteIntro id={v.id} />
                  </details>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card title="Spoken-English practice prompts">
          <ul className="list-disc space-y-1 pl-5 text-sm">{SPEAKING_PROMPTS.map((p) => <li key={p}>{p}</li>)}</ul>
          <p className="muted mt-2 text-xs">Speak for one minute with the timer, record yourself, then listen back for clarity and filler words.</p>
        </Card>
      </div>
    </div>
  );
}

async function Stars() {
  const stories = await query<StarStory>("select * from star_stories order by updated_at desc");
  const covered = new Set(stories.map((s) => s.prompt));
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {stories.length === 0 && <EmptyState title="No STAR stories yet">Write real stories in Situation → Task → Action → Result form, and reuse them across HR and managerial rounds.</EmptyState>}
        {stories.map((s) => (
          <Card key={s.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{s.title}</h2>
                {s.prompt && <p className="muted text-xs">{s.prompt}</p>}
              </div>
              <div className="flex items-center gap-2">
                {s.self_rating && <Badge>{s.self_rating}/5</Badge>}
                <StarActions story={s} />
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {([["Situation", s.situation], ["Task", s.task], ["Action", s.action], ["Result", s.result]] as const).map(([k, v]) => (
                <div key={k}><dt className="muted text-xs font-medium uppercase">{k}</dt><dd className="whitespace-pre-wrap">{v || "—"}</dd></div>
              ))}
            </dl>
            {s.tags.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{s.tags.map((t) => <Badge key={t} tone="indigo">{t}</Badge>)}</div>}
          </Card>
        ))}
      </div>
      <Card title="Common prompts">
        <ul className="space-y-2 text-sm">
          {STAR_PROMPTS.map((p) => (
            <li key={p} className="flex items-start justify-between gap-2">
              <span className={covered.has(p) ? "muted line-through" : ""}>{p}</span>
              {!covered.has(p) && <NewStarButton prompt={p} />}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

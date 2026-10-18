import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Practice } from "@/components/interview/practice";
import { AbandonMockButton, ElapsedTimer, FinishMockButton } from "@/components/mock/mock-client";
import { Badge, Card, PageHeader, ProgressBar } from "@/components/ui";
import { categoryLabel } from "@/lib/constants";
import { one, query } from "@/lib/db";
import type { InterviewQuestion, MockInterview } from "@/lib/types";

export default async function MockPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string }> }) {
  const { id } = await params;
  const { q } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const mock = await one<MockInterview>("select * from mock_interviews where id = $1", [id]);
  if (!mock) notFound();

  const [questions, attempts] = await Promise.all([
    query<InterviewQuestion>("select * from interview_questions where id = any($1)", [mock.question_ids]),
    query<{ question_id: string; score: number; created_at: string }>(
      `select distinct on (question_id) question_id, score, created_at from answer_attempts
       where mock_interview_id = $1 order by question_id, created_at desc`, [id]),
  ]);
  const byId = new Map(questions.map((q) => [q.id, q]));
  const ordered = mock.question_ids.map((qid) => byId.get(qid)).filter(Boolean) as InterviewQuestion[];
  const answered = new Map(attempts.map((a) => [a.question_id, a.score]));
  const nextUnanswered = ordered.find((x) => !answered.has(x.id));
  // Pin the question in the URL so saving an answer keeps showing its result instead of jumping ahead.
  if (mock.status === "in_progress" && nextUnanswered && !q) redirect(`/mock-interviews/${id}?q=${nextUnanswered.id}`);
  const current = mock.status === "in_progress" ? ordered.find((x) => x.id === q) ?? nextUnanswered : undefined;
  const index = ordered.findIndex((x) => x === current);
  const remaining = ordered.filter((q) => !answered.has(q.id)).length;

  return (
    <>
      <Link href="/mock-interviews" className="btn-ghost mb-2 px-2">← Mock interviews</Link>
      <PageHeader title={mock.title}
        description={mock.status === "completed" ? `Completed · ${Math.round((mock.duration_seconds ?? 0) / 60)} min` : mock.status === "abandoned" ? "Ended without scoring" : undefined}
        actions={mock.status === "in_progress" ? <><span className="btn-secondary pointer-events-none">⏱ <ElapsedTimer startedAt={mock.started_at} /></span><AbandonMockButton id={mock.id} /></> : undefined} />

      <div className="mb-4">
        <div className="muted mb-1 flex justify-between text-xs"><span>{answered.size} of {ordered.length} answered</span></div>
        <ProgressBar value={ordered.length ? (answered.size / ordered.length) * 100 : 0} label="Mock interview progress" />
      </div>

      {mock.status === "in_progress" && current && (!answered.has(current.id) || q === current.id) && (
        <>
          <p className="muted mb-2 text-sm">Question {index + 1} of {ordered.length} · {categoryLabel(current.category)}</p>
          <Practice key={current.id} question={current} mockInterviewId={mock.id}
            nextHref={`/mock-interviews/${mock.id}`} nextLabel={remaining > 1 || !answered.has(current.id) ? "Next question →" : "Continue →"} />
        </>
      )}

      {mock.status === "in_progress" && !nextUnanswered && (!current || !q) && (
        <Card>
          <p className="font-medium">All questions answered.</p>
          <p className="muted mb-3 text-sm">Finish to calculate your overall score and see what to revise.</p>
          <FinishMockButton id={mock.id} />
        </Card>
      )}

      {mock.status !== "in_progress" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title="Result">
            {mock.overall_score !== null
              ? <p className="text-4xl font-semibold tabular-nums">{mock.overall_score}<span className="muted text-base"> / 100</span></p>
              : <p className="muted text-sm">No score: this mock ended early.</p>}
            {mock.feedback && <pre className="mt-3 whitespace-pre-wrap font-sans text-sm">{mock.feedback}</pre>}
          </Card>
          <Card title="Questions" className="lg:col-span-2">
            <ol className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {ordered.map((q, i) => (
                <li key={q.id} className="flex items-start gap-3 py-2 text-sm">
                  <span className="muted w-5 tabular-nums">{i + 1}.</span>
                  <Link href={`/interview/${q.id}`} className="min-w-0 flex-1 hover:underline">{q.question}</Link>
                  {answered.has(q.id) ? <Badge tone={answered.get(q.id)! >= 75 ? "green" : answered.get(q.id)! >= 50 ? "blue" : "amber"}>{answered.get(q.id)}</Badge> : <Badge>skipped</Badge>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      )}
      {mock.status === "in_progress" && answered.size > 0 && nextUnanswered && (
        <div className="mt-4"><FinishMockButton id={mock.id} label="Finish early and score answered questions" /></div>
      )}
    </>
  );
}

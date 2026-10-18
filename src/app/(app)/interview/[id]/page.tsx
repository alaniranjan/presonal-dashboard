import Link from "next/link";
import { notFound } from "next/navigation";
import { Practice, StatusSelect } from "@/components/interview/practice";
import { BookmarkButton, EditQuestionButtons } from "@/components/interview/question-form";
import { Badge, Card } from "@/components/ui";
import { categoryLabel } from "@/lib/constants";
import { one, query } from "@/lib/db";
import type { AnswerAttempt, InterviewQuestion } from "@/lib/types";

export default async function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [question, attempts] = await Promise.all([
    one<InterviewQuestion>("select * from interview_questions where id = $1", [id]),
    query<AnswerAttempt>("select * from answer_attempts where question_id = $1 order by created_at desc", [id]),
  ]);
  if (!question) notFound();

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href={`/interview?category=${question.category}`} className="btn-ghost px-2">← {categoryLabel(question.category)}</Link>
        <div className="flex-1" />
        <BookmarkButton id={question.id} bookmarked={question.bookmarked} />
        <StatusSelect id={question.id} status={question.status} />
        <EditQuestionButtons question={question} />
      </div>

      <Practice key={question.id} question={question}
        nextHref={`/interview/next?category=${question.category}&skip=${question.id}`} />

      <Card title={`Attempt history (${attempts.length})`} className="mt-4">
        {attempts.length === 0 ? (
          <p className="muted text-sm">No attempts yet. Your answers are saved here so you can see your improvement.</p>
        ) : (
          <ol className="space-y-3">
            {attempts.map((a, i) => (
              <li key={a.id}>
                <details className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">Attempt {attempts.length - i}</span>
                    <span className="muted">{new Date(a.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                    <Badge tone={(a.score ?? 0) >= 75 ? "green" : (a.score ?? 0) >= 50 ? "blue" : "amber"}>Score {a.score}</Badge>
                    <span className="muted text-xs">covered {a.completeness_score}% · confidence {a.confidence}/5{a.hints_used ? ` · ${a.hints_used} hint(s)` : ""}{a.revealed_answer ? " · answer viewed first" : ""}</span>
                  </summary>
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="whitespace-pre-wrap">{a.answer}</p>
                    {a.code_snippet && <pre className="overflow-x-auto rounded-lg bg-zinc-100 p-3 text-xs dark:bg-zinc-950">{a.code_snippet}</pre>}
                    {a.feedback && <pre className="muted whitespace-pre-wrap border-t border-zinc-100 pt-2 font-sans text-xs dark:border-zinc-800">{a.feedback}</pre>}
                  </div>
                </details>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </>
  );
}

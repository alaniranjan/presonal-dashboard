import Link from "next/link";
import { DeleteMockButton, StartMockForm } from "@/components/mock/mock-client";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { query } from "@/lib/db";
import type { MockInterview } from "@/lib/types";

export default async function MockInterviewsPage() {
  const mocks = await query<MockInterview & { answered: number }>(
    `select m.*, (select count(distinct a.question_id)::int from answer_attempts a where a.mock_interview_id = m.id) answered
     from mock_interviews m order by m.started_at desc limit 50`,
  );
  return (
    <>
      <PageHeader title="Mock interviews" description="Timed practice rounds built from your own question bank. Every answer is saved to that question's history." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card title="Start a mock interview" className="lg:col-span-3"><StartMockForm /></Card>
        <Card title="History" className="lg:col-span-2">
          {mocks.length === 0 ? <EmptyState title="No mock interviews yet" /> : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {mocks.map((m) => (
                <li key={m.id} className="flex items-center gap-2 py-2.5 text-sm">
                  <Link href={`/mock-interviews/${m.id}`} className="min-w-0 flex-1 hover:underline">
                    <span className="block truncate font-medium">{m.title}</span>
                    <span className="muted text-xs">
                      {new Date(m.started_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} ·
                      {" "}{m.answered}/{m.question_ids.length} answered
                      {m.duration_seconds ? ` · ${Math.round(m.duration_seconds / 60)} min` : ""}
                    </span>
                  </Link>
                  {m.status === "completed"
                    ? <Badge tone={(m.overall_score ?? 0) >= 75 ? "green" : (m.overall_score ?? 0) >= 50 ? "blue" : "amber"}>{m.overall_score}</Badge>
                    : <Badge tone={m.status === "in_progress" ? "indigo" : "zinc"}>{m.status === "in_progress" ? "In progress" : "Ended"}</Badge>}
                  <DeleteMockButton id={m.id} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

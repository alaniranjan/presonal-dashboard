import { redirect } from "next/navigation";
import { EmptyState, PageHeader, TextLink } from "@/components/ui";
import { QUESTION_CATEGORIES } from "@/lib/constants";
import { getContext } from "@/lib/data";
import { one } from "@/lib/db";

/**
 * Picks the next question to practise: overdue revision items first,
 * then never-attempted questions, then the least recently practised.
 */
export default async function NextQuestion({ searchParams }: { searchParams: Promise<{ category?: string; skip?: string }> }) {
  const { category, skip } = await searchParams;
  const { today } = await getContext();
  const cat = category && QUESTION_CATEGORIES.includes(category as never) ? category : null;

  const skipId = skip && /^[0-9a-f-]{36}$/.test(skip) ? skip : null;
  const due = await one<{ question_id: string }>(
    `select r.question_id from revision_queue r join interview_questions q on q.id = r.question_id
     where r.completed_at is null and r.due_date <= $1 and ($2::text is null or q.category = $2)
       and ($3::uuid is null or q.id <> $3) order by r.due_date limit 1`,
    [today, cat, skipId],
  );
  if (due) redirect(`/interview/${due.question_id}`);

  const pick = await one<{ id: string }>(
    `select id from interview_questions where ($1::text is null or category = $1) and ($2::uuid is null or id <> $2)
     order by last_attempted_at asc nulls first, created_at limit 1`,
    [cat, skipId],
  );
  if (pick) redirect(`/interview/${pick.id}`);

  return (
    <>
      <PageHeader title="Practise next" />
      <EmptyState title="No questions to practise">
        Add questions in this section first. <TextLink href="/interview">Back to questions</TextLink>
      </EmptyState>
    </>
  );
}

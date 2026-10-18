import Link from "next/link";
import { JobForm } from "@/components/jobs/job-forms";
import { PageHeader } from "@/components/ui";
import { getContext } from "@/lib/data";
import { query } from "@/lib/db";

export default async function NewJobPage() {
  const { today } = await getContext();
  const resumes = await query<{ id: string; version_name: string }>("select id, version_name from resumes order by is_primary desc, updated_at desc");
  return (
    <>
      <Link href="/jobs" className="btn-ghost mb-2 px-2">← Applications</Link>
      <PageHeader title="Add application" description="Company, title and URL are checked for duplicates when you save." />
      <JobForm resumes={resumes} today={today} />
    </>
  );
}

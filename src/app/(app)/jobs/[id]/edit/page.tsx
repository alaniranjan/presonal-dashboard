import { notFound } from "next/navigation";
import { JobForm } from "@/components/jobs/job-forms";
import { PageHeader } from "@/components/ui";
import { getContext } from "@/lib/data";
import { one, query } from "@/lib/db";
import type { JobApplication } from "@/lib/types";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [{ today }, job, resumes] = await Promise.all([
    getContext(),
    one<JobApplication>("select * from job_applications where id = $1", [id]),
    query<{ id: string; version_name: string }>("select id, version_name from resumes order by is_primary desc, updated_at desc"),
  ]);
  if (!job) notFound();
  return (
    <>
      <PageHeader title={`Edit ${job.application_code ?? "application"}`} description={`${job.company} · ${job.job_title}`} />
      <JobForm job={job} resumes={resumes} today={today} />
    </>
  );
}

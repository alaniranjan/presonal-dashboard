import Link from "next/link";
import { notFound } from "next/navigation";
import { AddMilestoneButton, MilestoneRow, ProjectHeaderActions } from "@/components/projects/project-forms";
import { Badge, Card, EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { PROJECT_STATUS } from "@/lib/constants";
import { getContext } from "@/lib/data";
import { one, query } from "@/lib/db";
import type { Milestone, Project } from "@/lib/types";

function List({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <p className="muted text-sm">{empty}</p>;
  return <ul className="list-disc space-y-1 pl-5 text-sm">{items.map((i) => <li key={i}>{i}</li>)}</ul>;
}

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [{ today }, project, milestones] = await Promise.all([
    getContext(),
    one<Project>("select * from projects where id = $1", [id]),
    query<Milestone>("select * from project_milestones where project_id = $1 order by sort_order, created_at", [id]),
  ]);
  if (!project) notFound();
  const done = milestones.filter((m) => m.status === "completed").length;

  return (
    <>
      <Link href="/projects" className="btn-ghost mb-2 px-2">← Projects</Link>
      <PageHeader title={project.name} description={project.summary ?? undefined} actions={<ProjectHeaderActions project={project} />} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Progress" className="lg:col-span-1">
          <div className="mb-2 flex items-center gap-2">
            <Badge tone={PROJECT_STATUS[project.status].tone}>{PROJECT_STATUS[project.status].label}</Badge>
            <span className="muted text-sm tabular-nums">{done}/{milestones.length} milestones</span>
          </div>
          <ProgressBar value={milestones.length ? (done / milestones.length) * 100 : 0} label="Project progress" />
          <p className="mt-3 text-sm">
            {project.repo_url
              ? <a href={project.repo_url} target="_blank" rel="noreferrer" className="break-all text-indigo-600 hover:underline dark:text-indigo-400">{project.repo_url}</a>
              : <span className="muted">Link your GitHub repository with “Edit project”.</span>}
          </p>
        </Card>

        <Card title="Milestones" className="lg:col-span-2" action={<AddMilestoneButton projectId={project.id} />}>
          {milestones.length === 0 ? (
            <EmptyState title="No milestones yet">Break the project into steps you can prove with a commit, PR or report.</EmptyState>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {milestones.map((m) => <MilestoneRow key={m.id} projectId={project.id} milestone={m} today={today} />)}
            </ul>
          )}
        </Card>

        <Card title="Requirements"><List items={project.requirements} empty="No requirements yet." /></Card>
        <Card title="Test scenarios"><List items={project.test_scenarios} empty="No scenarios yet." /></Card>
        <Card title="Acceptance criteria"><List items={project.acceptance_criteria} empty="No criteria yet." /></Card>

        <Card title="Folder-structure plan" className="lg:col-span-2">
          {project.folder_structure
            ? <pre className="overflow-x-auto rounded-lg bg-zinc-100 p-3 text-xs leading-5 dark:bg-zinc-950">{project.folder_structure}</pre>
            : <p className="muted text-sm">No plan yet.</p>}
        </Card>
        <Card title="Interview questions about this project">
          <List items={project.design_questions} empty="Add questions an interviewer might ask about your design decisions." />
          <p className="muted mt-3 text-xs">Practise explaining these aloud. Write your answers in Resume Lab → project explanations.</p>
        </Card>
      </div>
    </>
  );
}

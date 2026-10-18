import Link from "next/link";
import { addStarterProjects } from "@/app/actions/projects";
import { NewProjectButton } from "@/components/projects/project-forms";
import { Badge, EmptyState, PageHeader, ProgressBar } from "@/components/ui";
import { ActionButton } from "@/components/ui/client";
import { PROJECT_STATUS } from "@/lib/constants";
import { query } from "@/lib/db";
import type { Project } from "@/lib/types";

export default async function ProjectsPage() {
  const projects = await query<Project & { total: number; done: number }>(
    `select p.*, count(m.id)::int total, count(m.id) filter (where m.status = 'completed')::int done
     from projects p left join project_milestones m on m.project_id = p.id
     group by p.id order by p.sort_order, p.created_at`,
  );
  const hasStarter = projects.some((p) => p.is_sample);

  return (
    <>
      <PageHeader title="Projects"
        description="Real end-to-end automation projects. Progress counts only milestones you complete with evidence."
        actions={<>
          {!hasStarter && <ActionButton className="btn-primary" action={addStarterProjects}>Add the 4 starter projects</ActionButton>}
          <NewProjectButton />
        </>} />

      {projects.length === 0 ? (
        <EmptyState title="No projects yet">
          Add the four starter projects (E-commerce, API framework, CI/CD pipeline, advanced challenge) or create your own.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="card block transition-colors hover:border-indigo-400">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold">{p.name}</h2>
                <Badge tone={PROJECT_STATUS[p.status].tone}>{PROJECT_STATUS[p.status].label}</Badge>
              </div>
              {p.summary && <p className="muted mt-1 line-clamp-2 text-sm">{p.summary}</p>}
              <div className="mt-4">
                <div className="muted mb-1 flex justify-between text-xs">
                  <span>Milestones with evidence</span>
                  <span className="tabular-nums">{p.done}/{p.total}</span>
                </div>
                <ProgressBar value={p.total ? (p.done / p.total) * 100 : 0} label={`${p.name} progress`} />
              </div>
              <p className="muted mt-3 text-xs">{p.repo_url ? `Repo: ${p.repo_url.replace(/^https?:\/\//, "")}` : "No repository linked yet"}</p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

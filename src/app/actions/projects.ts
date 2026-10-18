"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, lines, str } from "@/lib/action-utils";
import { TASK_STATUSES } from "@/lib/constants";
import { one, query, transaction } from "@/lib/db";
import { PROJECTS } from "@/lib/seed/projects";
import type { ActionResult, MilestoneStatus } from "@/lib/types";

function refresh(projectId?: string) {
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

/**
 * A project's status follows its milestones (unless it is on hold):
 * completed only when every milestone is completed with evidence.
 */
async function syncProjectStatus(projectId: string) {
  await query(
    `update projects p set status = case
       when p.status = 'on_hold' then 'on_hold'
       when s.total > 0 and s.done = s.total then 'completed'
       when s.started > 0 then 'in_progress'
       else 'not_started' end
     from (select count(*) total,
                  count(*) filter (where status = 'completed') done,
                  count(*) filter (where status in ('completed', 'in_progress')) started
           from project_milestones where project_id = $1) s
     where p.id = $1`,
    [projectId],
  );
}

export async function addStarterProjects(): Promise<ActionResult> {
  try {
    const existing = await one<{ n: number }>("select count(*)::int n from projects where is_sample");
    if (existing && existing.n > 0) return { ok: false, error: "Starter projects are already added." };
    await transaction(async (db) => {
      for (const [i, p] of PROJECTS.entries()) {
        const { rows } = await db.query(
          `insert into projects (name, summary, requirements, folder_structure, test_scenarios, acceptance_criteria,
             design_questions, is_sample, sort_order)
           values ($1, $2, $3, $4, $5, $6, $7, true, $8) returning id`,
          [p.name, p.summary, p.requirements, p.folder, p.scenarios, p.acceptance, p.designQuestions, i + 1],
        );
        for (const [j, [title, description]] of p.milestones.entries()) {
          await db.query("insert into project_milestones (project_id, title, description, sort_order) values ($1, $2, $3, $4)", [
            rows[0].id, title, description, j + 1,
          ]);
        }
      }
    });
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Added 4 starter projects." };
}

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required.").max(200),
  summary: z.string().max(5000).nullable(),
  repo_url: z.string().url("Repository link must be a full URL (https://…).").nullable(),
  requirements: z.array(z.string().max(500)).max(50),
  test_scenarios: z.array(z.string().max(500)).max(100),
  acceptance_criteria: z.array(z.string().max(500)).max(50),
  design_questions: z.array(z.string().max(500)).max(30),
  folder_structure: z.string().max(10000).nullable(),
  on_hold: z.boolean(),
});

export async function saveProject(id: string | null, form: FormData): Promise<ActionResult & { id?: string }> {
  const parsed = projectSchema.safeParse({
    name: str(form, "name") ?? "",
    summary: str(form, "summary"),
    repo_url: str(form, "repo_url"),
    requirements: lines(form, "requirements"),
    test_scenarios: lines(form, "test_scenarios"),
    acceptance_criteria: lines(form, "acceptance_criteria"),
    design_questions: lines(form, "design_questions"),
    folder_structure: str(form, "folder_structure"),
    on_hold: form.get("on_hold") === "on",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const p = parsed.data;
  const values = [p.name, p.summary, p.repo_url, p.requirements, p.test_scenarios, p.acceptance_criteria, p.design_questions, p.folder_structure];
  try {
    let projectId = id;
    if (id) {
      await query(
        `update projects set name = $2, summary = $3, repo_url = $4, requirements = $5, test_scenarios = $6,
           acceptance_criteria = $7, design_questions = $8, folder_structure = $9,
           status = case when $10 then 'on_hold' when status = 'on_hold' then 'not_started' else status end
         where id = $1`,
        [id, ...values, p.on_hold],
      );
    } else {
      const row = await one<{ id: string }>(
        `insert into projects (name, summary, repo_url, requirements, test_scenarios, acceptance_criteria, design_questions,
           folder_structure, status, sort_order)
         values ($1, $2, $3, $4, $5, $6, $7, $8, case when $9 then 'on_hold' else 'not_started' end,
                 (select coalesce(max(sort_order), 0) + 1 from projects)) returning id`,
        [...values, p.on_hold],
      );
      projectId = row!.id;
    }
    await syncProjectStatus(projectId!);
    refresh(projectId!);
    return { ok: true, message: id ? "Project saved." : "Project created.", id: projectId! };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  try {
    await query("delete from projects where id = $1", [id]);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true };
}

const milestoneSchema = z
  .object({
    title: z.string().min(1, "Milestone title is required.").max(300),
    description: z.string().max(5000).nullable(),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    status: z.enum(Object.keys(TASK_STATUSES) as [MilestoneStatus, ...MilestoneStatus[]]),
    evidence_url: z.string().url("Evidence link must be a full URL (https://…).").nullable(),
    evidence_notes: z.string().max(5000).nullable(),
  })
  .refine((m) => m.status !== "completed" || m.evidence_url || m.evidence_notes, {
    message: "Add evidence (a link or notes) before marking the milestone completed.",
  });

export async function saveMilestone(projectId: string, id: string | null, form: FormData): Promise<ActionResult> {
  const parsed = milestoneSchema.safeParse({
    title: str(form, "title") ?? "",
    description: str(form, "description"),
    due_date: str(form, "due_date"),
    status: str(form, "status") ?? "not_started",
    evidence_url: str(form, "evidence_url"),
    evidence_notes: str(form, "evidence_notes"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const m = parsed.data;
  try {
    if (id) {
      await query(
        `update project_milestones set title = $2, description = $3, due_date = $4, status = $5, evidence_url = $6,
           evidence_notes = $7, completed_at = case when $5 = 'completed' then coalesce(completed_at, now()) else null end
         where id = $1`,
        [id, m.title, m.description, m.due_date, m.status, m.evidence_url, m.evidence_notes],
      );
    } else {
      await query(
        `insert into project_milestones (project_id, title, description, due_date, status, evidence_url, evidence_notes,
           completed_at, sort_order)
         values ($1, $2, $3, $4, $5, $6, $7, case when $5 = 'completed' then now() end,
                 (select coalesce(max(sort_order), 0) + 1 from project_milestones where project_id = $1))`,
        [projectId, m.title, m.description, m.due_date, m.status, m.evidence_url, m.evidence_notes],
      );
    }
    await syncProjectStatus(projectId);
  } catch (err) {
    return fail(err);
  }
  refresh(projectId);
  return { ok: true, message: id ? "Milestone saved." : "Milestone added." };
}

export async function setMilestoneStatus(projectId: string, id: string, status: MilestoneStatus): Promise<ActionResult> {
  if (!(status in TASK_STATUSES)) return { ok: false, error: "Unknown status." };
  try {
    const m = await one<{ evidence_url: string | null; evidence_notes: string | null }>(
      "select evidence_url, evidence_notes from project_milestones where id = $1",
      [id],
    );
    if (!m) return { ok: false, error: "Milestone not found." };
    if (status === "completed" && !m.evidence_url && !m.evidence_notes) {
      return { ok: false, error: "Add evidence (a link or notes) before marking it completed. Use Edit." };
    }
    await query(
      `update project_milestones set status = $2,
         completed_at = case when $2 = 'completed' then coalesce(completed_at, now()) else null end where id = $1`,
      [id, status],
    );
    await syncProjectStatus(projectId);
  } catch (err) {
    return fail(err);
  }
  refresh(projectId);
  return { ok: true };
}

export async function deleteMilestone(projectId: string, id: string): Promise<ActionResult> {
  try {
    await query("delete from project_milestones where id = $1", [id]);
    await syncProjectStatus(projectId);
  } catch (err) {
    return fail(err);
  }
  refresh(projectId);
  return { ok: true };
}

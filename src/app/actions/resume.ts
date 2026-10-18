"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, int, lines, str } from "@/lib/action-utils";
import { one, query, transaction } from "@/lib/db";
import { compareResume, resumeText } from "@/lib/jd-match";
import type { ActionResult, Resume } from "@/lib/types";

const refresh = () => revalidatePath("/resume");

const resumeSchema = z.object({
  version_name: z.string().min(1, "Give this version a name.").max(120),
  target_role: z.string().max(120).nullable(),
  summary: z.string().max(5000).nullable(),
  skills: z.array(z.string().max(100)).max(100),
  experience_text: z.string().max(20000).nullable(),
  projects_text: z.string().max(20000).nullable(),
  achievements: z.string().max(10000).nullable(),
  content: z.string().max(50000).nullable(),
});

export async function saveResume(id: string | null, form: FormData): Promise<ActionResult> {
  const parsed = resumeSchema.safeParse({
    version_name: str(form, "version_name") ?? "",
    target_role: str(form, "target_role"),
    summary: str(form, "summary"),
    skills: (str(form, "skills") ?? "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
    experience_text: str(form, "experience_text"),
    projects_text: str(form, "projects_text"),
    achievements: str(form, "achievements"),
    content: str(form, "content"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const r = parsed.data;
  const values = [r.version_name, r.target_role, r.summary, r.skills, r.experience_text, r.projects_text, r.achievements, r.content];
  try {
    if (id) {
      await query(
        `update resumes set version_name = $2, target_role = $3, summary = $4, skills = $5, experience_text = $6,
           projects_text = $7, achievements = $8, content = $9 where id = $1`,
        [id, ...values],
      );
    } else {
      await query(
        `insert into resumes (version_name, target_role, summary, skills, experience_text, projects_text, achievements, content, is_primary)
         values ($1, $2, $3, $4, $5, $6, $7, $8, not exists (select 1 from resumes))`,
        values,
      );
    }
  } catch (err) {
    return fail(err);
  }
  refresh();
  revalidatePath("/jobs");
  return { ok: true, message: id ? "Resume version saved." : "Resume version created." };
}

export async function duplicateResume(id: string): Promise<ActionResult> {
  try {
    await query(
      `insert into resumes (version_name, target_role, summary, skills, experience_text, projects_text, achievements, content)
       select version_name || ' (copy)', target_role, summary, skills, experience_text, projects_text, achievements, content
       from resumes where id = $1`,
      [id],
    );
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Copied. Rename it for the job you're targeting." };
}

export async function setPrimaryResume(id: string): Promise<ActionResult> {
  try {
    await transaction(async (db) => {
      await db.query("update resumes set is_primary = false where is_primary");
      await db.query("update resumes set is_primary = true where id = $1", [id]);
    });
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true };
}

export async function deleteResume(id: string): Promise<ActionResult> {
  try {
    await query("delete from resumes where id = $1", [id]);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true };
}

export async function runComparison(form: FormData): Promise<ActionResult> {
  const resumeId = str(form, "resume_id");
  const jd = str(form, "jd_text");
  if (!resumeId) return { ok: false, error: "Pick a resume version." };
  if (!jd || jd.length < 30) return { ok: false, error: "Paste the full job description (at least a few lines)." };
  try {
    const resume = await one<Resume>("select * from resumes where id = $1", [resumeId]);
    if (!resume) return { ok: false, error: "Resume not found." };
    const r = compareResume(jd, resumeText(resume));
    await query(
      `insert into jd_comparisons (resume_id, company, job_title, jd_text, matched_skills, missing_skills, match_score, suggestions, notes)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [resumeId, str(form, "company"), str(form, "job_title"), jd, r.matched, r.missing, r.score,
        [...r.suggestions, ...(r.keywords.length ? [`Frequent JD terms not in your resume: ${r.keywords.join(", ")}`] : [])], null],
    );
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Comparison saved." };
}

export async function deleteComparison(id: string): Promise<ActionResult> {
  try {
    await query("delete from jd_comparisons where id = $1", [id]);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true };
}

export async function saveIntroScript(form: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      duration: z.enum(["30s", "60s", "2min"]),
      script: z.string().min(1, "Write your script first.").max(10000),
      self_rating: z.number().int().min(1).max(5).nullable(),
      feedback: z.string().max(5000).nullable(),
    })
    .safeParse({ duration: str(form, "duration"), script: str(form, "script") ?? "", self_rating: int(form, "self_rating"), feedback: str(form, "feedback") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const s = parsed.data;
  try {
    await query("insert into intro_scripts (duration, script, self_rating, feedback) values ($1, $2, $3, $4)", [s.duration, s.script, s.self_rating, s.feedback]);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Saved as a new version." };
}

export async function deleteIntroScript(id: string): Promise<ActionResult> {
  try {
    await query("delete from intro_scripts where id = $1", [id]);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true };
}

export async function saveStarStory(id: string | null, form: FormData): Promise<ActionResult> {
  const parsed = z
    .object({
      title: z.string().min(1, "Give the story a title.").max(200),
      prompt: z.string().max(1000).nullable(),
      situation: z.string().max(5000).nullable(),
      task: z.string().max(5000).nullable(),
      action: z.string().max(5000).nullable(),
      result: z.string().max(5000).nullable(),
      tags: z.array(z.string().max(50)).max(20),
      self_rating: z.number().int().min(1).max(5).nullable(),
    })
    .safeParse({
      title: str(form, "title") ?? "", prompt: str(form, "prompt"), situation: str(form, "situation"), task: str(form, "task"),
      action: str(form, "action"), result: str(form, "result"),
      tags: lines(form, "tags").flatMap((l) => l.split(",")).map((t) => t.trim()).filter(Boolean),
      self_rating: int(form, "self_rating"),
    });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const s = parsed.data;
  const values = [s.title, s.prompt, s.situation, s.task, s.action, s.result, s.tags, s.self_rating];
  try {
    if (id) {
      await query(
        "update star_stories set title = $2, prompt = $3, situation = $4, task = $5, action = $6, result = $7, tags = $8, self_rating = $9 where id = $1",
        [id, ...values],
      );
    } else {
      await query("insert into star_stories (title, prompt, situation, task, action, result, tags, self_rating) values ($1, $2, $3, $4, $5, $6, $7, $8)", values);
    }
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true, message: "Story saved." };
}

export async function deleteStarStory(id: string): Promise<ActionResult> {
  try {
    await query("delete from star_stories where id = $1", [id]);
  } catch (err) {
    return fail(err);
  }
  refresh();
  return { ok: true };
}

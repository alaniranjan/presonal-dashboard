"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, int, str } from "@/lib/action-utils";
import { query, USER_ID } from "@/lib/db";
import type { ActionResult } from "@/lib/types";

const profileSchema = z.object({
  full_name: z.string().max(100).nullable(),
  target_role: z.string().min(1, "Target role is required.").max(120),
  experience_years: z.number().min(0).max(50).nullable(),
  current_ctc: z.string().max(60).nullable(),
  target_salary: z.string().max(60).nullable(),
  location: z.string().max(120).nullable(),
  notice_period: z.string().max(60).nullable(),
  weekly_hours: z.number().min(0).max(100),
  daily_study_minutes: z.number().int().min(0).max(1440),
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Unknown timezone."),
});

export async function updateProfile(form: FormData): Promise<ActionResult> {
  const exp = str(form, "experience_years");
  const parsed = profileSchema.safeParse({
    full_name: str(form, "full_name"),
    target_role: str(form, "target_role") ?? "",
    experience_years: exp === null ? null : Number(exp),
    current_ctc: str(form, "current_ctc"),
    target_salary: str(form, "target_salary"),
    location: str(form, "location"),
    notice_period: str(form, "notice_period"),
    weekly_hours: Number(str(form, "weekly_hours") ?? 0),
    daily_study_minutes: int(form, "daily_study_minutes") ?? 0,
    timezone: str(form, "timezone") ?? "UTC",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const p = parsed.data;
  try {
    await query(
      `update profiles set full_name = $2, target_role = $3, experience_years = $4, current_ctc = $5, target_salary = $6,
         location = $7, notice_period = $8, weekly_hours = $9, daily_study_minutes = $10, timezone = $11
       where id = $1`,
      [USER_ID, p.full_name, p.target_role, p.experience_years, p.current_ctc, p.target_salary, p.location,
        p.notice_period, p.weekly_hours, p.daily_study_minutes, p.timezone],
    );
  } catch (err) {
    return fail(err);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved." };
}

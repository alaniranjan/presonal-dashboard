import type { ActionResult } from "./types";

export function fail(error: unknown): ActionResult {
  if (error && typeof error === "object" && "message" in error) {
    return { ok: false, error: String((error as { message: unknown }).message) };
  }
  return { ok: false, error: "Something went wrong. Please try again." };
}

export function str(form: FormData, key: string): string | null {
  const v = form.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export function int(form: FormData, key: string): number | null {
  const v = str(form, key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** Newline-separated textarea → string[] */
export function lines(form: FormData, key: string): string[] {
  return (str(form, key) ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

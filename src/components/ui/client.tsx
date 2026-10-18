"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";
import type { ActionResult } from "@/lib/types";

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={title}
      className={`m-auto w-[calc(100%-1.5rem)] ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[92dvh] rounded-xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-black/50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100`}
    >
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <h2 className="font-semibold">{title}</h2>
        <button type="button" className="btn-ghost px-2 py-1" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
      </div>
      <div className="max-h-[calc(92dvh-3.5rem)] overflow-y-auto px-4 py-4 sm:px-5">{open && children}</div>
    </dialog>
  );
}

export function Alert({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  if (result.ok && !result.message) return null;
  return (
    <p role={result.ok ? "status" : "alert"}
      className={`rounded-lg px-3 py-2 text-sm ${result.ok
        ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
        : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300"}`}>
      {result.ok ? result.message : result.error}
    </p>
  );
}

/** Runs a server action and catches network failures so the UI can show an error instead of crashing. */
export async function safeAction<T extends ActionResult>(fn: () => Promise<T>): Promise<T | ActionResult> {
  try {
    return await fn();
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection and try again." };
  }
}

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  }
  return (
    <button type="button" onClick={toggle} className="btn-ghost px-2" aria-label="Toggle dark mode" title="Toggle theme">
      <Icon name={dark ? "sun" : "moon"} />
    </button>
  );
}

/** A button that runs a server action, with optional confirm, pending state and inline error. */
export function ActionButton({ action, confirmText, className = "btn-secondary", children, onDone }: {
  action: () => Promise<ActionResult>;
  confirmText?: string;
  className?: string;
  children: ReactNode;
  onDone?: (res: ActionResult) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" className={className} disabled={pending}
        onClick={async () => {
          if (confirmText && !confirm(confirmText)) return;
          setPending(true);
          setError(null);
          const res = await safeAction(action);
          setPending(false);
          if (!res.ok) setError(res.error);
          onDone?.(res);
        }}>
        {pending ? "Working…" : children}
      </button>
      {error && <span role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </span>
  );
}

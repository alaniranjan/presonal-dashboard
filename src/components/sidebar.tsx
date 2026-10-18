"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ui/client";
import { Icon } from "./icons";
import { NAV } from "./nav";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="space-y-0.5">
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${active
              ? "bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"}`}>
            <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
            <span className="flex-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 px-3 py-1">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold text-white">QA</span>
      <span className="text-sm font-semibold">Career Command Center</span>
    </Link>
  );
}

const BOTTOM_NAV = [
  { href: "/dashboard", label: "Home", icon: "dashboard" },
  { href: "/tasks", label: "Tasks", icon: "tasks" },
  { href: "/interview", label: "Practice", icon: "interview" },
  { href: "/jobs", label: "Jobs", icon: "jobs" },
] as const;

/** Phone-only tab bar for the most used sections; "More" opens the full menu. */
function BottomNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  const item = "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium";
  return (
    <nav aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
      {BOTTOM_NAV.map((n) => {
        const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
        return (
          <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}
            className={`${item} ${active ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-500 dark:text-zinc-400"}`}>
            <Icon name={n.icon} className="h-[22px] w-[22px]" />{n.label}
          </Link>
        );
      })}
      <button type="button" onClick={onMore} className={`${item} text-zinc-500 dark:text-zinc-400`} aria-label="More sections">
        <Icon name="menu" className="h-[22px] w-[22px]" />More
      </button>
    </nav>
  );
}

export function AppShell({ userName, children }: { userName: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const current = NAV.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`));

  // Close the drawer with Escape and stop the page behind it from scrolling.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-60 shrink-0 border-r border-zinc-200 bg-white px-3 py-4 lg:block dark:border-zinc-800 dark:bg-zinc-900">
        <div className="sticky top-4 space-y-6">
          <Brand />
          <NavLinks />
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto bg-white px-3 py-4 shadow-xl dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <Brand />
              <button type="button" className="btn-ghost px-2" aria-label="Close navigation" onClick={() => setOpen(false)}><Icon name="close" /></button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-zinc-200 bg-white/80 px-3 backdrop-blur sm:px-4 dark:border-zinc-800 dark:bg-zinc-950/80">
          <button type="button" className="btn-ghost px-2 lg:hidden" aria-label="Open navigation" onClick={() => setOpen(true)}><Icon name="menu" /></button>
          <Link href="/dashboard" className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold text-white lg:hidden" aria-label="Dashboard">QA</Link>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold lg:hidden">{current?.label ?? "QA Career"}</span>
          <div className="hidden flex-1 lg:block" />
          <span className="muted hidden text-sm sm:inline">{userName}</span>
          <ThemeToggle />
        </header>
        <main className="mx-auto max-w-7xl px-4 pt-4 pb-24 sm:px-6 sm:pt-6 lg:pb-6">{children}</main>
      </div>
      <BottomNav onMore={() => setOpen(true)} />
    </div>
  );
}

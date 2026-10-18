import type { IconName } from "./icons";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/roadmap", label: "Roadmap", icon: "roadmap" },
  { href: "/tasks", label: "Daily Tasks", icon: "tasks" },
  { href: "/interview", label: "Interview Practice", icon: "interview" },
  { href: "/mock-interviews", label: "Mock Interviews", icon: "mock" },
  { href: "/projects", label: "Projects", icon: "projects" },
  { href: "/resume", label: "Resume Lab", icon: "resume" },
  { href: "/jobs", label: "Job Applications", icon: "jobs" },
  { href: "/reports", label: "Reports", icon: "reports" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

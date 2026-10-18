import { AppShell } from "@/components/sidebar";
import { getContext } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getContext();
  return <AppShell userName={profile.full_name || "Practice mode"}>{children}</AppShell>;
}

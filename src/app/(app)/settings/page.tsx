import { PageHeader } from "@/components/ui";
import { getContext } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { ChecklistForm } from "./checklist-form";
import { ProfileForm } from "./profile-form";

export default async function SettingsPage() {
  const { profile } = await getContext();
  return (
    <>
      <PageHeader title="Settings" description="Practice mode: single local profile, saved in your PostgreSQL database." />
      <ProfileForm profile={profile} />
      <div className="mt-6"><ChecklistForm items={profile.job_checklist} /></div>
      <p className="muted mt-4 text-sm">
        Plan start date: {profile.start_date ? formatDate(profile.start_date, { year: "numeric" }) : "not set"}.
        Reschedule individual tasks from Daily Tasks; completed work is never moved.
      </p>
    </>
  );
}

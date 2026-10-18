import "server-only";
import { one, USER_ID } from "./db";
import { todayIn } from "./dates";
import type { Profile } from "./types";

/** The practice profile plus "today" in its timezone. */
export async function getContext() {
  let profile = await one<Profile>("select * from profiles where id = $1", [USER_ID]);
  if (!profile) {
    profile = await one<Profile>("insert into profiles (id) values ($1) on conflict (id) do update set id = excluded.id returning *", [USER_ID]);
  }
  if (!profile) throw new Error("Could not load your profile. Run `npm run db:setup`.");
  return { profile, today: todayIn(profile.timezone) };
}

export async function getTimezone() {
  return (await one<{ timezone: string }>("select timezone from profiles where id = $1", [USER_ID]))?.timezone ?? "UTC";
}

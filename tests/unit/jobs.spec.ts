import { expect, test } from "@playwright/test";
import { computeJobStats, type JobRow } from "../../src/lib/metrics";

const TODAY = "2026-10-21";
const job = (p: Partial<JobRow>): JobRow => ({ status: "applied", date_applied: "2026-10-20", follow_up_date: null, portal: "linkedin", ...p });

test("funnel rates are out of submitted applications only", () => {
  const s = computeJobStats([
    job({ status: "saved", date_applied: null }),
    job({}),
    job({ status: "recruiter_contacted" }),
    job({ status: "technical_1", portal: "naukri" }),
    job({ status: "offer" }),
    job({ status: "rejected" }),
  ], TODAY);
  expect(s.total).toBe(6);
  expect(s.applied).toBe(5);
  expect(s.responded).toBe(3);
  expect(s.interviews).toBe(2);
  expect(s.offers).toBe(1);
  expect(s.responseRate).toBe(60);
  expect(s.interviewRate).toBe(40);
  expect(s.byPortal.find((p) => p.portal === "naukri")).toEqual({ portal: "naukri", applied: 1, interviews: 1 });
});

test("follow-ups due ignore closed applications", () => {
  const s = computeJobStats([
    job({ follow_up_date: "2026-10-21" }),
    job({ follow_up_date: "2026-10-01", status: "rejected" }),
    job({ follow_up_date: "2026-10-30" }),
  ], TODAY);
  expect(s.followUpsDue).toBe(1);
});

test("weekly counts use the applied date", () => {
  const s = computeJobStats([job({ date_applied: "2026-10-19" }), job({ date_applied: "2026-10-13" })], TODAY);
  expect(s.weekly.at(-1)).toEqual({ week: "10-19", applied: 1 });
  expect(s.weekly.at(-2)).toEqual({ week: "10-12", applied: 1 });
  expect(s.thisWeek).toBe(1);
});

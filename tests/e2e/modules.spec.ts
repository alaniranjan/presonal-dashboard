import { expect, test, type Page } from "@playwright/test";

// Phase 5–7 modules. Runs against the throwaway qa_career_test database.
test.describe.configure({ mode: "serial" });

/** Clicks until the client has hydrated (first visits compile pages in dev mode). */
async function hydratedClick(page: Page, name: string | RegExp, expectVisible: Parameters<Page["getByText"]>[0]) {
  const target = page.getByText(expectVisible).first();
  await expect(async () => {
    const button = page.getByRole("button", { name }).first();
    // The click may navigate away; only click again while the button is still there.
    if (!(await target.isVisible()) && (await button.isVisible())) await button.click({ timeout: 1000 });
    await expect(target).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 45_000 });
}

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await page.goto("/dashboard");
  const create = page.getByRole("button", { name: "Create my plan" });
  if (await create.isVisible()) {
    await create.click();
    await expect(page.getByText(/Day \d+ of 182/)).toBeVisible({ timeout: 30_000 });
  }
  await page.close();
});

test("projects: starter projects, and milestones need evidence to complete", async ({ page }) => {
  await page.goto("/projects");
  await hydratedClick(page, "Add the 4 starter projects", "Project 1: E-commerce end-to-end framework");
  await page.getByRole("link", { name: /Project 1: E-commerce/ }).click();
  await expect(page.getByText("0/7 milestones")).toBeVisible();

  // Completing without evidence is refused.
  await page.getByRole("combobox", { name: "Status" }).first().selectOption("completed");
  await expect(page.getByRole("dialog", { name: "Edit milestone" })).toBeVisible();
  const dialog = page.getByRole("dialog", { name: "Edit milestone" });
  await dialog.getByLabel("Link (commit, PR, report, build)").fill("https://github.com/example/ecommerce-playwright/commit/abc123");
  await dialog.getByLabel("Status").selectOption("completed");
  await dialog.getByRole("button", { name: "Save milestone" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("1/7 milestones")).toBeVisible();
  await expect(page.getByText("In progress").first()).toBeVisible();
});

test("resume lab: version, JD match, self-intro and STAR story", async ({ page }) => {
  await page.goto("/resume");
  await hydratedClick(page, "+ New resume version", "Version name");
  const d = page.getByRole("dialog", { name: "New resume version" });
  await d.getByLabel("Version name").fill("Base SDET resume");
  await d.getByLabel("Skills (comma or one per line)").fill("Playwright, TypeScript, SQL");
  await d.getByLabel("Projects").fill("Built a Playwright framework with 40 tests");
  await d.getByRole("button", { name: "Save version" }).click();
  await expect(page.getByRole("heading", { name: "Base SDET resume" })).toBeVisible();
  await expect(page.getByText("Primary")).toBeVisible();

  await page.getByRole("link", { name: "Job description match" }).click();
  await page.getByLabel("Company").fill("Acme");
  await page.getByLabel("Job description").fill("We need an SDET with Playwright, TypeScript, Jenkins and Docker experience. SQL is a plus.");
  await page.getByRole("button", { name: "Compare" }).click();
  await expect(page.getByText("60%")).toBeVisible();
  await expect(page.getByText("Missing skills (2)")).toBeVisible();

  await page.getByRole("link", { name: "Self-introduction" }).click();
  await page.getByLabel("Your 60s script").fill("Hi, I'm a QA engineer with three years of experience in manual and automation testing.");
  await page.getByRole("button", { name: "Save as new version" }).click();
  await expect(page.getByText("Saved versions (1)")).toBeVisible();

  await page.getByRole("link", { name: "STAR stories" }).click();
  await page.getByRole("button", { name: "+ New STAR story" }).click();
  const s = page.getByRole("dialog", { name: "STAR story" });
  await s.getByLabel("Title").fill("Checkout race condition");
  await s.getByLabel("Result (real outcome, ideally measurable)").fill("Fixed before release; added a regression test");
  await s.getByRole("button", { name: "Save story" }).click();
  await expect(page.getByRole("heading", { name: "Checkout race condition" })).toBeVisible();
});

test("jobs: add, detect duplicate, move on board, add round, log routine, export", async ({ page }) => {
  await page.goto("/jobs/new");
  await page.getByLabel("Company").fill("Globex");
  await page.getByLabel("Job title").fill("SDET");
  await page.getByLabel("Job posting URL").fill("https://jobs.example.com/globex/sdet-1");
  await page.getByLabel("Status").selectOption("applied");
  await page.getByRole("button", { name: "Add application" }).click();
  await expect(page.getByRole("heading", { name: "Globex · SDET" })).toBeVisible();
  await expect(page.getByText("APP-0001")).toBeVisible();

  await page.goto("/jobs/new");
  await page.getByLabel("Company").fill("globex ");
  await page.getByLabel("Job title").fill("sdet");
  await page.getByRole("button", { name: "Add application" }).click();
  await expect(page.getByText("Possible duplicate. You already have:")).toBeVisible();

  await page.goto("/jobs?view=board");
  const screening = page.getByRole("region", { name: "Screening" }).getByRole("link", { name: "Globex" });
  await expect(async () => {
    await page.getByRole("combobox", { name: "Move Globex" }).selectOption("screening");
    await expect(screening).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 30_000 });
  await page.waitForLoadState("networkidle");
  await page.reload(); // persisted, not just optimistic
  await expect(page.getByRole("region", { name: "Screening" }).getByRole("link", { name: "Globex" })).toBeVisible();

  await page.goto("/jobs");
  await page.getByRole("link", { name: "Globex" }).click();
  await hydratedClick(page, "+ Add round", "Questions asked");
  const r = page.getByRole("dialog", { name: "Interview round" });
  await r.getByLabel("Questions asked").fill("Explain fixtures\nHow do you handle flaky tests?");
  await r.getByRole("button", { name: "Save round" }).click();
  await expect(page.getByText("Interview rounds (1)")).toBeVisible();

  await page.goto("/jobs?view=routine");
  await page.getByRole("checkbox", { name: "Check LinkedIn" }).check();
  await page.getByLabel("Applications submitted").fill("2");
  await page.getByRole("button", { name: "Save today's log" }).click();
  await expect(page.getByText("Today's job-search log saved.")).toBeVisible();

  const res = await page.request.get("/api/export/applications");
  expect(res.headers()["content-type"]).toContain("text/csv");
  const csv = await res.text();
  expect(csv).toContain("Application ID,Date Found,Company");
  expect(csv).toContain("Globex");
});

test("mock interview: answer a question, finish early, see the score", async ({ page }) => {
  await page.goto("/mock-interviews");
  await page.getByLabel("Number of questions").selectOption("3");
  await hydratedClick(page, "Start mock interview", "Question 1 of 3");
  await page.getByLabel("Your answer").fill("Fixtures provide isolated setup and teardown via test.extend and use().");
  await page.getByRole("button", { name: "Submit answer for review" }).click();
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Save attempt" }).click();
  // The score stays on screen after saving (regression: the page used to jump to the next question).
  await expect(page.getByText("Saved. Next revision:")).toBeVisible();
  await expect(page.getByText("Question 1 of 3")).toBeVisible();
  await page.getByRole("link", { name: "Next question →" }).click();
  await expect(page.getByText("Question 2 of 3")).toBeVisible();
  await page.getByRole("button", { name: "Finish early and score answered questions" }).click();
  await expect(page.getByRole("heading", { name: "Result" })).toBeVisible();
  await expect(page.getByText(/Answered 1 of 3 questions/)).toBeVisible();
});

test("reports show topic scores, mistakes, projects and the funnel", async ({ page }) => {
  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Interview scores by topic" })).toBeVisible();
  await expect(page.getByText(/missed \d+×/).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Project completion" })).toBeVisible();
  await expect(page.getByText("Reached interviews")).toBeVisible();
  for (const type of ["tasks", "attempts"]) {
    const res = await page.request.get(`/api/export/${type}`);
    expect(res.ok()).toBe(true);
  }
});

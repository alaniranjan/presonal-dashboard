import { expect, test } from "@playwright/test";

// Runs against the throwaway qa_career_test database (reset by scripts/e2e-reset-db.mjs).
test.describe.configure({ mode: "serial" });

test("opens straight to the dashboard with no sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(/sign in/i)).toHaveCount(0);
});

test("creating the plan seeds the roadmap and fills the dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Create my plan" }).click();
  await expect(page.getByText(/Day \d+ of 182/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("0 / 144 roadmap tasks")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Skill scores" })).toBeVisible();

  await page.goto("/roadmap");
  await expect(page.getByRole("heading", { name: "JavaScript & TypeScript foundations" })).toBeVisible();
});

test("a custom task can be added, completed (persisted) and deleted", async ({ page }) => {
  const title = `E2E task ${Date.now()}`;
  await page.goto("/tasks");
  await page.getByRole("button", { name: "+ Add task" }).click();
  const dialog = page.getByRole("dialog", { name: "Add task" });
  await dialog.getByLabel("Title").fill(title);
  await dialog.getByRole("button", { name: "Add task" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("checkbox", { name: `Mark "${title}" completed` }).check();
  await expect(page.getByRole("checkbox", { name: `Mark "${title}" not completed` })).toBeChecked();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: `Mark "${title}" not completed` })).toBeChecked();

  await page.getByRole("button", { name: title }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText(title)).toHaveCount(0);
});

test("an interview answer is reviewed, scored and saved to history", async ({ page }) => {
  await page.goto("/interview/next?category=playwright");
  await expect(page).toHaveURL(/\/interview\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Attempt history (0)" })).toBeVisible();

  // The first visit compiles the page in dev mode; retry until the client is hydrated.
  await expect(async () => {
    await page.getByRole("button", { name: /Show hint \(1\// }).click({ timeout: 1000 });
    await expect(page.getByText("Hint 1:")).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 20_000 });
  await page.getByLabel("Your answer").fill("Use user-facing locators like getByRole; locators are lazy and auto-wait.");
  await page.getByRole("button", { name: "Submit answer for review" }).click();
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Save attempt" }).click();

  await expect(page.getByText("Saved. Next revision:")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Attempt history (1)" })).toBeVisible();

  await page.goto("/interview?view=revision");
  await expect(page.getByRole("link", { name: /locator strategies/i })).toBeVisible();
});

test("profile settings are saved", async ({ page }) => {
  await page.goto("/settings");
  await page.getByLabel("Full name").fill("E2E Tester");
  await page.getByLabel("Notice period").fill("30 days");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Profile saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Notice period")).toHaveValue("30 days");
});

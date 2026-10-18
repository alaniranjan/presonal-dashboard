import { defineConfig, devices } from "@playwright/test";

// E2E runs its own server on a separate port against a throwaway database, so your practice data is never touched.
const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;
const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://localhost:5432/qa_career_test";
const unitOnly = !!process.env.PW_UNIT_ONLY;

export default defineConfig({
  fullyParallel: true,
  // E2E specs share one throwaway database, so run them one at a time.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }], ["junit", { outputFile: "test-results/junit.xml" }]]
    : [["list"], ["html", { open: "never" }]],
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    // Pure logic tests — no browser or server needed.
    { name: "unit", testDir: "tests/unit" },
    { name: "e2e", testDir: "tests/e2e", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: unitOnly
    ? undefined
    : {
        command: `node scripts/e2e-reset-db.mjs && npx next dev -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
        env: { DATABASE_URL: E2E_DATABASE_URL, NEXT_DIST_DIR: ".next-e2e" },
      },
});

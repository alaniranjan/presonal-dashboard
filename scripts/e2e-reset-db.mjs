// Recreates the throwaway E2E database. Refuses to touch anything not ending in _test.
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL ?? "";
if (!url.endsWith("_test")) {
  console.error(`Refusing to reset a non-test database: ${url}`);
  process.exit(1);
}
execSync(`dropdb --if-exists --force ${new URL(url).pathname.slice(1)}`, { stdio: "inherit" });
execSync("node scripts/db-setup.mjs", { stdio: "inherit" });

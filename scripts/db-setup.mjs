// Creates the database (if missing) and applies db/*.sql files that haven't run yet.
// Usage: npm run db:setup
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const root = new URL("..", import.meta.url).pathname;

// Minimal .env.local reader so the script works without extra packages.
const envFile = join(root, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const url = new URL(process.env.DATABASE_URL || "postgresql://localhost:5432/qa_career");
const dbName = url.pathname.slice(1);

const admin = new pg.Client({ connectionString: Object.assign(new URL(url), { pathname: "/postgres" }).toString() });
await admin.connect();
const { rowCount } = await admin.query("select 1 from pg_database where datname = $1", [dbName]);
if (!rowCount) {
  await admin.query(`create database "${dbName.replace(/"/g, "")}"`);
  console.log(`Created database ${dbName}`);
}
await admin.end();

const db = new pg.Client({ connectionString: url.toString() });
await db.connect();
await db.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
const applied = new Set((await db.query("select name from schema_migrations")).rows.map((r) => r.name));

const dir = join(root, "db");
for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  if (applied.has(file)) continue;
  try {
    await db.query("begin");
    await db.query(readFileSync(join(dir, file), "utf8"));
    await db.query("insert into schema_migrations (name) values ($1)", [file]);
    await db.query("commit");
    console.log(`Applied ${file}`);
  } catch (err) {
    await db.query("rollback");
    console.error(`Failed on ${file}: ${err.message}`);
    process.exit(1);
  }
}
await db.end();
console.log(`Database ${dbName} is ready.`);

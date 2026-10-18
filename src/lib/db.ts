import "server-only";
import pg from "pg";

/** The single practice user. Every row in the database belongs to this id (see db/000_local_user.sql). */
export const USER_ID = "00000000-0000-0000-0000-000000000001";

// Return DATE columns as "YYYY-MM-DD", timestamps as ISO strings and NUMERIC as numbers.
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(1184, (v) => new Date(v).toISOString());
pg.types.setTypeParser(1114, (v) => new Date(`${v}Z`).toISOString());
pg.types.setTypeParser(1700, (v) => Number(v));
pg.types.setTypeParser(20, (v) => Number(v));

const globalForPool = globalThis as unknown as { pgPool?: pg.Pool };
export const pool =
  globalForPool.pgPool ??
  new pg.Pool({ connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/qa_career", max: 5 });
if (process.env.NODE_ENV !== "production") globalForPool.pgPool = pool;

export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

export async function one<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T | null> {
  return (await query<T>(text, params))[0] ?? null;
}

/** Runs `fn` inside a transaction; rolls back on any error. */
export async function transaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

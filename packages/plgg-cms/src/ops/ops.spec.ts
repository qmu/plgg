import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { rmSync } from "node:fs";
import { type Result, isErr, none } from "plgg";
import {
  type HttpRequest,
  type Method,
  handle,
} from "plgg-server";
import { sql, exec, query } from "plgg-sql";
import {
  openIndex,
  openDb,
} from "plgg-content";
import { healthWeb } from "plgg-cms/ops/healthWeb";
import { backupDatabase } from "plgg-cms/ops/backupDatabase";

const must = <T>(
  r: Result<T, unknown>,
): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const req = (): HttpRequest => ({
  method: "GET" as Method,
  path: "/health",
  query: {},
  headers: {},
  params: {},
  body: "",
  bytes: none(),
});

test("GET /health is 200 when the index is reachable", async () => {
  const db = must(
    await openIndex(":memory:"),
  );
  const res = must(
    await handle(healthWeb(db), req()),
  );
  return all([
    check(res.status.content, toBe(200)),
    check(
      String(res.body).includes('"ok"'),
      toBe(true),
    ),
  ]);
});

test("GET /health is 503 when the index schema is unreachable", async () => {
  // a schema-less handle has no `documents` table → the probe
  // query errors → a degraded 503 response, never a throw.
  const broken = openDb(":memory:");
  const res = must(
    await handle(healthWeb(broken), req()),
  );
  return all([
    check(res.status.content, toBe(503)),
    check(
      String(res.body).includes("unavailable"),
      toBe(true),
    ),
  ]);
});

test("backupDatabase snapshots a consistent copy that restores the data", async () => {
  const db = must(
    await openIndex(":memory:"),
  );
  must(
    await exec(db)(
      sql`INSERT INTO documents (id, collection, path, content_hash, attributes_json, updated_at) VALUES (1, 'blog', '/a', 'h', '{}', 't')`,
    ),
  );
  const dest =
    "/tmp/plgg-ops-backup-test.db";
  // VACUUM INTO refuses an existing file — clear any leftover.
  rmSync(dest, { force: true });
  rmSync(`${dest}-wal`, { force: true });
  rmSync(`${dest}-shm`, { force: true });
  must(await backupDatabase(db)(dest));
  // reopen the backup and confirm the row is there
  const restored = openDb(dest);
  const rows = must(
    await query(restored)(
      sql`SELECT path FROM documents`,
    ),
  );
  return check(rows.length, toBe(1));
});

test("backupDatabase to an unwritable path is a typed Err", async () => {
  const db = must(
    await openIndex(":memory:"),
  );
  const res = await backupDatabase(db)(
    "/nonexistent-dir-xyz/backup.db",
  );
  return check(isErr(res), toBe(true));
});

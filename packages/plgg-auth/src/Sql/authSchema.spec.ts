import {
  test,
  check,
  toBe,
} from "plgg-test";
import { isErr } from "plgg";
import { sql, query } from "plgg-sql";
import { openSqliteDb } from "plgg-auth/Oidc/testkit/sqliteDb";
import { applyAuthSchema } from "plgg-auth/Sql/authSchema";

test("applyAuthSchema creates the OP tables and is idempotent", async () => {
  const db = openSqliteDb();
  const first = await applyAuthSchema(db);
  if (isErr(first)) {
    return check(isErr(first), toBe(false));
  }
  // a second apply must not fail (IF NOT EXISTS)
  const second = await applyAuthSchema(db);
  if (isErr(second)) {
    return check(isErr(second), toBe(false));
  }
  const rows = await query(db)(
    sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ${"oidc_signing_keys"}`,
  );
  return check(
    isErr(rows) ? -1 : rows.content.length,
    toBe(1),
  );
});

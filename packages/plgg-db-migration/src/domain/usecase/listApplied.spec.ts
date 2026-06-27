import {
  test,
  check,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import { sql } from "plgg-sql";
import { versionString } from "plgg-db-migration/domain/model/Version";
import { sqlite } from "plgg-db-migration/domain/model/Dialect";
import { ensureSchemaMigrations } from "plgg-db-migration/domain/usecase/ensureSchemaMigrations";
import { listApplied } from "plgg-db-migration/domain/usecase/listApplied";
import { openSqliteDb } from "plgg-db-migration/testkit/sqliteDb";

const kindOf = (e: {
  __tag: string;
  content: unknown;
}): string =>
  e.__tag === "MigrationError" &&
  typeof e.content === "object" &&
  e.content !== null &&
  "kind" in e.content &&
  typeof e.content.kind === "string"
    ? e.content.kind
    : e.__tag;

test("listApplied returns the recorded versions ascending", async () => {
  const db = openSqliteDb();
  await ensureSchemaMigrations(db, sqlite);
  await db.run(
    sql`INSERT INTO schema_migrations (version) VALUES (${"20260202000000"})`,
  );
  await db.run(
    sql`INSERT INTO schema_migrations (version) VALUES (${"20260101000000"})`,
  );
  return check(
    await listApplied(db),
    okThen((rows) =>
      toEqual([
        "20260101000000",
        "20260202000000",
      ])(
        rows.map((r) => versionString(r.version)),
      ),
    ),
  );
});

test("listApplied on a missing ledger is a SqlError", async () =>
  check(
    await listApplied(openSqliteDb()),
    errThen((e) => toBe("SqlError")(e.__tag)),
  ));

test("listApplied on a malformed version row is a LedgerCorrupt MigrationError", async () => {
  const db = openSqliteDb();
  await ensureSchemaMigrations(db, sqlite);
  await db.run(
    sql`INSERT INTO schema_migrations (version) VALUES (${"not-a-version"})`,
  );
  return check(
    await listApplied(db),
    errThen((e) =>
      toBe("LedgerCorrupt")(kindOf(e)),
    ),
  );
});

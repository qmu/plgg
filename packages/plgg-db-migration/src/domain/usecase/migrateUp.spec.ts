import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import { some, isOk } from "plgg";
import { sql } from "plgg-sql";
import { versionString } from "plgg-db-migration/domain/model/Version";
import { sqlite } from "plgg-db-migration/domain/model/Dialect";
import { migrateUp } from "plgg-db-migration/domain/usecase/migrateUp";
import { listApplied } from "plgg-db-migration/domain/usecase/listApplied";
import { ensureSchemaMigrations } from "plgg-db-migration/domain/usecase/ensureSchemaMigrations";
import { openSqliteDb } from "plgg-db-migration/testkit/sqliteDb";
import { buildMigrator } from "plgg-db-migration/testkit/migrator";

const fail = () => check(true, toBe(false));

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

test("migrateUp applies pending in order, is idempotent, and records the ledger", async () => {
  const db = openSqliteDb();
  const built = buildMigrator(db, sqlite, [
    {
      version: "20260101000000",
      name: "users",
      up: "CREATE TABLE users (id INTEGER PRIMARY KEY);",
      down: some("DROP TABLE users;"),
    },
    {
      version: "20260202000000",
      name: "posts",
      up: "CREATE TABLE posts (id INTEGER PRIMARY KEY);",
      down: some("DROP TABLE posts;"),
    },
  ]);
  if (!isOk(built)) {
    return fail();
  }
  const first = await migrateUp(built.content);
  const again = await migrateUp(built.content);
  return all([
    check(
      first,
      okThen((vs) =>
        toEqual([
          "20260101000000",
          "20260202000000",
        ])(vs.map((v) => versionString(v))),
      ),
    ),
    check(
      again,
      okThen((vs) => toBe(0)(vs.length)),
    ),
    check(
      await listApplied(db),
      okThen((rows) => toBe(2)(rows.length)),
    ),
  ]);
});

test("migrateUp surfaces a failed ensure as a SqlError", async () => {
  const db = {
    ...openSqliteDb(),
    execScript: async () => {
      throw new Error("ddl boom");
    },
  };
  const built = buildMigrator(db, sqlite, [
    {
      version: "20260101000000",
      name: "users",
      up: "CREATE TABLE users (id INTEGER);",
      down: some("DROP TABLE users;"),
    },
  ]);
  if (!isOk(built)) {
    return fail();
  }
  return check(
    await migrateUp(built.content),
    errThen((e) => toBe("SqlError")(e.__tag)),
  );
});

test("migrateUp surfaces a corrupt ledger row as a LedgerCorrupt error", async () => {
  const db = openSqliteDb();
  await ensureSchemaMigrations(db, sqlite);
  await db.run(
    sql`INSERT INTO schema_migrations (version) VALUES (${"bad-row"})`,
  );
  const built = buildMigrator(db, sqlite, [
    {
      version: "20260101000000",
      name: "users",
      up: "CREATE TABLE users (id INTEGER);",
      down: some("DROP TABLE users;"),
    },
  ]);
  if (!isOk(built)) {
    return fail();
  }
  return check(
    await migrateUp(built.content),
    errThen((e) =>
      toBe("LedgerCorrupt")(kindOf(e)),
    ),
  );
});

test("migrateUp stops at the first failing migration, leaving the prior applied", async () => {
  const db = openSqliteDb();
  const built = buildMigrator(db, sqlite, [
    {
      version: "20260101000000",
      name: "ok1",
      up: "CREATE TABLE a (id INTEGER);",
      down: some("DROP TABLE a;"),
    },
    {
      version: "20260202000000",
      name: "boom",
      up: "THIS IS NOT VALID SQL;",
      down: some("SELECT 0;"),
    },
    {
      version: "20260303000000",
      name: "ok2",
      up: "CREATE TABLE c (id INTEGER);",
      down: some("DROP TABLE c;"),
    },
  ]);
  if (!isOk(built)) {
    return fail();
  }
  const result = await migrateUp(built.content);
  return all([
    check(
      result,
      errThen((e) => toBe("SqlError")(e.__tag)),
    ),
    check(
      await listApplied(db),
      okThen((rows) =>
        toEqual(["20260101000000"])(
          rows.map((r) =>
            versionString(r.version),
          ),
        ),
      ),
    ),
  ]);
});

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
import { status } from "plgg-db-migration/domain/usecase/status";
import { migrateUp } from "plgg-db-migration/domain/usecase/migrateUp";
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

const oneSpec = [
  {
    version: "20260101000000",
    name: "users",
    up: "CREATE TABLE users (id INTEGER);",
    down: some("DROP TABLE users;"),
  },
];

test("status reports all pending on a fresh database and applies nothing", async () => {
  const db = openSqliteDb();
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
    await status(built.content),
    okThen((plan) =>
      all([
        check(
          plan.pending.map((m) =>
            versionString(m.version),
          ),
          toEqual(["20260101000000"]),
        ),
        check(plan.applied.length, toBe(0)),
      ]),
    ),
  );
});

test("after migrateUp, status reports applied and no pending", async () => {
  const db = openSqliteDb();
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
  await migrateUp(built.content);
  return check(
    await status(built.content),
    okThen((plan) =>
      all([
        check(plan.pending.length, toBe(0)),
        check(plan.applied.length, toBe(1)),
      ]),
    ),
  );
});

test("status surfaces a failed ensure as a SqlError", async () => {
  const db = {
    ...openSqliteDb(),
    execScript: async () => {
      throw new Error("ddl boom");
    },
  };
  const built = buildMigrator(
    db,
    sqlite,
    oneSpec,
  );
  if (!isOk(built)) {
    return fail();
  }
  return check(
    await status(built.content),
    errThen((e) => toBe("SqlError")(e.__tag)),
  );
});

test("status surfaces a corrupt ledger row", async () => {
  const db = openSqliteDb();
  await ensureSchemaMigrations(db, sqlite);
  await db.run(
    sql`INSERT INTO schema_migrations (version) VALUES (${"bad"})`,
  );
  const built = buildMigrator(
    db,
    sqlite,
    oneSpec,
  );
  if (!isOk(built)) {
    return fail();
  }
  return check(
    await status(built.content),
    errThen((e) =>
      toBe("LedgerCorrupt")(kindOf(e)),
    ),
  );
});

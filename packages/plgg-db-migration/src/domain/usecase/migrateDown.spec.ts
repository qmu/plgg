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
import {
  asVersion,
  versionString,
} from "plgg-db-migration/domain/model/Version";
import { sqlite } from "plgg-db-migration/domain/model/Dialect";
import { migrateUp } from "plgg-db-migration/domain/usecase/migrateUp";
import { migrateDown } from "plgg-db-migration/domain/usecase/migrateDown";
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

const specs = [
  {
    version: "20260101000000",
    name: "a",
    up: "CREATE TABLE a (id INTEGER);",
    down: some("DROP TABLE a;"),
  },
  {
    version: "20260202000000",
    name: "b",
    up: "CREATE TABLE b (id INTEGER);",
    down: some("DROP TABLE b;"),
  },
  {
    version: "20260303000000",
    name: "c",
    up: "CREATE TABLE c (id INTEGER);",
    down: some("DROP TABLE c;"),
  },
];

test("migrateDown rolls back only the most-recent applied migration by default", async () => {
  const db = openSqliteDb();
  const built = buildMigrator(db, sqlite, specs);
  if (!isOk(built)) {
    return fail();
  }
  await migrateUp(built.content);
  const rolled = await migrateDown(built.content);
  return all([
    check(
      rolled,
      okThen((vs) =>
        toEqual(["20260303000000"])(
          vs.map((v) => versionString(v)),
        ),
      ),
    ),
    check(
      await listApplied(db),
      okThen((rows) =>
        toEqual([
          "20260101000000",
          "20260202000000",
        ])(
          rows.map((r) =>
            versionString(r.version),
          ),
        ),
      ),
    ),
  ]);
});

test("migrateDown --to rolls back every migration above the target, newest first", async () => {
  const db = openSqliteDb();
  const built = buildMigrator(db, sqlite, specs);
  const target = asVersion("20260101000000");
  if (!isOk(built) || !isOk(target)) {
    return fail();
  }
  await migrateUp(built.content);
  const rolled = await migrateDown(
    built.content,
    target.content,
  );
  return all([
    check(
      rolled,
      okThen((vs) =>
        toEqual([
          "20260303000000",
          "20260202000000",
        ])(vs.map((v) => versionString(v))),
      ),
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

test("migrateDown fails when an applied version has no migration file", async () => {
  const db = openSqliteDb();
  const withDir = buildMigrator(
    db,
    sqlite,
    specs,
  );
  const emptyDir = buildMigrator(db, sqlite, []);
  if (!isOk(withDir) || !isOk(emptyDir)) {
    return fail();
  }
  await migrateUp(withDir.content);
  return check(
    await migrateDown(emptyDir.content),
    errThen((e) =>
      toBe("MissingMigration")(kindOf(e)),
    ),
  );
});

test("migrateDown surfaces a failed ensure as a SqlError", async () => {
  const db = {
    ...openSqliteDb(),
    execScript: async () => {
      throw new Error("ddl boom");
    },
  };
  const built = buildMigrator(db, sqlite, specs);
  if (!isOk(built)) {
    return fail();
  }
  return check(
    await migrateDown(built.content),
    errThen((e) => toBe("SqlError")(e.__tag)),
  );
});

test("migrateDown surfaces a corrupt ledger row", async () => {
  const db = openSqliteDb();
  await ensureSchemaMigrations(db, sqlite);
  await db.run(
    sql`INSERT INTO schema_migrations (version) VALUES (${"bad"})`,
  );
  const built = buildMigrator(db, sqlite, specs);
  if (!isOk(built)) {
    return fail();
  }
  return check(
    await migrateDown(built.content),
    errThen((e) =>
      toBe("LedgerCorrupt")(kindOf(e)),
    ),
  );
});

test("migrateDown stops at a missing migration and skips the rest of the batch", async () => {
  const db = openSqliteDb();
  const full = buildMigrator(db, sqlite, specs);
  const partial = buildMigrator(
    db,
    sqlite,
    specs.filter(
      (s) => s.version !== "20260202000000",
    ),
  );
  const target = asVersion("20251231000000");
  if (
    !isOk(full) ||
    !isOk(partial) ||
    !isOk(target)
  ) {
    return fail();
  }
  await migrateUp(full.content);
  return check(
    await migrateDown(
      partial.content,
      target.content,
    ),
    errThen((e) =>
      toBe("MissingMigration")(kindOf(e)),
    ),
  );
});

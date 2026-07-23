import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { some, none, isOk } from "plgg";
import {
  sqlite,
  mysql,
} from "plgg-db-migration/domain/model/Dialect";
import { migrationDirItems } from "plgg-db-migration/domain/model/MigrationDir";
import {
  applyMigration,
  rollbackMigration,
} from "plgg-db-migration/domain/usecase/applyMigration";
import { ensureSchemaMigrations } from "plgg-db-migration/domain/usecase/ensureSchemaMigrations";
import { listApplied } from "plgg-db-migration/domain/usecase/listApplied";
import { openSqliteDb } from "plgg-db-migration/testkit/sqliteDb";
import { buildMigrator } from "plgg-db-migration/testkit/migrator";

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

const fail = () => check(true, toBe(false));

test("applyMigration runs the up body, records the version, and is not silently re-runnable (PK)", async () => {
  const db = openSqliteDb();
  await ensureSchemaMigrations(db, sqlite);
  const built = buildMigrator(db, sqlite, [
    {
      version: "20260101000000",
      name: "users",
      up: "CREATE TABLE users (id INTEGER PRIMARY KEY);",
      down: some("DROP TABLE users;"),
    },
  ]);
  if (!isOk(built)) {
    return fail();
  }
  const mig = migrationDirItems(
    built.content.dir,
  )[0];
  if (mig === undefined) {
    return fail();
  }
  const first = await applyMigration(
    built.content,
  )(mig);
  const second = await applyMigration(
    built.content,
  )(mig);
  return all([
    check(
      first,
      okThen(() => toBe(true)(true)),
    ),
    check(
      second,
      errThen((e) => toBe("SqlError")(e.__tag)),
    ),
    check(
      await listApplied(db),
      okThen((rows) => toBe(1)(rows.length)),
    ),
  ]);
});

test("applyMigration on a non-transactional dialect runs fail-forward", async () => {
  const db = openSqliteDb();
  await ensureSchemaMigrations(db, mysql);
  const built = buildMigrator(db, mysql, [
    {
      version: "20260101000000",
      name: "x",
      up: "CREATE TABLE x (id INTEGER);",
      down: some("DROP TABLE x;"),
    },
  ]);
  if (!isOk(built)) {
    return fail();
  }
  const mig = migrationDirItems(
    built.content.dir,
  )[0];
  if (mig === undefined) {
    return fail();
  }
  return check(
    await applyMigration(built.content)(mig),
    okThen(() => toBe(true)(true)),
  );
});

test("rollbackMigration runs the down body and removes the version", async () => {
  const db = openSqliteDb();
  await ensureSchemaMigrations(db, sqlite);
  const built = buildMigrator(db, sqlite, [
    {
      version: "20260101000000",
      name: "users",
      up: "CREATE TABLE users (id INTEGER PRIMARY KEY);",
      down: some("DROP TABLE users;"),
    },
  ]);
  if (!isOk(built)) {
    return fail();
  }
  const mig = migrationDirItems(
    built.content.dir,
  )[0];
  if (mig === undefined) {
    return fail();
  }
  await applyMigration(built.content)(mig);
  const rolled = await rollbackMigration(
    built.content,
  )(mig);
  return all([
    check(
      rolled,
      okThen(() => toBe(true)(true)),
    ),
    check(
      await listApplied(db),
      okThen((rows) => toBe(0)(rows.length)),
    ),
  ]);
});

test("rollbackMigration on an irreversible migration fails loudly", async () => {
  const db = openSqliteDb();
  await ensureSchemaMigrations(db, sqlite);
  const built = buildMigrator(db, sqlite, [
    {
      version: "20260101000000",
      name: "seed",
      up: "CREATE TABLE seed (id INTEGER);",
      down: none(),
    },
  ]);
  if (!isOk(built)) {
    return fail();
  }
  const mig = migrationDirItems(
    built.content.dir,
  )[0];
  if (mig === undefined) {
    return fail();
  }
  await applyMigration(built.content)(mig);
  return check(
    await rollbackMigration(built.content)(mig),
    errThen((e) =>
      toBe("IrreversibleDown")(kindOf(e)),
    ),
  );
});

test("applyMigration fails on a duplicate version even when the up is idempotent (insert PK)", async () => {
  const db = openSqliteDb();
  await ensureSchemaMigrations(db, sqlite);
  const built = buildMigrator(db, sqlite, [
    {
      version: "20260101000000",
      name: "u",
      up: "CREATE TABLE IF NOT EXISTS u (id INTEGER);",
      down: some("DROP TABLE u;"),
    },
  ]);
  if (!isOk(built)) {
    return fail();
  }
  const mig = migrationDirItems(
    built.content.dir,
  )[0];
  if (mig === undefined) {
    return fail();
  }
  await applyMigration(built.content)(mig);
  return check(
    await applyMigration(built.content)(mig),
    errThen((e) => toBe("SqlError")(e.__tag)),
  );
});

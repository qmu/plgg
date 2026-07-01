import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import {
  PromisedResult,
  some,
  ok,
  err,
  isOk,
} from "plgg";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { Db } from "plgg-sql";
import { joinPath } from "plgg-db-migration/vendors/fs";
import {
  asTenantId,
  TenantId,
} from "plgg-db-migration/domain/model/TenantId";
import {
  TenantDb,
  tenantDb,
} from "plgg-db-migration/domain/model/TenantDb";
import { MigrationDir } from "plgg-db-migration/domain/model/MigrationDir";
import {
  MigrationError,
  ioFailure,
} from "plgg-db-migration/domain/model/MigrationError";
import { sqlite } from "plgg-db-migration/domain/model/Dialect";
import { versionString } from "plgg-db-migration/domain/model/Version";
import { listApplied } from "plgg-db-migration/domain/usecase/listApplied";
import {
  migrateTenant,
  TenantMigrationConfig,
} from "plgg-db-migration/domain/usecase/migrateTenant";
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

const SPECS = [
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
];

/** A config whose resolver always returns the same (shared) tenant Db. */
const configFor = (
  db: Db,
  dir: MigrationDir,
): TenantMigrationConfig => ({
  resolveTenantDb: (
    id: TenantId,
  ): PromisedResult<TenantDb, MigrationError> =>
    Promise.resolve(
      ok(tenantDb(id, db, ":memory:")),
    ),
  dir,
  dialect: sqlite,
});

test("migrateTenant brings a fresh tenant DB to head on first access", async () => {
  const db = openSqliteDb();
  const built = buildMigrator(db, sqlite, SPECS);
  const tid = asTenantId("tenant-cold");
  if (!isOk(built) || !isOk(tid)) {
    return fail();
  }
  const applied = await migrateTenant(
    configFor(db, built.content.dir),
  )(tid.content);
  return all([
    check(
      applied,
      okThen((vs) =>
        toEqual([
          "20260101000000",
          "20260202000000",
        ])(vs.map((v) => versionString(v))),
      ),
    ),
    check(
      await listApplied(db),
      okThen((rows) => toBe(2)(rows.length)),
    ),
  ]);
});

test("migrateTenant is a no-op once the tenant is at head", async () => {
  const db = openSqliteDb();
  const built = buildMigrator(db, sqlite, SPECS);
  const tid = asTenantId("tenant-idem");
  if (!isOk(built) || !isOk(tid)) {
    return fail();
  }
  const config = configFor(db, built.content.dir);
  await migrateTenant(config)(tid.content);
  const second = await migrateTenant(config)(
    tid.content,
  );
  return check(
    second,
    okThen((vs) => toBe(0)(vs.length)),
  );
});

test("PoC gate: 24 concurrent cold-start touches migrate a fresh tenant exactly once", async () => {
  const file = joinPath(
    mkdtempSync(
      joinPath(tmpdir(), "plgg-dbm-poc-"),
    ),
    "tenant-race.sqlite",
  );
  const built = buildMigrator(
    openSqliteDb(),
    sqlite,
    SPECS,
  );
  const tid = asTenantId("tenant-race");
  if (!isOk(built) || !isOk(tid)) {
    return fail();
  }
  // Each touch resolves its OWN connection to the SAME tenant file; the keyed
  // mutex must coalesce all of them into a single migration run (in-process
  // exactly-once). The file persists for the verification + the second wave.
  const config: TenantMigrationConfig = {
    resolveTenantDb: (
      id: TenantId,
    ): PromisedResult<TenantDb, MigrationError> =>
      Promise.resolve(
        ok(
          tenantDb(id, openSqliteDb(file), file),
        ),
      ),
    dir: built.content.dir,
    dialect: sqlite,
  };
  const wave1 = await Promise.all(
    Array.from({ length: 24 }, () =>
      migrateTenant(config)(tid.content),
    ),
  );
  const wave2 = await Promise.all(
    Array.from({ length: 5 }, () =>
      migrateTenant(config)(tid.content),
    ),
  );
  const ledger = await listApplied(
    openSqliteDb(file),
  );
  return all([
    check(wave1.every(isOk), toBe(true)),
    check(wave2.every(isOk), toBe(true)),
    // the second wave is all fast no-ops (already at head)
    check(
      wave2.every(
        (r) => isOk(r) && r.content.length === 0,
      ),
      toBe(true),
    ),
    // exactly one ledger row per migration — applied once, no duplicates
    check(
      ledger,
      okThen((rows) =>
        toBe(SPECS.length)(rows.length),
      ),
    ),
  ]);
});

test("migrateTenant surfaces a resolveTenantDb failure", async () => {
  const db = openSqliteDb();
  const built = buildMigrator(db, sqlite, SPECS);
  const tid = asTenantId("tenant-resolve-fail");
  if (!isOk(built) || !isOk(tid)) {
    return fail();
  }
  const config: TenantMigrationConfig = {
    resolveTenantDb: (): PromisedResult<
      TenantDb,
      MigrationError
    > =>
      Promise.resolve(
        err(ioFailure("tenant db not found")),
      ),
    dir: built.content.dir,
    dialect: sqlite,
  };
  return check(
    await migrateTenant(config)(tid.content),
    errThen((e) => toBe("IoFailure")(kindOf(e))),
  );
});

test("migrateTenant rolls back and reports a failing migration, leaving the ledger clean", async () => {
  const db = openSqliteDb();
  const built = buildMigrator(db, sqlite, [
    {
      version: "20260101000000",
      name: "ok",
      up: "CREATE TABLE a (id INTEGER);",
      down: some("DROP TABLE a;"),
    },
    {
      version: "20260202000000",
      name: "boom",
      up: "THIS IS NOT VALID SQL;",
      down: some("SELECT 0;"),
    },
  ]);
  const tid = asTenantId("tenant-boom");
  if (!isOk(built) || !isOk(tid)) {
    return fail();
  }
  const result = await migrateTenant(
    configFor(db, built.content.dir),
  )(tid.content);
  return all([
    check(
      result,
      errThen((e) => toBe("SqlError")(e.__tag)),
    ),
    // the whole batch is one transaction → rolled back → ledger empty
    check(
      await listApplied(db),
      okThen((rows) => toBe(0)(rows.length)),
    ),
  ]);
});

test("migrateTenant surfaces a failed ledger ensure", async () => {
  const base = openSqliteDb();
  const db: Db = {
    ...base,
    execScript: async () => {
      throw new Error("ddl boom");
    },
  };
  const built = buildMigrator(
    base,
    sqlite,
    SPECS,
  );
  const tid = asTenantId("tenant-ensure-fail");
  if (!isOk(built) || !isOk(tid)) {
    return fail();
  }
  return check(
    await migrateTenant(
      configFor(db, built.content.dir),
    )(tid.content),
    errThen((e) => toBe("SqlError")(e.__tag)),
  );
});

test("migrateTenant surfaces a failed BEGIN IMMEDIATE (write-lock acquisition)", async () => {
  const base = openSqliteDb();
  const db: Db = {
    ...base,
    execScript: async (t) => {
      if (t === "BEGIN IMMEDIATE") {
        throw new Error("locked");
      }
      return base.execScript(t);
    },
  };
  const built = buildMigrator(
    base,
    sqlite,
    SPECS,
  );
  const tid = asTenantId("tenant-begin-fail");
  if (!isOk(built) || !isOk(tid)) {
    return fail();
  }
  return check(
    await migrateTenant(
      configFor(db, built.content.dir),
    )(tid.content),
    errThen((e) => toBe("SqlError")(e.__tag)),
  );
});

test("migrateTenant surfaces a failed COMMIT", async () => {
  const base = openSqliteDb();
  const db: Db = {
    ...base,
    execScript: async (t) => {
      if (t === "COMMIT") {
        throw new Error("commit failed");
      }
      return base.execScript(t);
    },
  };
  const built = buildMigrator(
    base,
    sqlite,
    SPECS,
  );
  const tid = asTenantId("tenant-commit-fail");
  if (!isOk(built) || !isOk(tid)) {
    return fail();
  }
  return check(
    await migrateTenant(
      configFor(db, built.content.dir),
    )(tid.content),
    errThen((e) => toBe("SqlError")(e.__tag)),
  );
});

test("migrateTenant rolls back when recording a version fails (insert)", async () => {
  const base = openSqliteDb();
  const db: Db = {
    ...base,
    run: async () => {
      throw new Error("insert failed");
    },
  };
  const built = buildMigrator(
    base,
    sqlite,
    SPECS,
  );
  const tid = asTenantId("tenant-insert-fail");
  if (!isOk(built) || !isOk(tid)) {
    return fail();
  }
  return check(
    await migrateTenant(
      configFor(db, built.content.dir),
    )(tid.content),
    errThen((e) => toBe("SqlError")(e.__tag)),
  );
});

test("migrateTenant stops at the first failing migration and skips the rest of the batch", async () => {
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
  const tid = asTenantId("tenant-skip");
  if (!isOk(built) || !isOk(tid)) {
    return fail();
  }
  return all([
    check(
      await migrateTenant(
        configFor(db, built.content.dir),
      )(tid.content),
      errThen((e) => toBe("SqlError")(e.__tag)),
    ),
    check(
      await listApplied(db),
      okThen((rows) => toBe(0)(rows.length)),
    ),
  ]);
});

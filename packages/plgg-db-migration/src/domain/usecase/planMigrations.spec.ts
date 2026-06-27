import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { some, isOk } from "plgg";
import { versionString } from "plgg-db-migration/domain/model/Version";
import { migrationDirItems } from "plgg-db-migration/domain/model/MigrationDir";
import { appliedVersion } from "plgg-db-migration/domain/model/AppliedVersion";
import { sqlite } from "plgg-db-migration/domain/model/Dialect";
import { planMigrations } from "plgg-db-migration/domain/usecase/planMigrations";
import { openSqliteDb } from "plgg-db-migration/testkit/sqliteDb";
import { buildMigrator } from "plgg-db-migration/testkit/migrator";

test("planMigrations diffs the dir against the applied ledger", () => {
  const built = buildMigrator(
    openSqliteDb(),
    sqlite,
    [
      {
        version: "20260101000000",
        name: "a",
        up: "SELECT 1;",
        down: some("SELECT 0;"),
      },
      {
        version: "20260202000000",
        name: "b",
        up: "SELECT 2;",
        down: some("SELECT 0;"),
      },
    ],
  );
  if (!isOk(built)) {
    return check(true, toBe(false));
  }
  const items = migrationDirItems(
    built.content.dir,
  );
  const firstApplied = items
    .slice(0, 1)
    .map((m) => appliedVersion(m.version, "t"));
  const allApplied = items.map((m) =>
    appliedVersion(m.version, "t"),
  );
  return all([
    check(
      planMigrations(
        built.content.dir,
        [],
      ).pending.map((m) =>
        versionString(m.version),
      ),
      toEqual([
        "20260101000000",
        "20260202000000",
      ]),
    ),
    check(
      planMigrations(
        built.content.dir,
        firstApplied,
      ).pending.map((m) =>
        versionString(m.version),
      ),
      toEqual(["20260202000000"]),
    ),
    check(
      planMigrations(
        built.content.dir,
        allApplied,
      ).pending.length,
      toBe(0),
    ),
  ]);
});

import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { sqlite } from "plgg-db-migration/domain/model/Dialect";
import { defineConfig } from "plgg-db-migration/domain/model/MigrateConfig";
import { openSqliteDb } from "plgg-db-migration/testkit/sqliteDb";

test("defineConfig returns the config unchanged (typed passthrough)", () => {
  const db = openSqliteDb();
  const config = defineConfig({
    db,
    dialect: sqlite,
    migrationsDir: "databases/app/migrations",
  });
  return all([
    check(config.db, toBe(db)),
    check(config.dialect, toBe(sqlite)),
    check(
      config.migrationsDir,
      toBe("databases/app/migrations"),
    ),
  ]);
});

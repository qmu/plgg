import {
  test,
  check,
  all,
  toBe,
  okThen,
} from "plgg-test";
import { none } from "plgg";
import { Db } from "plgg-sql";
import { sqlite } from "plgg-db-migration/domain/model/Dialect";
import { asMigrationDir } from "plgg-db-migration/domain/model/MigrationDir";
import { migrator } from "plgg-db-migration/domain/model/Migrator";

const stubDb: Db = {
  all: async () => [],
  run: async () => ({
    changes: 0,
    lastInsertId: none(),
  }),
  execScript: async () => {},
  begin: async () => {},
  commit: async () => {},
  rollback: async () => {},
};

test("migrator binds the db seam, dialect, and migration dir", () =>
  check(
    asMigrationDir([]),
    okThen((dir) => {
      const m = migrator(stubDb, sqlite, dir);
      return all([
        check(m.db, toBe(stubDb)),
        check(m.dialect, toBe(sqlite)),
        check(m.dir, toBe(dir)),
      ]);
    }),
  ));

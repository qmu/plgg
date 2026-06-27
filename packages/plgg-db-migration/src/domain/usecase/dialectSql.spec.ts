import {
  test,
  check,
  all,
  toBe,
  okThen,
} from "plgg-test";
import { asVersion } from "plgg-db-migration/domain/model/Version";
import {
  sqlite,
  postgres,
  mysql,
} from "plgg-db-migration/domain/model/Dialect";
import {
  schemaMigrationsDdl,
  insertVersionSql,
  deleteVersionSql,
  selectAppliedSql,
} from "plgg-db-migration/domain/usecase/dialectSql";

test("schemaMigrationsDdl carries each engine's own column type", () =>
  all([
    check(
      schemaMigrationsDdl(sqlite).includes(
        "version TEXT PRIMARY KEY",
      ),
      toBe(true),
    ),
    check(
      schemaMigrationsDdl(postgres).includes(
        "VARCHAR(14)",
      ),
      toBe(true),
    ),
    check(
      schemaMigrationsDdl(mysql).includes(
        "CURRENT_TIMESTAMP",
      ),
      toBe(true),
    ),
  ]));

test("insert/delete bind the version as a parameter; select takes none", () =>
  check(
    asVersion("20260101000000"),
    okThen((v) =>
      all([
        check(
          insertVersionSql(v).content.text,
          toBe(
            "INSERT INTO schema_migrations (version) VALUES (?)",
          ),
        ),
        check(
          insertVersionSql(v).content.params
            .length,
          toBe(1),
        ),
        check(
          deleteVersionSql(v).content.text,
          toBe(
            "DELETE FROM schema_migrations WHERE version = ?",
          ),
        ),
        check(
          selectAppliedSql().content.params
            .length,
          toBe(0),
        ),
      ]),
    ),
  ));

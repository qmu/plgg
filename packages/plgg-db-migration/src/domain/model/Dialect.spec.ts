import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  sqlite,
  postgres,
  mysql,
} from "plgg-db-migration/domain/model/Dialect";

test("each dialect names itself and declares transactional-DDL support", () =>
  all([
    check(sqlite.name, toBe("sqlite")),
    check(
      sqlite.supportsTransactionalDdl,
      toBe(true),
    ),
    check(postgres.name, toBe("postgres")),
    check(
      postgres.supportsTransactionalDdl,
      toBe(true),
    ),
    check(mysql.name, toBe("mysql")),
    check(
      mysql.supportsTransactionalDdl,
      toBe(false),
    ),
  ]));

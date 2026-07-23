import {
  test,
  check,
  all,
  toBe,
  okThen,
} from "plgg-test";
import { some, none } from "plgg";
import { asVersion } from "plgg-db-migration/domain/model/Version";
import {
  migration,
  isReversible,
} from "plgg-db-migration/domain/model/Migration";

test("isReversible is true with a down section, false without", () =>
  check(
    asVersion("20260627181500"),
    okThen((version) =>
      all([
        check(
          isReversible(
            migration({
              version,
              name: "create_users",
              up: "CREATE TABLE users (id INTEGER);",
              down: some("DROP TABLE users;"),
              upTransaction: true,
              downTransaction: true,
            }),
          ),
          toBe(true),
        ),
        check(
          isReversible(
            migration({
              version,
              name: "seed_users",
              up: "INSERT INTO users VALUES (1);",
              down: none(),
              upTransaction: true,
              downTransaction: false,
            }),
          ),
          toBe(false),
        ),
      ]),
    ),
  ));

import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { none } from "plgg";
import { Db, runScript } from "plgg-sql/index";

const stub = (over: Partial<Db>): Db => ({
  all: async () => [],
  run: async () => ({
    changes: 0,
    lastInsertId: none(),
  }),
  execScript: async () => {},
  begin: async () => {},
  commit: async () => {},
  rollback: async () => {},
  ...over,
});

test("runScript returns Ok<void> when the script runs", async () =>
  check(
    await runScript(stub({}))(
      "CREATE TABLE t (id INTEGER);",
    ),
    okThen((content) => toBe(undefined)(content)),
  ));

test("runScript folds a driver throw into a value-level SqlError", async () =>
  check(
    await runScript(
      stub({
        execScript: async () => {
          throw new Error("syntax error");
        },
      }),
    )("BAD SQL;"),
    errThen((e) =>
      all([
        check(e.__tag, toBe("SqlError")),
        check(
          e.content.message,
          toBe("syntax error"),
        ),
      ]),
    ),
  ));

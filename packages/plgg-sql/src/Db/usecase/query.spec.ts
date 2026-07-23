import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import { none } from "plgg";
import {
  Db,
  ExecResult,
  sql,
  query,
  exec,
} from "plgg-sql/index";

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

test("query returns Ok with the driver's rows", async () => {
  const rows = [{ id: 1, name: "Ada" }];
  return check(
    await query(stub({ all: async () => rows }))(
      sql`SELECT id, name FROM users`,
    ),
    okThen((content) => toEqual(rows)(content)),
  );
});

test("query folds a driver throw into a value-level SqlError", async () =>
  check(
    await query(
      stub({
        all: async () => {
          throw new Error("connection lost");
        },
      }),
    )(sql`SELECT 1`),
    errThen((e) =>
      all([
        check(e.__tag, toBe("SqlError")),
        check(
          e.content.message,
          toBe("connection lost"),
        ),
      ]),
    ),
  ));

test("exec returns Ok with the ExecResult", async () => {
  const execResult: ExecResult = {
    changes: 1,
    lastInsertId: none(),
  };
  return check(
    await exec(
      stub({ run: async () => execResult }),
    )(sql`DELETE FROM users WHERE id = ${9}`),
    okThen((content) =>
      toEqual(execResult)(content),
    ),
  );
});

test("exec folds a non-Error throw into a generic SqlError", async () =>
  check(
    await exec(
      stub({
        run: async () => {
          throw "raw string failure";
        },
      }),
    )(
      sql`INSERT INTO users (name) VALUES (${"Ada"})`,
    ),
    errThen((e) =>
      all([
        check(e.__tag, toBe("SqlError")),
        check(
          e.content.message,
          toBe("SQL execution failed"),
        ),
      ]),
    ),
  ));

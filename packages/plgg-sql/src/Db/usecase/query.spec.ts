import { test, expect } from "vitest";
import { none, isOk, isErr } from "plgg";
import {
  Db,
  ExecResult,
  sql,
  query,
  exec,
} from "plgg-sql/index";

const stub = (over: Partial<Db>): Db => ({
  all: async () => [],
  run: async () => ({ changes: 0, lastInsertId: none() }),
  begin: async () => {},
  commit: async () => {},
  rollback: async () => {},
  ...over,
});

test("query returns Ok with the driver's rows", async () => {
  const rows = [{ id: 1, name: "Ada" }];
  const result = await query(stub({ all: async () => rows }))(
    sql`SELECT id, name FROM users`,
  );
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content).toEqual(rows);
  }
});

test("query folds a driver throw into a value-level SqlError", async () => {
  const result = await query(
    stub({
      all: async () => {
        throw new Error("connection lost");
      },
    }),
  )(sql`SELECT 1`);
  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.content.__tag).toBe("SqlError");
    expect(result.content.content.message).toBe(
      "connection lost",
    );
  }
});

test("exec returns Ok with the ExecResult", async () => {
  const execResult: ExecResult = {
    changes: 1,
    lastInsertId: none(),
  };
  const result = await exec(
    stub({ run: async () => execResult }),
  )(sql`DELETE FROM users WHERE id = ${9}`);
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content).toEqual(execResult);
  }
});

test("exec folds a non-Error throw into a generic SqlError", async () => {
  const result = await exec(
    stub({
      run: async () => {
        throw "raw string failure";
      },
    }),
  )(sql`INSERT INTO users (name) VALUES (${"Ada"})`);
  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.content.__tag).toBe("SqlError");
    expect(result.content.content.message).toBe(
      "SQL execution failed",
    );
  }
});

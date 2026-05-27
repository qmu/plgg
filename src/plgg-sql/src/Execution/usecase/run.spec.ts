import { test, expect } from "vitest";
import {
  Result,
  InvalidError,
  Num,
  SoftStr,
  cast,
  asObj,
  forProp,
  asNum,
  asSoftStr,
  isOk,
  isErr,
} from "plgg";
import {
  Sql,
  Executor,
  AsyncExecutor,
  sql,
  run,
  runAsync,
} from "plgg-sql/index";

type User = { id: Num; name: SoftStr };

const asUser = (
  row: unknown,
): Result<User, InvalidError> =>
  cast(
    row,
    asObj,
    forProp("id", asNum),
    forProp("name", asSoftStr),
  );

const query = sql`SELECT id, name FROM users WHERE id = ${1}`;

test("run executes through the seam and decodes typed records", () => {
  const execute: Executor = (_sql: Sql) => [
    { id: 1, name: "Ada" },
  ];
  const result = run(execute, asUser)(query);
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content).toEqual([{ id: 1, name: "Ada" }]);
  }
});

test("run receives the parameterized Sql at the seam", () => {
  const seen: Array<Sql> = [];
  const execute: Executor = (s: Sql) => {
    seen.push(s);
    return [];
  };
  run(execute, asUser)(query);
  expect(seen).toHaveLength(1);
  const first = seen[0];
  if (first !== undefined) {
    expect(first.content).toEqual({
      text: "SELECT id, name FROM users WHERE id = ?",
      params: [1],
    });
  }
});

test("run surfaces a decode failure as an InvalidError", () => {
  const execute: Executor = (_sql: Sql) => [
    { id: "nope", name: "Ada" },
  ];
  const result = run(execute, asUser)(query);
  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.content).toBeInstanceOf(InvalidError);
  }
});

test("runAsync awaits the executor then decodes", async () => {
  const execute: AsyncExecutor = (_sql: Sql) =>
    Promise.resolve([{ id: 2, name: "Linus" }]);
  const result = await runAsync(execute, asUser)(query);
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content).toEqual([
      { id: 2, name: "Linus" },
    ]);
  }
});

test("runAsync surfaces a decode failure as an InvalidError", async () => {
  const execute: AsyncExecutor = (_sql: Sql) =>
    Promise.resolve([{ id: 2 }]);
  const result = await runAsync(execute, asUser)(query);
  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.content).toBeInstanceOf(InvalidError);
  }
});

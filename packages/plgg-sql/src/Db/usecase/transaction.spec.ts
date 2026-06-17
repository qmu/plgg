import { test, expect } from "vitest";
import {
  Result,
  InvalidError,
  invalidError,
  ok,
  err,
  isOk,
  isErr,
} from "plgg";
import { Db, transaction } from "plgg-sql/index";

// A Db that records the transaction control calls in order.
const recordingDb = (): {
  db: Db;
  log: ReadonlyArray<string>;
} => {
  const log: Array<string> = [];
  const db: Db = {
    all: async () => [],
    run: async () => {
      throw new Error("unused");
    },
    begin: async () => {
      log.push("begin");
    },
    commit: async () => {
      log.push("commit");
    },
    rollback: async () => {
      log.push("rollback");
    },
  };
  return { db, log };
};

test("commits and returns the value when the work succeeds", async () => {
  const { db, log } = recordingDb();
  const result = await transaction(
    db,
    (): Promise<Result<number, InvalidError>> =>
      Promise.resolve(ok(42)),
  )("input");
  expect(isOk(result)).toBe(true);
  if (isOk(result)) {
    expect(result.content).toBe(42);
  }
  expect(log).toEqual(["begin", "commit"]);
});

test("rolls back and preserves the Err when the work fails", async () => {
  const { db, log } = recordingDb();
  const failure = invalidError({ message: "nope" });
  const result = await transaction(
    db,
    (): Promise<Result<number, InvalidError>> =>
      Promise.resolve(err(failure)),
  )("input");
  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.content).toBe(failure);
  }
  expect(log).toEqual(["begin", "rollback"]);
});

test("rolls back and folds a thrown error into a SqlError", async () => {
  const { db, log } = recordingDb();
  const result = await transaction(
    db,
    (): Promise<Result<number, InvalidError>> => {
      throw new Error("mid-transaction crash");
    },
  )("input");
  expect(isErr(result)).toBe(true);
  if (isErr(result)) {
    expect(result.content.__tag).toBe("SqlError");
  }
  expect(log).toEqual(["begin", "rollback"]);
});

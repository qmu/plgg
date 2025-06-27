import { test, assert, expect } from "vitest";
import {
  Result,
  validate,
  ValidationError,
  Str,
  Obj,
  Time,
  Num,
  isOk,
  isErr,
} from "plgg/index";

test("validate", async () => {
  type Article = {
    id: Num.t;
    createdAt: Time.t;
    name: Str.t;
  };
  const cast = (v: unknown): Result<Article, ValidationError> =>
    validate(
      v,
      Obj.cast,
      Obj.prop("id", Num.cast),
      Obj.prop("createdAt", Time.cast),
      Obj.prop("name", Str.cast),
    );

  const result = cast({
    id: 20,
    createdAt: "2023-10-01T12:00:00Z",
    name: "Test Article",
  });
  expect(isOk(result)).toBe(true);

  // not ok
  const result2 = cast({
    id: "20",
    createdAt: "xxx",
    name: 123,
  });
  if (isOk(result2)) {
    assert.fail("Expected validation to fail");
  }
  expect(isErr(result2)).toBe(true);
  expect(result2.err.sibling.length).toBe(3);
});


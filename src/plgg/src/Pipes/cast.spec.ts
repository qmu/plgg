import { test, assert, expect } from "vitest";
import {
  Result,
  cast,
  ValidationError,
  Str,
  asObj,
  hasProp,
  Time,
  Num,
  asNum,
  asTime,
  asStr,
  isOk,
  isErr,
} from "plgg/index";

test("validate", async () => {
  type Article = {
    id: Num;
    createdAt: Time;
    name: Str;
  };
  const asArticle = (v: unknown): Result<Article, ValidationError> =>
    cast(
      v,
      asObj,
      hasProp("id", asNum),
      hasProp("createdAt", asTime),
      hasProp("name", asStr),
    );

  const result = asArticle({
    id: 20,
    createdAt: "2023-10-01T12:00:00Z",
    name: "Test Article",
  });
  expect(isOk(result)).toBe(true);

  // not ok
  const result2 = asArticle({
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

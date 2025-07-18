import { test, assert, expect } from "vitest";
import {
  Result,
  cast,
  ValidationError,
  Str,
  castObj,
  castProp,
  Time,
  Num,
  castNum,
  castTime,
  castStr,
  isOk,
  isErr,
} from "plgg/index";

test("validate", async () => {
  type Article = {
    id: Num;
    createdAt: Time;
    name: Str;
  };
  const castArticle = (v: unknown): Result<Article, ValidationError> =>
    cast(
      v,
      castObj,
      castProp("id", castNum),
      castProp("createdAt", castTime),
      castProp("name", castStr),
    );

  const result = castArticle({
    id: 20,
    createdAt: "2023-10-01T12:00:00Z",
    name: "Test Article",
  });
  expect(isOk(result)).toBe(true);

  // not ok
  const result2 = castArticle({
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

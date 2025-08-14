import { test, expect, assert } from "vitest";
import {
  newOk,
  newErr,
  isOk,
  isErr,
  asErr,
  pipe,
} from "plgg/index";

test("asErr - safe casting to Err type", () => {
  const errValue = newErr("error");
  const result1 = pipe(errValue, asErr);
  
  assert(isOk(result1));
  expect(result1.content).toBe(errValue);
  
  // Test with non-Err value
  const okValue = newOk(42);
  const result2 = pipe(okValue, asErr);
  
  assert(isErr(result2));
  expect(result2.content.message).toBe("Value is not an Err");
  
  // Test with non-Result value
  const result3 = pipe("hello", asErr);
  assert(isErr(result3));
  expect(result3.content.message).toBe("Value is not an Err");
  
  // Test with null/undefined
  const result4 = pipe(null, asErr);
  assert(isErr(result4));
  expect(result4.content.message).toBe("Value is not an Err");
  
  const result5 = pipe(undefined, asErr);
  assert(isErr(result5));
  expect(result5.content.message).toBe("Value is not an Err");
});
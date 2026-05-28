import { test, expect } from "vitest";
import { isOk, isErr } from "plgg";
import {
  isMethod,
  asMethod,
  METHODS,
} from "plgg-server/index";

test("isMethod accepts every recognized method and rejects others", () => {
  for (const m of METHODS) {
    expect(isMethod(m)).toBe(true);
  }
  expect(isMethod("TRACE")).toBe(false);
  expect(isMethod("get")).toBe(false);
  expect(isMethod(123)).toBe(false);
});

test("asMethod returns Ok for a known method", () => {
  const r = asMethod("GET");
  expect(isOk(r)).toBe(true);
  if (isOk(r)) {
    expect(r.content).toBe("GET");
  }
});

test("asMethod returns Err for an unknown method", () => {
  expect(isErr(asMethod("TRACE"))).toBe(true);
  expect(isErr(asMethod(42))).toBe(true);
});

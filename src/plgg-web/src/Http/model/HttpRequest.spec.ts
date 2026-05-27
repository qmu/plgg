import { test, expect } from "vitest";
import {
  isSome,
  isNone,
  some,
  none,
  SoftStr,
  Dict,
} from "plgg";
import {
  HttpRequest,
  getHeader,
  getQuery,
  getParam,
  getBytes,
  withParams,
} from "plgg-web/index";

const req = (
  over: Partial<HttpRequest> = {},
): HttpRequest => ({
  method: "GET",
  path: "/",
  query: {},
  headers: {},
  params: {},
  body: "",
  bytes: none(),
  ...over,
});

test("getHeader is case-insensitive and returns Option", () => {
  const r = req({ headers: { "x-token": "abc" } });
  const found = getHeader(r, "X-Token");
  expect(isSome(found)).toBe(true);
  if (isSome(found)) {
    expect(found.content).toBe("abc");
  }
  expect(isNone(getHeader(r, "absent"))).toBe(true);
});

test("getQuery returns Option", () => {
  const r = req({ query: { q: "cat" } });
  const found = getQuery(r, "q");
  expect(isSome(found)).toBe(true);
  if (isSome(found)) {
    expect(found.content).toBe("cat");
  }
  expect(isNone(getQuery(r, "z"))).toBe(true);
});

test("getParam returns Option", () => {
  const r = req({ params: { id: "7" } });
  const found = getParam(r, "id");
  expect(isSome(found)).toBe(true);
  if (isSome(found)) {
    expect(found.content).toBe("7");
  }
  expect(isNone(getParam(r, "missing"))).toBe(true);
});

test("getBytes is None for a text request and Some for a binary one", () => {
  expect(isNone(getBytes(req()))).toBe(true);
  const binary = req({
    bytes: some(new Uint8Array([1, 2, 3])),
  });
  const found = getBytes(binary);
  expect(isSome(found)).toBe(true);
  if (isSome(found)) {
    expect(Array.from(found.content)).toEqual([1, 2, 3]);
  }
});

test("withParams attaches params immutably", () => {
  const base = req();
  const params: Dict<string, SoftStr> = { id: "9" };
  const next = withParams(base, params);
  expect(next.params).toEqual({ id: "9" });
  expect(base.params).toEqual({});
});

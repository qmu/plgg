import { test, expect } from "vitest";
import { parseQuery } from "plgg-router/Routing/usecase/parseQuery";

test("empty search yields an empty dict", () => {
  expect(parseQuery("")).toEqual({});
  expect(parseQuery("?")).toEqual({});
});

test("a single pair, with or without the leading ?", () => {
  expect(parseQuery("?q=plgg")).toEqual({ q: "plgg" });
  expect(parseQuery("q=plgg")).toEqual({ q: "plgg" });
});

test("multiple pairs", () => {
  expect(parseQuery("?a=1&b=2")).toEqual({
    a: "1",
    b: "2",
  });
});

test("a key with no value maps to the empty string", () => {
  expect(parseQuery("?flag")).toEqual({ flag: "" });
});

test("percent-decodes both keys and values", () => {
  expect(parseQuery("?q=a%20b&na%6De=x")).toEqual({
    q: "a b",
    name: "x",
  });
});

test("malformed percent-encoding falls back to the raw token", () => {
  expect(parseQuery("?v=%E0%A4%A")).toEqual({
    v: "%E0%A4%A",
  });
});

test("drops empty pairs from doubled separators", () => {
  expect(parseQuery("?a=1&&b=2")).toEqual({
    a: "1",
    b: "2",
  });
});

test("a later duplicate key wins", () => {
  expect(parseQuery("?a=1&a=2")).toEqual({ a: "2" });
});

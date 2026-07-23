import {
  test,
  check,
  all,
  toEqual,
} from "plgg-test";
import { parseQuery } from "plgg-router/Routing/usecase/parseQuery";

test("empty search yields an empty dict", () =>
  all([
    check(parseQuery(""), toEqual({})),
    check(parseQuery("?"), toEqual({})),
  ]));

test("a single pair, with or without the leading ?", () =>
  all([
    check(
      parseQuery("?q=plgg"),
      toEqual({ q: "plgg" }),
    ),
    check(
      parseQuery("q=plgg"),
      toEqual({ q: "plgg" }),
    ),
  ]));

test("multiple pairs", () =>
  check(
    parseQuery("?a=1&b=2"),
    toEqual({
      a: "1",
      b: "2",
    }),
  ));

test("a key with no value maps to the empty string", () =>
  check(
    parseQuery("?flag"),
    toEqual({ flag: "" }),
  ));

test("percent-decodes both keys and values", () =>
  check(
    parseQuery("?q=a%20b&na%6De=x"),
    toEqual({
      q: "a b",
      name: "x",
    }),
  ));

test("malformed percent-encoding falls back to the raw token", () =>
  check(
    parseQuery("?v=%E0%A4%A"),
    toEqual({
      v: "%E0%A4%A",
    }),
  ));

test("drops empty pairs from doubled separators", () =>
  check(
    parseQuery("?a=1&&b=2"),
    toEqual({
      a: "1",
      b: "2",
    }),
  ));

test("a later duplicate key wins", () =>
  check(
    parseQuery("?a=1&a=2"),
    toEqual({ a: "2" }),
  ));

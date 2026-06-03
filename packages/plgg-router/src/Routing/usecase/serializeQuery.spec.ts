import { test, expect } from "vitest";
import { parseQuery } from "plgg-router/Routing/usecase/parseQuery";
import { serializeQuery } from "plgg-router/Routing/usecase/serializeQuery";

test("an empty dict serializes to the empty string", () => {
  expect(serializeQuery({})).toBe("");
});

test("serializes sorted, percent-encoded pairs with a leading ?", () => {
  expect(serializeQuery({ b: "2", a: "1" })).toBe(
    "?a=1&b=2",
  );
});

test("drops empty-valued entries", () => {
  expect(
    serializeQuery({ a: "1", flag: "" }),
  ).toBe("?a=1");
});

test("percent-encodes keys and values", () => {
  expect(serializeQuery({ "na me": "a b" })).toBe(
    "?na%20me=a%20b",
  );
});

test("round-trips with parseQuery for non-empty values", () => {
  const dict = {
    q: "a b",
    page: "2",
    tag: "x,y",
  };
  expect(
    parseQuery(serializeQuery(dict)),
  ).toEqual(dict);
});

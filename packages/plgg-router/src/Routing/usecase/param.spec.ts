import { test, expect } from "vitest";
import { isNone, getOr, pipe } from "plgg";
import { makeLocation } from "plgg-router/Routing/model/Location";
import {
  param,
  query,
} from "plgg-router/Routing/usecase/param";

test("param reads a present path parameter", () => {
  const loc = makeLocation("/u/1", { id: "1" });
  expect(pipe(loc, param("id"), getOr("none"))).toBe(
    "1",
  );
});

test("param of a missing key is none", () => {
  expect(
    isNone(pipe(makeLocation("/"), param("id"))),
  ).toBe(true);
});

test("query reads a present query parameter", () => {
  const loc = makeLocation("/s", {}, { q: "plgg" });
  expect(pipe(loc, query("q"), getOr("none"))).toBe(
    "plgg",
  );
});

test("query of a missing key is none", () => {
  expect(
    isNone(pipe(makeLocation("/"), query("q"))),
  ).toBe(true);
});

import { test, check, toEqual } from "plgg-test";
import { makeLocation } from "plgg-router/Routing/model/Location";

test("makeLocation defaults params and query to empty", () =>
  check(
    makeLocation("/"),
    toEqual({
      path: "/",
      params: {},
      query: {},
    }),
  ));

test("makeLocation keeps explicit params and query", () =>
  check(
    makeLocation("/u/1", { id: "1" }, { q: "x" }),
    toEqual({
      path: "/u/1",
      params: { id: "1" },
      query: { q: "x" },
    }),
  ));

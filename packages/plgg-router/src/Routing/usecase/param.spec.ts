import {
  test,
  check,
  all,
  toBe,
  shouldBeNone,
} from "plgg-test";
import { getOr, pipe } from "plgg";
import { makeLocation } from "plgg-router/Routing/model/Location";
import {
  param,
  query,
} from "plgg-router/Routing/usecase/param";

test("param reads a present path parameter", () => {
  const loc = makeLocation("/u/1", { id: "1" });
  return check(
    pipe(loc, param("id"), getOr("none")),
    toBe("1"),
  );
});

test("param of a missing key is none", () =>
  check(
    pipe(makeLocation("/"), param("id")),
    shouldBeNone(),
  ));

test("query reads a present query parameter", () => {
  const loc = makeLocation(
    "/s",
    {},
    { q: "plgg" },
  );
  return check(
    pipe(loc, query("q"), getOr("none")),
    toBe("plgg"),
  );
});

test("query of a missing key is none", () =>
  check(
    pipe(makeLocation("/"), query("q")),
    shouldBeNone(),
  ));

test("inherited Object.prototype keys are not spurious Somes", () => {
  const loc = makeLocation("/s", {}, {});
  return all([
    check(
      pipe(loc, query("constructor")),
      shouldBeNone(),
    ),
    check(
      pipe(loc, param("__proto__")),
      shouldBeNone(),
    ),
    check(
      pipe(loc, query("toString")),
      shouldBeNone(),
    ),
  ]);
});

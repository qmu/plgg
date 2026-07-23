import {
  test,
  check,
  all,
  toBe,
  toEqual,
  someThen,
  shouldBeNone,
} from "plgg-test";
import { some, none, SoftStr, Dict } from "plgg";
import {
  HttpRequest,
  getHeader,
  getQuery,
  getParam,
  getBytes,
  withParams,
} from "plgg-http/index";

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
  const r = req({
    headers: { "x-token": "abc" },
  });
  return all([
    check(
      getHeader(r, "X-Token"),
      someThen((v) => toBe("abc")(v)),
    ),
    check(getHeader(r, "absent"), shouldBeNone()),
  ]);
});

test("inherited Object.prototype keys are not spurious Somes", () => {
  const r = req();
  return all([
    check(
      getQuery(r, "constructor"),
      shouldBeNone(),
    ),
    check(
      getQuery(r, "__proto__"),
      shouldBeNone(),
    ),
    check(
      getHeader(r, "toString"),
      shouldBeNone(),
    ),
    check(
      getParam(r, "hasOwnProperty"),
      shouldBeNone(),
    ),
  ]);
});

test("getQuery returns Option", () => {
  const r = req({ query: { q: "cat" } });
  return all([
    check(
      getQuery(r, "q"),
      someThen((v) => toBe("cat")(v)),
    ),
    check(getQuery(r, "z"), shouldBeNone()),
  ]);
});

test("getParam returns Option", () => {
  const r = req({ params: { id: "7" } });
  return all([
    check(
      getParam(r, "id"),
      someThen((v) => toBe("7")(v)),
    ),
    check(getParam(r, "missing"), shouldBeNone()),
  ]);
});

test("getBytes is None for a text request and Some for a binary one", () => {
  const binary = req({
    bytes: some(new Uint8Array([1, 2, 3])),
  });
  return all([
    check(getBytes(req()), shouldBeNone()),
    check(
      getBytes(binary),
      someThen((v) =>
        toEqual([1, 2, 3])(Array.from(v)),
      ),
    ),
  ]);
});

test("withParams attaches params immutably", () => {
  const base = req();
  const params: Dict<string, SoftStr> = {
    id: "9",
  };
  const next = withParams(base, params);
  return all([
    check(next.params, toEqual({ id: "9" })),
    check(base.params, toEqual({})),
  ]);
});

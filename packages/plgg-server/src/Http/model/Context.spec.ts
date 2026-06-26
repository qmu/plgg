import {
  test,
  check,
  all,
  toBe,
  toEqual,
  someThen,
} from "plgg-test";
import { pipe, isSome, isNone, none } from "plgg";
import {
  makeContext,
  param,
  query,
  header,
  getState,
  setState,
  textResponse,
  htmlResponse,
  jsonResponse,
  redirectResponse,
  HttpRequest,
} from "plgg-server/index";

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

test("param/query/header are standalone Option lookups over the context", () => {
  const c = makeContext(
    req({
      params: { id: "7" },
      query: { q: "x" },
      headers: { "x-a": "b" },
    }),
  );
  const id = pipe(c, param("id"));
  const q = pipe(c, query("q"));
  const h = pipe(c, header("x-a"));
  return all([
    check(
      isSome(id) && id.content === "7",
      toBe(true),
    ),
    check(
      isSome(q) && q.content === "x",
      toBe(true),
    ),
    check(
      isSome(h) && h.content === "b",
      toBe(true),
    ),
    check(
      isNone(pipe(c, param("nope"))),
      toBe(true),
    ),
  ]);
});

test("state bag is immutable: setState returns a new context", () => {
  const c = makeContext(req());
  const a1 = check(
    isNone(pipe(c, getState("user"))),
    toBe(true),
  );
  const c2 = pipe(c, setState("user", { id: 1 }));
  // original is untouched
  const a2 = check(
    isNone(pipe(c, getState("user"))),
    toBe(true),
  );
  const got = pipe(c2, getState("user"));
  return all([
    a1,
    a2,
    check(
      got,
      someThen((v) =>
        check(v, toEqual({ id: 1 })),
      ),
    ),
  ]);
});

test("response builders are standalone HttpResponse constructors", () =>
  all([
    check(
      jsonResponse({ ok: true }).body,
      toBe('{"ok":true}'),
    ),
    check(
      textResponse("hi").status.content,
      toBe(200),
    ),
    check(
      htmlResponse("<b/>", 201).headers[
        "content-type"
      ],
      toBe("text/html; charset=utf-8"),
    ),
    check(
      redirectResponse("/login").status.content,
      toBe(302),
    ),
  ]));

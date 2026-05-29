import { test, expect } from "vitest";
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
  expect(isSome(id) && id.content === "7").toBe(true);
  const q = pipe(c, query("q"));
  expect(isSome(q) && q.content === "x").toBe(true);
  const h = pipe(c, header("x-a"));
  expect(isSome(h) && h.content === "b").toBe(true);
  expect(isNone(pipe(c, param("nope")))).toBe(true);
});

test("state bag is immutable: setState returns a new context", () => {
  const c = makeContext(req());
  expect(isNone(pipe(c, getState("user")))).toBe(true);

  const c2 = pipe(c, setState("user", { id: 1 }));
  // original is untouched
  expect(isNone(pipe(c, getState("user")))).toBe(true);

  const got = pipe(c2, getState("user"));
  expect(isSome(got)).toBe(true);
  if (isSome(got)) {
    expect(got.content).toEqual({ id: 1 });
  }
});

test("response builders are standalone HttpResponse constructors", () => {
  expect(jsonResponse({ ok: true }).body).toBe(
    '{"ok":true}',
  );
  expect(textResponse("hi").status.content).toBe(200);
  expect(
    htmlResponse("<b/>", 201).headers["content-type"],
  ).toBe("text/html; charset=utf-8");
  expect(
    redirectResponse("/login").status.content,
  ).toBe(302);
});

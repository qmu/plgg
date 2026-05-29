import { test, expect } from "vitest";
import {
  isSome,
  isNone,
  box,
  pipe,
  getOr,
  mapOption,
} from "plgg";
import { VNode } from "plgg-view";
import {
  router,
  get,
} from "plgg-router/Routing/model/Router";
import { makeLocation } from "plgg-router/Routing/model/Location";
import { resolve } from "plgg-router/Routing/usecase/resolve";
import { param } from "plgg-router/Routing/usecase/param";

const view = (t: string): VNode =>
  box("Text")({ value: t });

const text = (node: VNode): string =>
  node.__tag === "Text" ? node.content.value : "";

const rendered = (
  r: ReturnType<typeof resolve>,
): string => pipe(r, mapOption(text), getOr("?"));

test("resolves the matching route to its VNode", () => {
  const app = pipe(
    router(),
    get("/", () => view("home")),
    get("/about", () => view("about")),
  );
  const r = resolve(app, makeLocation("/about"));
  expect(isSome(r)).toBe(true);
  expect(rendered(r)).toBe("about");
});

test("returns none when nothing matches", () => {
  const app = pipe(
    router(),
    get("/", () => view("home")),
  );
  expect(
    isNone(resolve(app, makeLocation("/missing"))),
  ).toBe(true);
});

test("the first registered match wins", () => {
  const app = pipe(
    router(),
    get("/users/:id", () => view("first")),
    get("/users/:id", () => view("second")),
  );
  expect(
    rendered(resolve(app, makeLocation("/users/1"))),
  ).toBe("first");
});

test("folds captured params into the location for the handler", () => {
  const app = pipe(
    router(),
    get("/users/:id", (loc) =>
      view(pipe(loc, param("id"), getOr("none"))),
    ),
  );
  expect(
    rendered(resolve(app, makeLocation("/users/42"))),
  ).toBe("42");
});

test("a wildcard route exposes the remainder as a param", () => {
  const app = pipe(
    router(),
    get("/files/*rest", (loc) =>
      view(pipe(loc, param("rest"), getOr("none"))),
    ),
  );
  expect(
    rendered(
      resolve(app, makeLocation("/files/a/b/c")),
    ),
  ).toBe("a/b/c");
});

test("preexisting location params are preserved alongside captures", () => {
  const app = pipe(
    router(),
    get("/users/:id", (loc) =>
      view(JSON.stringify(loc.params)),
    ),
  );
  const out = rendered(
    resolve(
      app,
      makeLocation("/users/9", { kept: "yes" }),
    ),
  );
  expect(out).toContain('"id":"9"');
  expect(out).toContain('"kept":"yes"');
});

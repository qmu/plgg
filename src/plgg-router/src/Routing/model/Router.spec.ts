import { test, expect } from "vitest";
import { pipe, box } from "plgg";
import { VNode } from "plgg-view";
import {
  router,
  on,
  get,
  route,
} from "plgg-router/Routing/model/Router";

const view = (t: string): VNode =>
  box("Text")({ value: t });

test("router() seeds an empty route table", () => {
  expect(router()).toEqual({ routes: [] });
});

test("get and on append routes in registration order", () => {
  const app = pipe(
    router(),
    get("/", () => view("home")),
    on("/about", () => view("about")),
  );
  expect(app.routes.map((r) => r.pattern)).toEqual([
    "/",
    "/about",
  ]);
});

test("route mounts a sub-router under a prefix, recompiling segments", () => {
  const sub = pipe(
    router(),
    get("/dashboard", () => view("d")),
    get("/users/:id", () => view("u")),
  );
  const app = pipe(
    router(),
    get("/", () => view("home")),
    route("/admin", sub),
  );
  expect(app.routes.map((r) => r.pattern)).toEqual([
    "/",
    "/admin/dashboard",
    "/admin/users/:id",
  ]);
  expect(app.routes[2]?.segments).toEqual([
    { __tag: "Static", content: "admin" },
    { __tag: "Static", content: "users" },
    { __tag: "Param", content: "id" },
  ]);
});

test("route normalizes a slashless base path", () => {
  const sub = pipe(
    router(),
    get("/list", () => view("list")),
  );
  const app = pipe(
    router(),
    route("api", sub),
  );
  expect(app.routes[0]?.pattern).toBe("/api/list");
});

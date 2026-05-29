// @vitest-environment happy-dom
import { test, expect } from "vitest";
import {
  isOk,
  isNone,
  pipe,
  getOr,
  mapOption,
} from "plgg";
import { renderToString } from "plgg-server";
import { resolve, makeLocation } from "plgg-router";
import {
  buildClientRouter,
  notFoundView,
} from "./clientRouter";
import { Todo, asTodos } from "./models/Todo";

const RAW = [
  {
    id: "t1",
    title: "Wire the pipeline",
    completed: true,
    createdAt: "2026-05-26T09:00:00Z",
    completedAt: "2026-05-27T18:30:00Z",
  },
  {
    id: "t2",
    title: "Ship the demo",
    completed: false,
    createdAt: "2026-05-28T09:00:00Z",
  },
];

const decoded = asTodos(RAW);
const todos: ReadonlyArray<Todo> = isOk(decoded)
  ? decoded.content
  : [];

// The router reads the live list through the getter; here it is fixed.
const appRouter = buildClientRouter(() => todos);

const htmlAt = (path: string): string =>
  pipe(
    resolve(appRouter, makeLocation(path)),
    mapOption(renderToString),
    getOr(renderToString(notFoundView)),
  );

test("resolves / to the list view", () => {
  const html = htmlAt("/");
  expect(html).toContain("plgg To-Do");
  expect(html).toContain("Wire the pipeline");
  expect(html).toContain("Ship the demo");
});

test("resolves /todos/:id to the detail view for that todo and sets document.title", () => {
  const html = htmlAt("/todos/t1");
  expect(html).toContain("Wire the pipeline");
  expect(html).toContain("Completed");
  expect(document.title).toContain(
    "Wire the pipeline",
  );
});

test("resolves /todos/:id with an unknown id to the not-found view", () => {
  const html = htmlAt("/todos/zzz");
  expect(html).toContain("Not found");
  expect(document.title).toContain("Not found");
});

test("an unmatched path resolves to none (host renders notFound)", () => {
  expect(
    isNone(
      resolve(appRouter, makeLocation("/nope/deep")),
    ),
  ).toBe(true);
});

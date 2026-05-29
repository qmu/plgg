import { test, expect } from "vitest";
import { box } from "plgg";
import { VNode } from "plgg-view";
import { makeRoute } from "plgg-router/Routing/model/Route";

const view = (t: string): VNode =>
  box("Text")({ value: t });

test("makeRoute compiles its pattern into segments", () => {
  const handler = () => view("x");
  const r = makeRoute("/users/:id", handler);
  expect(r.pattern).toBe("/users/:id");
  expect(r.segments).toEqual([
    { __tag: "Static", content: "users" },
    { __tag: "Param", content: "id" },
  ]);
  expect(r.handler).toBe(handler);
});

test("makeRoute of the root has no segments", () => {
  expect(makeRoute("/", () => view("home")).segments).toEqual(
    [],
  );
});

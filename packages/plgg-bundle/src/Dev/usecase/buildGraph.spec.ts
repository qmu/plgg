import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { buildGraph } from "plgg-bundle/Dev/usecase/buildGraph";

test("buildGraph folds edges into a file → imports map", () => {
  const graph = buildGraph([
    { from: "/a.ts", to: "/b.ts" },
    { from: "/a.ts", to: "/c.ts" },
    { from: "/b.ts", to: "/c.ts" },
  ]);
  return all([
    check(graph.size, toBe(2)),
    check(
      graph.get("/a.ts"),
      toEqual(["/b.ts", "/c.ts"]),
    ),
    check(
      graph.get("/b.ts"),
      toEqual(["/c.ts"]),
    ),
  ]);
});

test("buildGraph yields an empty graph for no edges", () =>
  check(buildGraph([]).size, toBe(0)));

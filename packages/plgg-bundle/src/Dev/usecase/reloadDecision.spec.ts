import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { buildGraph } from "plgg-bundle/Dev/usecase/buildGraph";
import { shouldReload } from "plgg-bundle/Dev/usecase/reloadDecision";

const graph = buildGraph([
  { from: "/a.ts", to: "/b.ts" },
]);

test("shouldReload is true for a file that imports (graph key)", () =>
  check(
    shouldReload(graph, "/a.ts"),
    toBe(true),
  ));

test("shouldReload is true for an imported file (graph value)", () =>
  check(
    shouldReload(graph, "/b.ts"),
    toBe(true),
  ));

test("shouldReload is false for a file outside the served graph", () =>
  check(
    shouldReload(graph, "/unrelated.ts"),
    toBe(false),
  ));

test("shouldReload falls back to true for an empty graph", () =>
  all([
    check(
      shouldReload(buildGraph([]), "/x.ts"),
      toBe(true),
    ),
  ]));

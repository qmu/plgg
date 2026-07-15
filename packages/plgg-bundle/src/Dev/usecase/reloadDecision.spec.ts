import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { buildGraph } from "plgg-bundle/Dev/usecase/buildGraph";
import {
  shouldReload,
  isBuildOutput,
} from "plgg-bundle/Dev/usecase/reloadDecision";

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

test("shouldReload is false for a source file outside the served graph", () =>
  check(
    shouldReload(graph, "/unrelated.ts"),
    toBe(false),
  ));

test("shouldReload is true for a content (non-code) file edit", () =>
  all([
    check(
      shouldReload(graph, "/docs/guide.md"),
      toBe(true),
    ),
    check(
      shouldReload(graph, "/assets/x.css"),
      toBe(true),
    ),
  ]));

test("shouldReload falls back to true for an empty graph", () =>
  all([
    check(
      shouldReload(buildGraph([]), "/x.ts"),
      toBe(true),
    ),
  ]));

// The app's own build output must never trigger a reload.
// node's recursive watch has no exclusion, so a watch root
// containing outDir (the plggpress guide authors at its
// package root, dist/ included) watches the build — and
// output is not source code, which shouldReload's first
// rule would otherwise treat as always-reload content.

test("build output is recognised under outDir", () =>
  all([
    check(
      isBuildOutput(
        "/app/g/dist",
        "/app/g/dist/index.html",
      ),
      toBe(true),
    ),
    check(
      isBuildOutput(
        "/app/g/dist",
        "/app/g/dist/a/b/i.html",
      ),
      toBe(true),
    ),
    check(
      isBuildOutput("/app/g/dist", "/app/g/dist"),
      toBe(true),
    ),
  ]));

test("a sibling that merely shares outDir's prefix is not output", () =>
  all([
    // `/app/g/dist-notes` must not be swallowed by
    // `/app/g/dist` — a prefix test without the separator
    // would silently stop reloading a real content dir.
    check(
      isBuildOutput(
        "/app/g/dist",
        "/app/g/dist-notes/x.md",
      ),
      toBe(false),
    ),
    check(
      isBuildOutput(
        "/app/g/dist",
        "/app/g/index.md",
      ),
      toBe(false),
    ),
  ]));

import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { buildGraph } from "plgg-bundle/Dev/usecase/buildGraph";
import { transitiveImporters } from "plgg-bundle/Dev/usecase/invalidate";

/** A imports B; editing B must re-evaluate A (and B). */
test("transitiveImporters: A imports B ⇒ invalidate(B) = {A, B}", () => {
  const graph = buildGraph([
    { from: "/a.ts", to: "/b.ts" },
  ]);
  const set = transitiveImporters(
    graph,
    "/b.ts",
  );
  return all([
    check(set.has("/a.ts"), toBe(true)),
    check(set.has("/b.ts"), toBe(true)),
    check(set.size, toBe(2)),
  ]);
});

/** Deep chain A→B→C: editing C invalidates the whole chain. */
test("transitiveImporters walks a transitive chain A→B→C", () => {
  const graph = buildGraph([
    { from: "/a.ts", to: "/b.ts" },
    { from: "/b.ts", to: "/c.ts" },
  ]);
  const set = transitiveImporters(
    graph,
    "/c.ts",
  );
  return all([
    check(set.has("/a.ts"), toBe(true)),
    check(set.has("/b.ts"), toBe(true)),
    check(set.has("/c.ts"), toBe(true)),
    check(set.size, toBe(3)),
  ]);
});

/** A leaf's editor invalidates only itself. */
test("transitiveImporters of a root importer is just itself", () => {
  const graph = buildGraph([
    { from: "/a.ts", to: "/b.ts" },
  ]);
  const set = transitiveImporters(
    graph,
    "/a.ts",
  );
  return all([
    check(set.has("/a.ts"), toBe(true)),
    check(set.size, toBe(1)),
  ]);
});

/** Two importers of one leaf: editing C invalidates both A and B. */
test("transitiveImporters collects multiple importers of one file", () => {
  const graph = buildGraph([
    { from: "/a.ts", to: "/c.ts" },
    { from: "/b.ts", to: "/c.ts" },
  ]);
  const set = transitiveImporters(
    graph,
    "/c.ts",
  );
  return all([
    check(set.has("/a.ts"), toBe(true)),
    check(set.has("/b.ts"), toBe(true)),
    check(set.has("/c.ts"), toBe(true)),
    check(set.size, toBe(3)),
  ]);
});

/** A cycle (A↔B) terminates and includes both. */
test("transitiveImporters is cycle-safe", () => {
  const graph = buildGraph([
    { from: "/a.ts", to: "/b.ts" },
    { from: "/b.ts", to: "/a.ts" },
  ]);
  const set = transitiveImporters(
    graph,
    "/a.ts",
  );
  return check(set.size, toBe(2));
});

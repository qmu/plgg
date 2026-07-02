import { type ModuleGraph } from "plgg-bundle/Dev/model/ModuleGraph";

/**
 * The invalidation set for a changed file: the file itself
 * plus every module that transitively imports it (its
 * reverse-reachable closure in the {@link ModuleGraph}).
 * These are exactly the modules a cache-busted re-import
 * must re-evaluate for the edit to take effect — a change
 * to a deep leaf `B` invalidates every `A` that imports it
 * (directly or through a chain).
 *
 * Pure graph walk over reversed edges; cycle-safe via the
 * visited set. This is the "transitive invalidation" the
 * ticket flags as the hard part, isolated here as testable
 * logic (A imports B; invalidate(B) ⊇ {A, B}).
 */
export const transitiveImporters = (
  graph: ModuleGraph,
  changed: string,
): ReadonlySet<string> => {
  const importers = reverseEdges(graph);
  const seen = new Set<string>([changed]);
  // Breadth-first by layers: `for...of` over each frontier
  // yields a `string` directly (no indexed access, no
  // `.shift()` undefined case), keeping the walk `as`-free.
  let frontier: ReadonlyArray<string> = [changed];
  while (frontier.length > 0) {
    const next: Array<string> = [];
    for (const node of frontier) {
      for (const importer of importers.get(
        node,
      ) ?? []) {
        if (!seen.has(importer)) {
          seen.add(importer);
          next.push(importer);
        }
      }
    }
    frontier = next;
  }
  return seen;
};

/**
 * Invert the graph: for each `from → to` forward edge,
 * record `to → from` so a lookup answers "who imports
 * this file". Local helper for {@link transitiveImporters}.
 */
const reverseEdges = (
  graph: ModuleGraph,
): ReadonlyMap<string, ReadonlyArray<string>> => {
  const reversed = new Map<
    string,
    Array<string>
  >();
  for (const [from, tos] of graph) {
    for (const to of tos) {
      const existing = reversed.get(to);
      if (existing === undefined) {
        reversed.set(to, [from]);
      } else {
        existing.push(from);
      }
    }
  }
  return reversed;
};

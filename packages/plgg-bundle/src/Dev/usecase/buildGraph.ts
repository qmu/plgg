import {
  type Edge,
  type ModuleGraph,
} from "plgg-bundle/Dev/model/ModuleGraph";

/**
 * Fold a flat list of resolved import {@link Edge}s into a
 * {@link ModuleGraph} (file → the local files it imports).
 * Pure: the adapter does the effectful scan+resolve and
 * hands the edges here. A file that imports nothing local
 * still appears as a node (empty array) as soon as it is
 * an edge's `from`, so the reload decision can tell "known
 * module" from "unrelated file".
 */
export const buildGraph = (
  edges: ReadonlyArray<Edge>,
): ModuleGraph => {
  const graph = new Map<
    string,
    Array<string>
  >();
  for (const { from, to } of edges) {
    const existing = graph.get(from);
    if (existing === undefined) {
      graph.set(from, [to]);
    } else {
      existing.push(to);
    }
  }
  return graph;
};

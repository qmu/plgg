import { type ModuleGraph } from "plgg-bundle/Dev/model/ModuleGraph";

/**
 * Whether a changed file warrants a hot-reload: true when
 * the file participates in the app's served
 * {@link ModuleGraph} — either it imports something local
 * (a graph key) or something local imports it (a graph
 * value). A save to a file under the watch roots that the
 * app never imports (a stray scratch file, an unreferenced
 * asset sibling) is ignored, so the browser only reloads
 * on edits that can actually change the output.
 *
 * Conservative fallback: an EMPTY graph means the scan
 * could not map the app (e.g. the entry failed to read),
 * so every change reloads rather than silently going
 * stale. Pure decision over the graph — the adapter owns
 * the fs.
 */
export const shouldReload = (
  graph: ModuleGraph,
  changed: string,
): boolean =>
  graph.size === 0 ||
  graph.has(changed) ||
  importsSomewhere(graph, changed);

/**
 * Whether any node in the graph imports `changed` (i.e. it
 * appears as an edge target). Local scan over the forward
 * edges — the reverse lookup is only needed once per
 * decision, so it is not memoised.
 */
const importsSomewhere = (
  graph: ModuleGraph,
  changed: string,
): boolean => {
  for (const tos of graph.values()) {
    if (tos.includes(changed)) {
      return true;
    }
  }
  return false;
};

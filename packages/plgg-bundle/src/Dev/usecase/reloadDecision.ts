import { type ModuleGraph } from "plgg-bundle/Dev/model/ModuleGraph";

/**
 * Source-code extensions — the files the module graph
 * tracks. A changed file with any OTHER extension is
 * content (Markdown, an asset) whose edit the app re-reads
 * at render time, so it always warrants a reload.
 */
const SOURCE_EXT: ReadonlyArray<string> = [
  ".ts",
  ".tsx",
  ".mts",
  ".js",
  ".mjs",
];

/**
 * Whether a changed file warrants a hot-reload:
 *
 *  - content (non-source-code, e.g. `.md`) → always, since
 *    the render re-reads it;
 *  - source code that participates in the app's served
 *    {@link ModuleGraph} (a graph key it imports from, or a
 *    graph value something imports) → yes;
 *  - source code the app never imports (a stray scratch
 *    `.ts`) → ignored, so the browser only reloads on edits
 *    that can change the output.
 *
 * Conservative fallback: an EMPTY graph means the scan
 * could not map the app, so every change reloads rather
 * than silently going stale. Pure decision over the graph —
 * the adapter owns the fs.
 */
export const shouldReload = (
  graph: ModuleGraph,
  changed: string,
): boolean =>
  !isSourceCode(changed) ||
  graph.size === 0 ||
  graph.has(changed) ||
  importsSomewhere(graph, changed);

/** Whether a path is a tracked source-code file (by extension). */
const isSourceCode = (
  changed: string,
): boolean =>
  SOURCE_EXT.some((e) => changed.endsWith(e));

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

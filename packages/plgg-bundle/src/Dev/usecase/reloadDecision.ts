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
const isSourceCode = (changed: string): boolean =>
  SOURCE_EXT.some((e) => changed.endsWith(e));

/**
 * Whether `changed` is the app's own build OUTPUT, which
 * must never trigger a reload.
 *
 * node's recursive watch has no exclusion, so a watch root
 * that CONTAINS `outDir` — the plggpress guide authors at
 * its package root, and `dist/` is right there — is
 * watching the build. Output is `.html`/`.css`/assets, i.e.
 * not source code, and {@link shouldReload}'s first rule
 * says content always reloads. Nothing DOWNSTREAM can tell
 * the difference — by then it is just a changed `.html`.
 *
 * MEASURED, so the claim stays honest: a `plggpress build`
 * writing 39 pages cost the guide's container **2** wasted
 * reloads, not 39 — the watcher's 80ms debounce already
 * collapses the burst. This removes those two; it is a
 * correctness tidy (the browser reloads only for edits that
 * can change what it shows), not a rescue from a storm.
 *
 * Both paths are absolute and already normalized by the
 * caller (the adapter owns `node:path`); the separator is
 * compared literally, which is exactly what the caller's
 * `resolve` produces.
 */
export const isBuildOutput = (
  outDirAbs: string,
  changed: string,
): boolean =>
  changed === outDirAbs ||
  changed.startsWith(`${outDirAbs}/`);

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

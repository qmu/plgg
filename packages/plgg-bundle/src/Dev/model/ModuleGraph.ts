/**
 * The dev server's view of the app's local module graph:
 * a map from each source file (absolute path) to the
 * absolute paths of the local files it imports. Only
 * workspace-local edges are recorded — `node:*` and
 * `node_modules` specifiers are not part of the watched
 * graph (they do not change during a dev session).
 *
 * Built fresh from disk on each change by the node adapter
 * (scan → resolve), then consumed by the pure
 * {@link transitiveImporters} / reload-decision logic. The
 * graph is what lets the server ignore a save to a file
 * the app does not import, and report exactly which
 * modules a change invalidates.
 */
export type ModuleGraph = ReadonlyMap<
  string,
  ReadonlyArray<string>
>;

/**
 * One resolved import edge: `from` imports `to` (both
 * absolute paths). The adapter produces these by scanning
 * a file's import specifiers and resolving the local ones;
 * {@link buildGraph} folds them into a {@link ModuleGraph}.
 */
export type Edge = Readonly<{
  from: string;
  to: string;
}>;

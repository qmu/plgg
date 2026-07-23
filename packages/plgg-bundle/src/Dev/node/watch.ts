import {
  watch,
  type FSWatcher,
} from "plgg-bundle/vendors/nodeFs";

// The fs.watch seam: a debounced, recursive watcher over
// several source roots. One save can emit multiple events,
// so an imperative timer coalesces them onto a single
// `onChange(path)`. Kept in `Dev/node/` (effectful,
// excluded from the coverage threshold) — the pure reload
// decision it feeds is unit-tested separately.

/** fs.watch debounce window in ms. */
const DEBOUNCE_MS = 80;

/**
 * Watch each root recursively; coalesce bursts onto a
 * single `onChange` carrying the last changed filename.
 * Returns the watchers so the caller owns their lifecycle.
 * A root that cannot be watched is skipped rather than
 * crashing the dev loop.
 *
 * A watcher that FAILS LATER is survived too, and that is
 * not theoretical: node's recursive watch walks everything
 * under a root — it has no exclusion — so a root that
 * contains the app's own `dist` is watching build output.
 * When something rebuilds (a `plggpress build` on the host
 * against a bind-mounted tree, say), a directory vanishes
 * under the watcher and it `scandir`s a path that is gone:
 *
 *   ENOENT: scandir '/app/packages/guide/dist/packages'
 *     at #watchFolder (node:internal/fs/recursive_watch)
 *
 * That arrives as an `error` EVENT, which the `try` below
 * cannot catch — and an unhandled `error` on an
 * EventEmitter kills the process. It killed the guide's dev
 * container twice, silently, for hours. A disappearing
 * directory is NORMAL in dev, so it must cost at most the
 * events from that root, never the server.
 */
export const watchRoots = (
  roots: ReadonlyArray<string>,
  onChange: (filename: string) => void,
): ReadonlyArray<FSWatcher> => {
  // Debounce seam: one shared timer + the latest filename
  // across all roots.
  let pending:
    ReturnType<typeof setTimeout> | undefined;
  let latest = "";
  const fire = (filename: string): void => {
    latest = filename;
    clearTimeout(pending);
    pending = setTimeout((): void => {
      onChange(latest);
    }, DEBOUNCE_MS);
  };
  return roots.flatMap((root) => {
    try {
      const watcher = watch(
        root,
        { recursive: true },
        (_event, filename): void => {
          if (filename !== null) {
            fire(filename);
          }
        },
      );
      // Absorb a later failure (see above): keep serving,
      // and say so rather than dying or going quiet.
      // MEASURED: the watcher survives this — after the
      // ENOENT below, edits under `root` still hot-reload —
      // so the error is one vanished subpath, NOT the end of
      // the watch. The wording must not claim otherwise.
      watcher.on("error", (e: Error): void => {
        process.stderr.write(
          `plgg-bundle dev: watch error under ${root} (${e.message}); still serving\n`,
        );
      });
      return [watcher];
    } catch {
      return [];
    }
  });
};

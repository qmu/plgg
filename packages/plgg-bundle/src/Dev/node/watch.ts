import { watch, type FSWatcher } from "node:fs";

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
 */
export const watchRoots = (
  roots: ReadonlyArray<string>,
  onChange: (filename: string) => void,
): ReadonlyArray<FSWatcher> => {
  // Debounce seam: one shared timer + the latest filename
  // across all roots.
  let pending:
    | ReturnType<typeof setTimeout>
    | undefined;
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
      return [
        watch(
          root,
          { recursive: true },
          (_event, filename): void => {
            if (filename !== null) {
              fire(filename);
            }
          },
        ),
      ];
    } catch {
      return [];
    }
  });
};

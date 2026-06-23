import { watch as fsWatch } from "node:fs";

/**
 * Watches the given roots and invokes `onChange` (debounced) whenever
 * a file changes. `fs.watch` with `recursive: true` is supported on
 * Linux in Node 20+ (the repo runs v24 / CI v22). Editors do atomic
 * saves that fire bursts of rename+change events, so a short debounce
 * coalesces them into one re-run (design §1.7).
 *
 * Watch NEVER exits the process on a failing run — it prints the
 * verdict via the run callback and keeps waiting (the daily loop must
 * survive red runs).
 */
export const watch = (
  roots: ReadonlyArray<string>,
  onChange: () => Promise<void>,
  debounceMs: number,
): (() => void) => {
  // Imperative seam: the debounce timer and the "run in flight" flag
  // are inherently stateful edge concerns. A re-run requested while
  // one is in flight is coalesced into a single trailing run.
  let timer: ReturnType<
    typeof setTimeout
  > | null = null;
  let running = false;
  let pending = false;

  const fire = (): void => {
    if (running) {
      pending = true;
      return;
    }
    running = true;
    void onChange()
      .catch(() => undefined)
      .finally(() => {
        running = false;
        if (pending) {
          pending = false;
          fire();
        }
      });
  };

  const schedule = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(
      fire,
      debounceMs,
    );
  };

  const watchers = roots.map((root) =>
    fsWatch(
      root,
      { recursive: true },
      () => schedule(),
    ),
  );

  // Returns a disposer that tears down every watcher.
  return () =>
    watchers.forEach((w) =>
      w.close(),
    );
};

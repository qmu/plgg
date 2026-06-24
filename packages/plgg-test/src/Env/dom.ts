import { readFileSync } from "node:fs";

/**
 * Per-file DOM environment seam.
 *
 * Some specs need a browser DOM (`document`/`window`/`getBoundingClient
 * Rect`) at MODULE-EVAL time — they read `window.happyDOM` or build
 * elements at the top level, before any test body runs. vitest gave them
 * this via a `// @vitest-environment happy-dom` directive; plgg-test
 * gives the same guarantee with its OWN directive
 * `// @plgg-test-environment happy-dom`, detected here and installed by
 * the Runner BEFORE it imports the spec module.
 *
 * The happy-dom import is LAZY (dynamic, only when a spec opts in), so
 * packages with no DOM specs never load it — keeping the runner light
 * for the DOM-free majority (vendor-neutrality + a small default).
 */

// The only environment we support today. A spec opts in with a
// first-lines comment `// @plgg-test-environment happy-dom`. We also
// honor the legacy `// @vitest-environment happy-dom` so a migrating
// spec needs no directive churn beyond what its U2 ticket chooses.
const DIRECTIVE =
  /\/\/\s*@(?:plgg-test|vitest)-environment\s+(\S+)/;

/**
 * Reads the requested environment name from a spec file's source, if
 * any. Pure (a single file read, no globals touched). Returns the
 * environment token (e.g. `"happy-dom"`) or `undefined` when the spec
 * declares none — i.e. it runs under plain Node.
 */
export const environmentOf = (
  file: string,
): string | undefined => {
  // Only the directive token matters; scanning the whole source keeps
  // this robust to a leading license banner above the directive.
  const match = DIRECTIVE.exec(
    readFileSync(file, "utf8"),
  );
  return match === undefined || match === null
    ? undefined
    : match[1];
};

/**
 * A teardown handle: calling it restores `globalThis` to exactly the
 * state it had before {@link installEnvironment}, so a DOM installed for
 * one file never leaks into the next (mirrors the Runner's per-file
 * `resetRegistry` isolation). Async because happy-dom must abort its
 * pending async tasks (timers, the readyState transition) before its
 * window is detached — otherwise a late task crashes on a torn-down
 * document.
 */
export type RestoreEnv = () => Promise<void>;

// A no-op teardown for the common (DOM-free) path.
const NO_RESTORE: RestoreEnv = async () =>
  undefined;

/**
 * Installs the requested environment onto `globalThis` and returns a
 * teardown. Today only `happy-dom` is known; an unknown token is a hard
 * error (a spec asked for an environment the runner cannot provide,
 * which must fail loudly, not silently run DOM-less).
 */
export const installEnvironment = async (
  environment: string | undefined,
): Promise<RestoreEnv> => {
  if (environment === undefined) {
    return NO_RESTORE;
  }
  if (environment === "happy-dom") {
    return installHappyDom();
  }
  throw new Error(
    `unknown test environment "${environment}" — plgg-test supports "happy-dom"`,
  );
};

// Copies a freshly-constructed happy-dom `GlobalWindow`'s own
// properties onto `globalThis` and returns a teardown that restores the
// prior descriptors. The happy-dom module is imported dynamically so it
// is pulled in only for DOM specs.
const installHappyDom =
  async (): Promise<RestoreEnv> => {
    const { GlobalWindow } = await import(
      "happy-dom"
    );
    const win = new GlobalWindow();
    const saved = new Map<
      string,
      PropertyDescriptor | undefined
    >();

    // `window` and `globalThis` must both point at the DOM window, and
    // every own property of the happy-dom window (document, HTMLElement,
    // matchMedia, getComputedStyle, …) is mirrored onto the global so
    // module-eval-time access resolves. We record each prior descriptor
    // to restore it exactly on teardown.
    const keys = Object.getOwnPropertyNames(win);
    keys.forEach((key) => {
      saved.set(
        key,
        Object.getOwnPropertyDescriptor(
          globalThis,
          key,
        ),
      );
      const descriptor =
        Object.getOwnPropertyDescriptor(win, key);
      if (descriptor !== undefined) {
        Object.defineProperty(
          globalThis,
          key,
          descriptor,
        );
      }
    });

    // Expose `window` itself (some specs read `window.happyDOM`).
    saved.set(
      "window",
      Object.getOwnPropertyDescriptor(
        globalThis,
        "window",
      ),
    );
    Object.defineProperty(globalThis, "window", {
      value: win,
      writable: true,
      enumerable: true,
      configurable: true,
    });

    return async () => {
      // Abort happy-dom's pending async tasks (timers, the document
      // `readyState` transition) and close the window BEFORE detaching
      // its globals, so no late task fires against a torn-down document.
      await win.happyDOM.close();
      saved.forEach((descriptor, key) => {
        if (descriptor === undefined) {
          // The key did not exist before — remove it.
          Reflect.deleteProperty(globalThis, key);
        } else {
          Object.defineProperty(
            globalThis,
            key,
            descriptor,
          );
        }
      });
    };
  };

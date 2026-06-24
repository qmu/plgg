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
 * declares none — i.e. it runs under plain Node. The directive must
 * live in the LEADING comment block (matching the "first-lines" doc):
 * we scan only the run of blank/`//`-comment lines at the top and stop
 * at the first code line, so a directive-shaped substring inside a
 * later string or comment is not a false positive.
 */
export const environmentOf = (
  file: string,
): string | undefined => {
  const match = DIRECTIVE.exec(
    leadingComments(readFileSync(file, "utf8")),
  );
  return match === null ? undefined : match[1];
};

// The contiguous block of blank and `//`-comment lines at the top of a
// source file, joined back into a string. Stops at the first line that
// is neither blank nor a line comment (i.e. the first code).
const leadingComments = (
  source: string,
): string => {
  const lines = source.split("\n");
  const end = lines.findIndex((line) => {
    const trimmed = line.trim();
    return (
      trimmed !== "" && !trimmed.startsWith("//")
    );
  });
  return (
    end === -1 ? lines : lines.slice(0, end)
  ).join("\n");
};

/**
 * A teardown handle: calling it returns `globalThis` to its prior
 * (DOM-free) shape by removing exactly the additions installed, so a DOM
 * installed for one file never leaks into the next (mirrors the Runner's
 * per-file `resetRegistry` isolation). Async because happy-dom must
 * abort its pending async tasks (timers, the readyState transition)
 * before its window is detached — otherwise a late task crashes on a
 * torn-down document.
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

// DOM globals happy-dom must OWN even though Node predefines them. Node
// 23 ships its own `Event`/`EventTarget` family; if the install left
// Node's in place, a spec's `new Event(...)` would be Node's class, which
// happy-dom dispatches (the listener fires) but never sets `.target` on —
// so `event.target` reads null and handlers see an empty value. Forcing
// happy-dom's event classes makes the dispatched event and the DOM agree.
// These are saved and restored on teardown (unlike the install-only-absent
// additions, which are deleted). Only configurable Node globals are
// overridden — a locked intrinsic is never touched.
const FORCE_INSTALL: ReadonlyArray<string> = [
  "Event",
  "CustomEvent",
  "EventTarget",
  "MessageEvent",
  "CloseEvent",
];

// Mirrors a freshly-constructed happy-dom `GlobalWindow`'s DOM
// additions onto `globalThis` and returns a teardown that removes
// exactly those additions. The happy-dom module is imported dynamically
// so it is pulled in only for DOM specs.
const installHappyDom =
  async (): Promise<RestoreEnv> => {
    const { GlobalWindow } = await import(
      "happy-dom"
    );
    // Seed the same default base URL vitest's happy-dom environment uses,
    // so `window.location`/`history` start at `http://localhost/` (path
    // "/") rather than happy-dom's bare `about:blank` — navigation and
    // History-API specs depend on a real same-origin base.
    const win = new GlobalWindow({
      url: "http://localhost/",
    });
    const added: Array<string> = [];

    // happy-dom's `GlobalWindow` carries TWO kinds of own properties:
    // the JS intrinsics it re-exposes (`Array`, `Infinity`, `globalThis`,
    // …) and the genuine DOM additions (`document`, `window`, `self`,
    // `top`, `HTMLElement`, `getComputedStyle`, …). We install ONLY keys
    // that do not already exist on the Node global — i.e. the DOM
    // additions. Skipping pre-existing keys (a) never touches a
    // non-configurable intrinsic like `Infinity` (which would throw on
    // redefine), (b) never reassigns the real `globalThis`, and (c)
    // makes teardown a clean delete of exactly what we added, with no
    // prior-descriptor bookkeeping to get wrong. `window`/`self`/`top`
    // ARE new on the Node global, so they install and point at the
    // window (a spec can read `window.happyDOM`).
    const keys = Object.getOwnPropertyNames(
      win,
    ).filter((key) => !(key in globalThis));
    keys.forEach((key) => {
      const descriptor =
        Object.getOwnPropertyDescriptor(win, key);
      if (descriptor !== undefined) {
        Object.defineProperty(
          globalThis,
          key,
          descriptor,
        );
        added.push(key);
      }
    });

    // Force happy-dom's event family over Node's predefined classes,
    // saving the prior descriptor so teardown restores Node's exactly.
    const overridden: Array<{
      key: string;
      prior: PropertyDescriptor | undefined;
    }> = [];
    FORCE_INSTALL.forEach((key) => {
      if (added.includes(key)) {
        return;
      }
      const descriptor =
        Object.getOwnPropertyDescriptor(win, key);
      if (descriptor === undefined) {
        return;
      }
      const prior =
        Object.getOwnPropertyDescriptor(
          globalThis,
          key,
        );
      if (
        prior !== undefined &&
        prior.configurable === false
      ) {
        return;
      }
      Object.defineProperty(
        globalThis,
        key,
        descriptor,
      );
      overridden.push({ key, prior });
    });

    return async () => {
      // Abort happy-dom's pending async tasks (timers, the document
      // `readyState` transition) and close the window BEFORE detaching
      // its globals, so no late task fires against a torn-down document.
      await win.happyDOM.close();
      // Remove exactly the DOM additions we installed, restoring the
      // Node global to its prior (DOM-free) shape — no leak into the
      // next file.
      added.forEach((key) => {
        Reflect.deleteProperty(globalThis, key);
      });
      // Restore Node's prior event classes (or remove if absent before).
      overridden.forEach(({ key, prior }) => {
        if (prior === undefined) {
          Reflect.deleteProperty(globalThis, key);
        } else {
          Object.defineProperty(
            globalThis,
            key,
            prior,
          );
        }
      });
    };
  };

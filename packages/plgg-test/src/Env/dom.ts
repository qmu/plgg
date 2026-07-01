import { readFileSync } from "node:fs";
import { installDom } from "./Dom/install.js";

/**
 * Per-file DOM environment seam.
 *
 * Some specs need a browser DOM (`document`/`window`/`getBoundingClient
 * Rect`) at MODULE-EVAL time — they build elements at the top level, before
 * any test body runs. A spec opts in with a first-lines directive
 * `// @plgg-test-environment dom`; the Runner detects it here and installs
 * plgg-test's OWN in-house DOM (see `./Dom/`) BEFORE it imports the spec
 * module. No third-party DOM is involved — the runner stays dependency-free
 * for the DOM-free majority and vendor-neutral for the rest.
 */

// A spec opts in with a first-lines comment `// @plgg-test-environment dom`.
const DIRECTIVE =
  /\/\/\s*@plgg-test-environment\s+(\S+)/;

/**
 * Reads the requested environment name from a spec file's source, if
 * any. Pure (a single file read, no globals touched). Returns the
 * environment token (e.g. `"dom"`) or `undefined` when the spec declares
 * none — i.e. it runs under plain Node. The directive must live in the
 * LEADING comment block (matching the "first-lines" doc): we scan only the
 * run of blank/`//`-comment lines at the top and stop at the first code
 * line, so a directive-shaped substring inside a later string or comment is
 * not a false positive.
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
 * per-file `resetRegistry` isolation). Async to match the install seam (and
 * to leave room for any future async teardown).
 */
export type RestoreEnv = () => Promise<void>;

// A no-op teardown for the common (DOM-free) path.
const NO_RESTORE: RestoreEnv = async () =>
  undefined;

// The only token that selects a DOM environment.
const DOM_TOKEN = "dom";

/**
 * Installs the requested environment onto `globalThis` and returns a
 * teardown. Only the in-house `dom` environment is known; an unknown token
 * is a hard error (a spec asked for an environment the runner cannot
 * provide, which must fail loudly, not silently run DOM-less).
 */
export const installEnvironment = async (
  environment: string | undefined,
): Promise<RestoreEnv> => {
  if (environment === undefined) {
    return NO_RESTORE;
  }
  if (environment === DOM_TOKEN) {
    return installDom();
  }
  throw new Error(
    `unknown test environment "${environment}" — plgg-test supports "dom"`,
  );
};

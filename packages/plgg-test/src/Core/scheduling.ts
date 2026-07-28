import { readFileSync } from "node:fs";

/**
 * Per-file scheduling decisions: how much of a spec file may run at
 * once, and whether it is allowed to at all.
 *
 * Tests are concurrent by default, which is safe for the overwhelming
 * majority — pure assertions over values. It is NOT safe for a suite
 * that mutates something the whole process shares, and there are exactly
 * two such shapes in this corpus:
 *
 *   - a DOM environment install (`@plgg-test-environment dom`), handled
 *     in `../Env/dom.js`;
 *   - `vi.stubGlobal` / `vi.stubEnv`, which replace a property on
 *     `globalThis` or `process.env` and restore it afterwards.
 *
 * The second is detected HERE, from the source, so the author does not
 * have to remember a directive — a suite that stubs a global is
 * scheduled serially by the runner automatically. `Mock/vi.ts` carries
 * the runtime backstop for the case this scan cannot see (a stub issued
 * from a helper module).
 */

// A spec opts out of concurrency with `// @plgg-test-concurrency 1`.
const CONCURRENCY_DIRECTIVE =
  /\/\/\s*@plgg-test-concurrency\s+(\d+)/;

// `vi.stubGlobal(...)` / `vi.stubEnv(...)`, however `vi` was destructured.
const GLOBAL_STUB =
  /\bstub(Global|Env)\s*\(/;

const sourceOf = (file: string): string => {
  // Filesystem seam: an unreadable spec is the loader's problem to
  // report, not this scan's — it simply has no directives.
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
};

/**
 * The contiguous block of blank and `//`-comment lines at the top of a
 * source file. Directives must live there, so a directive-shaped
 * substring inside a later string or comment is not a false positive.
 */
const leadingComments = (
  source: string,
): string =>
  source
    .split("\n")
    .slice(
      0,
      source
        .split("\n")
        .findIndex(
          (line) =>
            line.trim() !== "" &&
            !line.trim().startsWith("//"),
        ),
    )
    .join("\n");

/**
 * The file's declared concurrency, if it declares one. `undefined` when
 * it does not — the caller then applies the default.
 */
export const concurrencyOf = (
  file: string,
): number | undefined => {
  const match = CONCURRENCY_DIRECTIVE.exec(
    leadingComments(sourceOf(file)),
  );
  const raw = match === null ? "" : match[1];
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isInteger(n) && n > 0
    ? n
    : undefined;
};

/**
 * Whether a spec mutates process-wide state through `vi.stubGlobal` /
 * `vi.stubEnv`. Scanned over the WHOLE file, not just the leading
 * comments — this is a fact about the code, not a declaration, and the
 * author is not being asked to restate it.
 *
 * Deliberately conservative: a mention in a comment or a string also
 * counts. The cost of a false positive is that one file runs serially;
 * the cost of a false negative is a race that reads green.
 */
export const stubsGlobals = (
  file: string,
): boolean => GLOBAL_STUB.test(sourceOf(file));

/**
 * The externals-table shape, owned in ONE place and
 * shared by the two sides that must agree on it: the ESM
 * emitter (which writes the table) and the flatten-time
 * key rewrite (which finds and rewrites its keys when a
 * built dist is inlined into an app bundle).
 *
 * An emitted ESM bundle carries, for each external
 * specifier, a namespace import and a `__externals` entry:
 *
 *   import * as __ext0 from "plgg";
 *   const __externals = {
 *     "plgg": __ext0,
 *   };
 *
 * When such a dist is inlined downstream, its inner
 * `require("plgg")` calls are rewritten to the outer
 * module id, and the table KEY must follow or the inner
 * lookup misses and falls into the dynamic-import fallback
 * (`plgg_1.box is not a function`). Both the write and the
 * follow-the-rewrite match go through the functions here,
 * so neither pattern-matches a hand-written TS-printer
 * literal — a change to the shape is a single edit here,
 * pinned by `externalsTable.spec.ts`.
 */

/**
 * The shared prefix of every external namespace variable.
 * The `__externals` table binds each key to `${PREFIX}${i}`,
 * so the key rewrite can match up to the prefix without
 * knowing the index.
 */
const VAR_PREFIX = "__ext";

/**
 * The namespace variable for the i-th external:
 * `__ext0`, `__ext1`, … Used by the top-level
 * `import * as __extN from "<spec>"` lines.
 */
export const externalVar = (i: number): string =>
  `${VAR_PREFIX}${i}`;

/**
 * The table-key binding for a specifier: the exact
 * `"<spec>": __ext` prefix an entry begins with, up to
 * (but not including) the variable index. This is the
 * unit the flatten-time rewrite matches — narrow enough
 * that ordinary `require("<spec>")` never collides with
 * it, because only the table writes `"<spec>": __ext`.
 */
export const externalKey = (spec: string): string =>
  `${JSON.stringify(spec)}: ${VAR_PREFIX}`;

/**
 * One full `__externals` entry for the i-th external:
 * `"<spec>": __extN`. The key binding plus the index, so
 * it is `externalKey(spec)` followed by `externalVar(i)`'s
 * tail — the two can never drift.
 */
export const externalEntry = (
  spec: string,
  i: number,
): string => `${externalKey(spec)}${i}`;

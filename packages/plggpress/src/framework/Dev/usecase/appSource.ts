import { dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { type SoftStr } from "plgg";

/**
 * The `<package>/src` root that OWNS a module, derived from
 * its own `import.meta.url`.
 *
 * This is how `plggpress dev` finds plggpress: not from the
 * consumer's directory (a consumer must never name
 * `../plgg`) and not from a config field, but from where
 * the running CLI's own code sits on disk. So the same
 * command works from a `file:`-linked monorepo checkout, a
 * registry install under `node_modules`, or an `npx`
 * cache — the answer always follows the binary.
 *
 * Path math only, no filesystem: the LAST `src` segment on
 * the module's path wins (a package may itself live under
 * someone else's `src/`, and the innermost one is its own).
 * A module directly in `src` needs no cut, and a module
 * under no `src/` at all falls back to its own directory —
 * unreachable for plggpress (every module of it is under
 * `src/`), but it keeps this total rather than failing at
 * process start.
 */
export const srcRootOf = (
  moduleUrl: SoftStr,
): SoftStr => {
  const dir = dirname(fileURLToPath(moduleUrl));
  const marker = `${sep}src${sep}`;
  const at = dir.lastIndexOf(marker);
  return at === -1
    ? dir
    : dir.slice(0, at + marker.length - 1);
};

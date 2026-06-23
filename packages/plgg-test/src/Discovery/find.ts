import { readdirSync } from "node:fs";
import {
  join,
  resolve,
} from "node:path";

/**
 * Walks the given roots and returns the sorted, absolute paths of all
 * spec files (`*.spec.ts` / `*.test.ts`). Directories `node_modules`,
 * `dist`, and `coverage` are pruned. The sort makes the discovered
 * SET deterministic — the parity gate (Plan Amendment 3) compares
 * this set against vitest's, so order-stability matters.
 */
export const discover = (
  roots: ReadonlyArray<string>,
): ReadonlyArray<string> =>
  Array.from(
    new Set(
      roots.flatMap((root) =>
        walk(resolve(root)),
      ),
    ),
  ).sort();

const PRUNE = new Set([
  "node_modules",
  "dist",
  "coverage",
]);

const isSpec = (
  name: string,
): boolean =>
  name.endsWith(".spec.ts") ||
  name.endsWith(".test.ts");

// Recursive directory walk. `readdirSync` with file types is the
// irreducible filesystem seam; the recursion itself stays expression
// shaped (flatMap over entries).
const walk = (
  dir: string,
): ReadonlyArray<string> =>
  entriesOf(dir).flatMap((entry) =>
    entry.isDirectory()
      ? PRUNE.has(entry.name)
        ? []
        : walk(
            join(dir, entry.name),
          )
      : entry.isFile() &&
          isSpec(entry.name)
        ? [join(dir, entry.name)]
        : [],
  );

const entriesOf = (
  dir: string,
): ReadonlyArray<{
  name: string;
  isDirectory: () => boolean;
  isFile: () => boolean;
}> => {
  // A non-existent or unreadable directory yields no specs rather
  // than throwing into the runner — discovery is best-effort over
  // roots that may not all exist.
  try {
    return readdirSync(dir, {
      withFileTypes: true,
    });
  } catch {
    return [];
  }
};

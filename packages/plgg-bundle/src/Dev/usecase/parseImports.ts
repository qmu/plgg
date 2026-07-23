/**
 * Extract the import specifiers from a TypeScript/ESM
 * source string. Pure string analysis — no fs, no
 * `typescript` AST — matching the three import forms the
 * monorepo actually uses:
 *
 *  - static `import ... from "spec"`,
 *  - re-export `export ... from "spec"`,
 *  - dynamic `import("spec")`.
 *
 * The node adapter feeds each watched file's contents
 * through this to build the local module graph. Returns
 * specifiers in source order (duplicates preserved);
 * resolution + local-only filtering is the adapter's job.
 *
 * This is intentionally a lightweight lexical scan, not a
 * full parser: the specifiers it yields drive only the
 * dev server's *reload decision* (which files are part of
 * the served graph), never the production build, so an
 * exotic un-matched form costs at most one conservative
 * extra reload — never a wrong bundle.
 */
export const parseImports = (
  source: string,
): ReadonlyArray<string> =>
  // Each pattern's first capture group is the quoted
  // specifier's inner text. `Array.from(..., mapFn)` +
  // a type-guard `filter` extracts it without an
  // `if`/`??` branch on the (unreachable) `undefined` a
  // capture group would only take if it were optional.
  PATTERNS.flatMap((pattern) =>
    Array.from(
      source.matchAll(pattern),
      (m) => m[1],
    ).filter(
      (spec): spec is string =>
        spec !== undefined,
    ),
  );

/**
 * The specifier-bearing forms. A `from "…"` clause covers
 * both `import` and `export`; a bare `import("…")` covers
 * dynamic import. `["']` matches either quote style; the
 * inner `[^"']+` is the specifier.
 */
const PATTERNS: ReadonlyArray<RegExp> = [
  /\bfrom\s*["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
];

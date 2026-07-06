import {
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
} from "plgg-bundle/vendors/nodeFs";
import {
  join,
  dirname,
  relative,
} from "plgg-bundle/vendors/nodePath";

/**
 * Rewrite the package self-alias (`<prefix>/<sub>`) in
 * every emitted `.d.ts` under `distDir` to a path
 * relative to the importing declaration file — the same
 * transform vite-plugin-dts applied. `tsc` leaves
 * `tsconfig` `paths` aliases verbatim in declaration
 * output, so without this pass a consumer (who has no
 * `plgg/*` alias) cannot resolve `from "plgg/Atomics"`.
 *
 * Because `dist` mirrors `src` and the alias maps
 * `<prefix>/*` → `src/*`, `<prefix>/<sub>` from
 * `dist/A/B.d.ts` resolves to `dist/<sub>`, i.e. the
 * relative path from `dist/A` to `dist/<sub>`.
 */
export const rewriteDtsAliases = (
  distDir: string,
  aliasPrefix: string,
): void => {
  // fs walk seam: visit every emitted declaration and
  // relativize its alias imports in place.
  for (const file of dtsFiles(distDir)) {
    const rewritten = rewriteDtsContent(
      file,
      readFileSync(file, "utf8"),
      distDir,
      aliasPrefix,
    );
    writeFileSync(file, rewritten, "utf8");
  }
};

/**
 * Rewrite a single declaration file's alias specifiers
 * (pure string transform, exposed for unit testing). The
 * match is ANCHORED to import/export specifier positions
 * — preceded by `from ` or `import(` — so a literal
 * string-type value like `type T = "plgg/x"` in a
 * `.d.ts` is left untouched (gap #7).
 */
export const rewriteDtsContent = (
  file: string,
  content: string,
  distDir: string,
  aliasPrefix: string,
): string =>
  content.replace(
    aliasPattern(aliasPrefix),
    (
      _match,
      lead: string,
      quote: string,
      sub: string,
    ) =>
      `${lead}${quote}${toRelative(
        file,
        distDir,
        sub,
      )}${quote}`,
  );

/**
 * A specifier-matching regex for `<prefix>/<sub>` only
 * in an import/export specifier position: immediately
 * after `from ` or `import(`. Captures the lead, the
 * quote, and the sub-path. The prefix is escaped so a
 * regex-special character in a package name is literal.
 */
const aliasPattern = (
  aliasPrefix: string,
): RegExp =>
  new RegExp(
    `(from\\s+|import\\s*\\()(["'])${escapeRegExp(
      aliasPrefix,
    )}\\/([^"']+)\\2`,
    "g",
  );

/**
 * The relative specifier from a declaration file to the
 * aliased sub-module's location in `dist`, POSIX-style
 * and `./`-prefixed when in the same/!-parent dir.
 */
const toRelative = (
  file: string,
  distDir: string,
  sub: string,
): string =>
  dotted(
    relative(dirname(file), join(distDir, sub))
      .split("\\")
      .join("/"),
  );

/**
 * Ensure a relative path is import-specifier shaped:
 * a same-or-child path gets a leading `./`; a `../`
 * path already is.
 */
const dotted = (rel: string): string =>
  rel.startsWith(".") ? rel : `./${rel}`;

/**
 * Escape regex metacharacters in a literal string.
 */
const escapeRegExp = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * All `.d.ts` files under a directory, recursively.
 */
const dtsFiles = (
  dir: string,
): ReadonlyArray<string> =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory()
      ? dtsFiles(p)
      : p.endsWith(".d.ts")
        ? [p]
        : [];
  });

import { existsSync, statSync } from "node:fs";
import {
  dirname,
  resolve,
  join,
} from "node:path";

/**
 * Resolve a bare import specifier to an absolute source
 * file path, given the importing file and the
 * package-self-alias mapping. Pure resolution logic —
 * it only consults the filesystem to pick between
 * `X.ts` and `X/index.ts`, mirroring how the alias +
 * relative imports across the plgg packages resolve
 * under `tsc`.
 *
 * Returns `undefined` when the specifier is external
 * (not the self-alias and not relative) or cannot be
 * found on disk — the caller decides whether that means
 * "external, leave it" or "broken import, fail".
 */
export const resolveSpecifier = (args: {
  specifier: string;
  fromFile: string;
  aliasPrefix: string;
  aliasSrcRoot: string;
}): string | undefined => {
  if (isRelative(args.specifier)) {
    return pickExisting(
      resolve(
        dirname(args.fromFile),
        args.specifier,
      ),
    );
  }
  const base = aliasTarget(args);
  return base === undefined
    ? undefined
    : pickExisting(base);
};

/**
 * Whether the specifier is a relative path (`./` or
 * `../`).
 */
const isRelative = (specifier: string): boolean =>
  specifier.startsWith("./") ||
  specifier.startsWith("../");

/**
 * Map a self-alias specifier (`<prefix>` or
 * `<prefix>/sub/path`) to its base path under the
 * source root. A non-alias specifier yields `undefined`
 * (it is external).
 */
const aliasTarget = (args: {
  specifier: string;
  aliasPrefix: string;
  aliasSrcRoot: string;
}): string | undefined =>
  args.specifier === args.aliasPrefix
    ? args.aliasSrcRoot
    : args.specifier.startsWith(
          `${args.aliasPrefix}/`,
        )
      ? join(
          args.aliasSrcRoot,
          args.specifier.slice(
            args.aliasPrefix.length + 1,
          ),
        )
      : undefined;

/**
 * Given a base path with no extension, pick the
 * existing source file: the path as-is, then `base.ts`,
 * then `base/index.ts`.
 */
const pickExisting = (
  base: string,
): string | undefined =>
  candidates(base).find(isFile);

/**
 * Whether a path exists and is a regular file (not a
 * directory). A bare `plgg/Abstracts` base resolves to
 * the `Abstracts/` directory, which must be skipped in
 * favor of `Abstracts/index.ts`.
 */
const isFile = (p: string): boolean =>
  existsSync(p) && statSync(p).isFile();

/**
 * The ordered candidate file paths for a base path.
 */
const candidates = (
  base: string,
): ReadonlyArray<string> => [
  base,
  `${base}.ts`,
  join(base, "index.ts"),
];

import { basename, join } from "plgg-bundle/vendors/nodePath";
import {
  resolveSpecifier,
  isRelative,
  pickExisting,
} from "plgg-bundle/domain/usecase/resolveSpecifier";
import { type WorkspacePackage } from "plgg-bundle/domain/usecase/discoverWorkspace";

/**
 * App-mode resolver: resolve an import specifier to an
 * absolute SOURCE file, inlining workspace siblings
 * (`plgg`, `plgg-view/client`, …) by walking their `src`
 * instead of leaving them external. This is the mirror of
 * the library externalization — the leaf app is where
 * bundling deps is correct.
 *
 * Order:
 * 1. relative (`./x`) → resolve against the importer,
 * 2. a workspace package's PUBLIC export subpath
 *    (`plgg-view/style`) → reverse its declared
 *    `exports` dist path to the entry source (honours the
 *    `styleEntry` rename),
 * 3. a workspace package's INTERNAL self-alias path
 *    (`plgg-view/Html/x`, and `plgg` → its `src/index`)
 *    → `src/<path>`.
 *
 * Returns `undefined` when the specifier is neither
 * relative nor a known workspace package (the caller
 * treats that as external or a hard error).
 */
export const resolveWorkspaceSpecifier = (args: {
  specifier: string;
  fromFile: string;
  packages: ReadonlyArray<WorkspacePackage>;
}): string | undefined => {
  if (isRelative(args.specifier)) {
    return resolveSpecifier({
      specifier: args.specifier,
      fromFile: args.fromFile,
      aliasPrefix: NO_ALIAS,
      aliasSrcRoot: "",
    });
  }
  const pkg = matchPackage(
    args.packages,
    args.specifier,
  );
  return pkg === undefined
    ? undefined
    : resolveInPackage(pkg, args.specifier);
};

/**
 * A sentinel alias prefix no specifier equals, so the
 * shared `resolveSpecifier` handles only the relative
 * branch when reused for relative imports.
 */
const NO_ALIAS = "\0";

/**
 * The workspace package whose name is the specifier or a
 * leading `name/` segment. The package list is sorted
 * longest-name-first, so the first match is the most
 * specific (`plgg-view` before `plgg`).
 */
const matchPackage = (
  packages: ReadonlyArray<WorkspacePackage>,
  specifier: string,
): WorkspacePackage | undefined =>
  packages.find(
    (p) =>
      specifier === p.name ||
      specifier.startsWith(`${p.name}/`),
  );

/**
 * Resolve a specifier already known to belong to `pkg`:
 * a declared export subpath via the exports reversal,
 * else the internal self-alias path.
 */
const resolveInPackage = (
  pkg: WorkspacePackage,
  specifier: string,
): string | undefined => {
  const subpath =
    specifier === pkg.name
      ? "."
      : `./${specifier.slice(
          pkg.name.length + 1,
        )}`;
  const dist = pkg.exports.get(subpath);
  return dist === undefined
    ? resolveSpecifier({
        specifier,
        fromFile: pkg.dir,
        aliasPrefix: pkg.name,
        aliasSrcRoot: join(pkg.dir, "src"),
      })
    : pickExisting(
        join(pkg.dir, "src", srcStem(dist)),
      );
};

/**
 * The source stem implied by an export's dist default —
 * `"./dist/styleEntry.es.js"` → `"styleEntry"`. The entry
 * output basename equals the entry name, which equals the
 * source file stem under `src/`, so stripping the dual
 * `.es.js`/`.cjs.js` (or bare `.js`) suffix recovers it.
 *
 * ASSUMES top-level entry stems: `basename` drops any
 * directory, so an export pointing at a NESTED dist path
 * (`./dist/sub/foo.es.js`) would reverse to `src/foo` and
 * lose `sub/`. No package nests an export entry today, so
 * this is correct now; revisit if one ever does.
 */
const srcStem = (distDefault: string): string =>
  basename(distDefault)
    .replace(/\.(es|cjs)\.js$/, "")
    .replace(/\.js$/, "");

/**
 * Pure staging helpers for the family npm publisher.
 *
 * Split out of the I/O orchestration (`publish.ts`) so the one place a
 * wrong answer would ship a broken tarball — the `file:`→caret rewrite of
 * a staged `package.json` — is a small pure function with its own unit
 * test, with no filesystem in the way. Ports the inline `node -` heredoc
 * the shell publisher used to run per package (publish-npm.sh, retired):
 * copy the `files` allowlist into a temp stage, rewrite every `file:`
 * cross-dependency to a caret range on the linked package's local
 * version, and fail loudly if any `file:` specifier survives.
 */

/** A parsed `package.json` object (unknown-typed at the boundary). */
export type PackageJson = Record<string, unknown>;

/**
 * Whether a value is a non-null object (records the narrowing for
 * property reads).
 */
const isRecord = (
  v: unknown,
): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

/**
 * The entries a staged package copies: its `files` allowlist plus the
 * conventional `README.md` / `LICENSE` npm always ships. Deduplicated,
 * order preserved. The caller copies only those that exist on disk.
 */
export const stageEntries = (
  pkg: PackageJson,
): ReadonlyArray<string> => {
  const files = pkg["files"];
  const declared = Array.isArray(files)
    ? files.filter(
        (f): f is string => typeof f === "string",
      )
    : [];
  return [
    ...new Set([
      ...declared,
      "README.md",
      "LICENSE",
    ]),
  ];
};

/**
 * Whether a publishable manifest declares the `files` allowlist the stage
 * copies from.
 *
 * Absence is always a mistake, never intent: every sibling declares
 * `files: ["dist"]`, and the one package that did not (`plggmatic@0.2.1`)
 * published a tarball with **no `dist` at all**. The mask is that a local
 * `npm pack` looks fine — npm's no-`files` default packs everything —
 * while {@link stageEntries}, which copies only the allowlist, staged
 * nothing but README/LICENSE. An empty array is the same defect spelled
 * differently, so it fails the same way.
 */
export const declaresStageAllowlist = (
  pkg: PackageJson,
): boolean => {
  const files = pkg["files"];
  return (
    Array.isArray(files) &&
    files.some(
      (f) => typeof f === "string" && f.length > 0,
    )
  );
};

/**
 * Collect every string leaf of a manifest value (a bare string, an array,
 * or a nested condition map like `exports`), in declaration order. A
 * `null` leaf — `exports` blocking a subpath — contributes nothing.
 */
const stringLeaves = (
  value: unknown,
  into: Array<string>,
): void => {
  if (typeof value === "string") {
    into.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) {
      stringLeaves(v, into);
    }
    return;
  }
  if (isRecord(value)) {
    for (const v of Object.values(value)) {
      stringLeaves(v, into);
    }
  }
};

/**
 * Every path the manifest declares as an importable or runnable entry —
 * `main`, `types`/`typings`, every leaf of `exports`, and every `bin`
 * target — relative to the package root with any leading `./` stripped.
 * Deduplicated, declaration order preserved.
 *
 * These are exactly the paths a consumer resolves, so a staged tarball
 * missing one is broken on arrival: the `plggmatic@0.2.1` install failed
 * with `ERR_MODULE_NOT_FOUND` for `dist/index.es.js`, a path its own
 * manifest named. Wildcard subpath patterns are skipped — `"./*"` names a
 * shape rather than a file, so its existence is not a decidable check.
 */
export const entryTargets = (
  pkg: PackageJson,
): ReadonlyArray<string> => {
  const raw: Array<string> = [];
  for (const key of ["main", "types", "typings"]) {
    stringLeaves(pkg[key], raw);
  }
  stringLeaves(pkg["exports"], raw);
  stringLeaves(pkg["bin"], raw);
  return [
    ...new Set(
      raw
        .filter(
          (p) => p.length > 0 && !p.includes("*"),
        )
        .map((p) => p.replace(/^\.\//, "")),
    ),
  ];
};

/**
 * The declared entry targets absent from a staged directory. `exists`
 * answers whether the stage holds that relative path — injected so the
 * check stays a pure function with no filesystem in the way, matching the
 * rest of this module.
 */
export const missingEntryTargets = (
  pkg: PackageJson,
  exists: (relPath: string) => boolean,
): ReadonlyArray<string> =>
  entryTargets(pkg).filter((p) => !exists(p));

/**
 * The staged `package.json` text: every `file:` cross-dependency (in
 * `dependencies` AND `devDependencies`) rewritten to `^<linked version>`,
 * serialized with a trailing newline. `resolveVersion(fileSpec)` returns
 * the linked package's version — the caller reads it from the linked
 * `package.json` on disk, so this stays pure. devDependencies ride along
 * rewritten: a consumer never installs them, but a `file:` specifier must
 * not survive anywhere. Throws if any `file:` survives the rewrite (a
 * published `file:` range is unresolvable for every consumer).
 */
export const stagedManifest = (
  pkg: PackageJson,
  resolveVersion: (fileSpec: string) => string,
): string => {
  const rewritten: Record<string, unknown> = {
    ...pkg,
  };
  for (const key of [
    "dependencies",
    "devDependencies",
  ]) {
    const deps = rewritten[key];
    if (!isRecord(deps)) {
      continue;
    }
    const next: Record<string, unknown> = {
      ...deps,
    };
    for (const [name, spec] of Object.entries(
      deps,
    )) {
      if (
        typeof spec === "string" &&
        spec.startsWith("file:")
      ) {
        next[name] = `^${resolveVersion(spec)}`;
      }
    }
    rewritten[key] = next;
  }
  const out =
    JSON.stringify(rewritten, null, 2) + "\n";
  if (out.includes('"file:')) {
    throw new Error(
      "file: specifier survived the rewrite",
    );
  }
  return out;
};

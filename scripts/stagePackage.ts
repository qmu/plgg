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

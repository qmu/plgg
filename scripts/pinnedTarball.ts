/**
 * Binds an npm tarball's content hash to the registry URL it was
 * resolved from, so the two can never be checked as if they came from
 * independent fetches.
 *
 * `scripts/publish.ts` resolves a just-published version with one
 * `npm view` poll, then separately `npm install`s it into a scratch
 * directory to smoke-test it. Those are two distinct registry
 * round-trips; nothing before this module checked that the tarball the
 * second one actually fetched was the SAME tarball the first one saw --
 * a registry mutation (or a misrouted request) between the two could
 * swap in different content without either call failing on its own.
 *
 * {@link parseDist} reads the tarball URL and content hash out of ONE
 * `npm view <name>@<version> dist --json` response, so a pinned
 * {@link TarballDist} is always one fetch's evidence, never an
 * assembly of two. {@link pinnedTarballMatches} then requires the
 * later install's lockfile entry to agree with BOTH fields of that
 * pinned value -- agreeing on only one is treated the same as agreeing
 * on neither.
 */

/** A tarball's registry URL and content hash, read from one `npm view … dist --json`. */
export type TarballDist = Readonly<{
  tarball: string;
  integrity: string;
}>;

/** The URL and content hash an actual install resolved, read from one lockfile entry. */
export type LockEntry = Readonly<{
  resolved: string;
  integrity: string;
}>;

const isRecord = (
  v: unknown,
): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const nonEmptyString = (
  v: unknown,
): v is string => typeof v === "string" && v.length > 0;

/**
 * Parse `npm view <name>@<version> dist --json`'s stdout (already
 * `JSON.parse`d). `tarball` and `integrity` are read off the SAME
 * object, so there is no path through this function that lets a
 * caller pair a tarball URL from one response with an integrity hash
 * from another. Either field missing or non-string => `null`, never a
 * half-pinned value.
 */
export const parseDist = (
  json: unknown,
): TarballDist | null => {
  if (!isRecord(json)) {
    return null;
  }
  const { tarball, integrity } = json;
  return nonEmptyString(tarball) &&
    nonEmptyString(integrity)
    ? { tarball, integrity }
    : null;
};

/**
 * Read the lockfile entry for `name` out of a parsed npm lockfile
 * (v2/v3 shape: `packages["node_modules/<name>"]`). `null` when the
 * package is absent or either field is missing -- a partial entry is
 * never treated as pinnable evidence.
 */
export const parseLockEntry = (
  lockJson: unknown,
  name: string,
): LockEntry | null => {
  if (!isRecord(lockJson)) {
    return null;
  }
  const packages = lockJson["packages"];
  if (!isRecord(packages)) {
    return null;
  }
  const entry = packages[`node_modules/${name}`];
  if (!isRecord(entry)) {
    return null;
  }
  const { resolved, integrity } = entry;
  return nonEmptyString(resolved) &&
    nonEmptyString(integrity)
    ? { resolved, integrity }
    : null;
};

/**
 * True only when an actual install's lockfile entry agrees with BOTH
 * the tarball URL and the content hash pinned at resolve time. A
 * match on exactly one of the two means the install drew from a
 * different registry response than the one that was verified -- a
 * mixed fetch context -- and that is rejected exactly like a mismatch
 * on both.
 */
export const pinnedTarballMatches = (
  dist: TarballDist,
  installed: LockEntry,
): boolean =>
  dist.tarball === installed.resolved &&
  dist.integrity === installed.integrity;

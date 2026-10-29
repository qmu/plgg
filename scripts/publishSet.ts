/**
 * Pure publish-set computation for the family npm publisher.
 *
 * Split out of the I/O entrypoint (`publish.ts`) so the version
 * comparison — the one place a wrong answer would publish or skip the
 * wrong package — is a small pure function with its own unit test, with
 * no network or filesystem in the way. Mirrors the semver-tuple compare
 * the shell preflight used to inline (publish-npm.sh, retired): local
 * version strictly greater than remote => PUBLISH; equal/lower => SKIP;
 * absent remote (never published) => PUBLISH; `private:true` => skipped.
 */

/** A parsed `[major, minor, patch]` version tuple. */
export type Semver = readonly [number, number, number];

/**
 * One package's publish-relevant metadata, read from its
 * `package.json`. `dir` is the `packages/<dir>` basename the shell drives
 * staging by.
 */
export type PkgMeta = Readonly<{
  dir: string;
  name: string;
  version: string;
  private: boolean;
}>;

/**
 * The preflight outcome: each input package sorted into exactly one
 * bucket, order preserved within each.
 */
export type PublishDecision = Readonly<{
  publish: ReadonlyArray<PkgMeta>;
  skip: ReadonlyArray<PkgMeta>;
  privateSkipped: ReadonlyArray<PkgMeta>;
}>;

/**
 * Coerce one dotted component to a number, mapping a missing or
 * non-numeric part to 0 — the parity of the shell's `l[i] || 0`.
 */
const component = (s: string | undefined): number => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Parse a dotted version string into a `[major, minor, patch]` tuple.
 * An absent registry version is represented by the caller as `null`,
 * never routed through here.
 */
export const parseSemver = (v: string): Semver => {
  const parts = v.split(".");
  return [
    component(parts[0]),
    component(parts[1]),
    component(parts[2]),
  ];
};

/**
 * True when `local` should be published over `remote`: strictly greater
 * by component-wise `[major, minor, patch]` comparison. A `null` remote
 * (never published) compares as `[-1, 0, 0]`, so any real local version
 * publishes.
 */
export const isNewer = (
  local: Semver,
  remote: Semver | null,
): boolean => {
  const r: Semver = remote ?? [-1, 0, 0];
  // Fixed 3-component walk: the first component that differs decides.
  for (let i = 0; i < 3; i++) {
    const a = local[i] ?? 0;
    const b = r[i] ?? 0;
    if (a > b) {
      return true;
    }
    if (a < b) {
      return false;
    }
  }
  return false;
};

/**
 * `{ name: version-or-null }`, as written by a preflight run (`--remote-out`)
 * and read back by a later `--publish` run (`--remote-in`) to detect the
 * registry's `latest` moving in the gate/human gap between the two. JSON has
 * no `undefined`, so an unqueried name is absent from the object, not a key
 * mapped to `undefined`.
 */
export type RemoteBaseline = Readonly<
  Record<string, string | null>
>;

/** A parsed, unknown-typed value narrowed to {@link RemoteBaseline}. */
export const isRemoteBaseline = (
  v: unknown,
): v is RemoteBaseline =>
  typeof v === "object" &&
  v !== null &&
  !Array.isArray(v) &&
  Object.values(v).every(
    (value) => value === null || typeof value === "string",
  );

/**
 * Names whose `current` remote version no longer matches what `baseline`
 * recorded for the same name — the registry's `latest` moved since the
 * baseline was captured. A name absent from either side reads as `null`
 * (never published), so a package that became published (or unpublished)
 * in the gap still counts as drift. Pure: both sides are already read.
 */
export const driftedPackages = (
  names: ReadonlyArray<string>,
  baseline: RemoteBaseline,
  current: RemoteBaseline,
): ReadonlyArray<string> =>
  names.filter(
    (name) =>
      (baseline[name] ?? null) !==
      (current[name] ?? null),
  );

/**
 * Split packages (already in publish/build order) into publish / skip /
 * private buckets. `remoteByName` maps a package name to its registry
 * version string, or `null` when the package was never published. Pure:
 * every network query is done by the caller and passed in.
 */
export const computePublishSet = (
  order: ReadonlyArray<PkgMeta>,
  remoteByName: ReadonlyMap<string, string | null>,
): PublishDecision => {
  const publish: Array<PkgMeta> = [];
  const skip: Array<PkgMeta> = [];
  const privateSkipped: Array<PkgMeta> = [];
  for (const pkg of order) {
    if (pkg.private) {
      privateSkipped.push(pkg);
      continue;
    }
    const remote = remoteByName.get(pkg.name) ?? null;
    const remoteSemver =
      remote === null ? null : parseSemver(remote);
    if (isNewer(parseSemver(pkg.version), remoteSemver)) {
      publish.push(pkg);
    } else {
      skip.push(pkg);
    }
  }
  return { publish, skip, privateSkipped };
};

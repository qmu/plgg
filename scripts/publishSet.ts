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

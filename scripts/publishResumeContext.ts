/**
 * Binds a partway-publish resume decision to the exact registry
 * snapshot the failure was diagnosed against, so a resume computed
 * from one fetch is never honored against a different one.
 *
 * `scripts/publishResume.ts` (qmu/plgg#222, not yet merged) plans
 * what to resume purely from a failure's position in the `--only`
 * order — it never records WHICH live registry state that plan
 * assumed. Between a failure and a developer actually re-running
 * `ONLY=... ./scripts/publish-npm.sh`, another publish can move a
 * package's version or its `latest` dist-tag (the same race
 * qmu/plgg#228 guards at the opposite end, finalization). A resume
 * command printed against the OLD state would then skip a package
 * that still needs publishing, or treat a moved dist-tag as untouched.
 *
 * This module captures one `FetchContext` — registry identifier, UTC
 * fetch time, and every package's `{name, version, latestTag}`
 * folded into one order-independent `distTagGeneration` hash — at the
 * moment a resume plan is computed, and validates a later resume
 * attempt's freshly re-fetched context against it. Any divergence
 * (a different registry, a package version or dist-tag that moved, an
 * unexpected or missing package, or a context fetched out of causal
 * order) is rejected by name — never silently resumed.
 *
 * Pure: every registry query is the caller's job. No filesystem, no
 * network, no `npm` spawn here — the one place a wrong answer would
 * resume a publish run against a reality it was never diagnosed
 * against is a small pure function with its own unit test.
 */
import { createHash } from "node:crypto";

/** One package's observed identity + dist-tag state at fetch time. */
export type PkgSnapshot = Readonly<{
  name: string;
  version: string;
  /** The `latest` dist-tag's version, or `null` when unpublished. */
  latestTag: string | null;
}>;

/**
 * The exact registry reality a resume plan was computed against:
 * where it was fetched from, when, and every package's identity +
 * dist-tag state at that instant — folded into one order-independent
 * `distTagGeneration` hash that changes if ANY package's version or
 * `latest` tag moves.
 */
export type FetchContext = Readonly<{
  registry: string;
  /** ISO-8601 instant this snapshot was fetched. */
  fetchedAt: string;
  /** Sorted by name — see {@link captureFetchContext}. */
  packages: ReadonlyArray<PkgSnapshot>;
  distTagGeneration: string;
}>;

const sortByName = (
  packages: ReadonlyArray<PkgSnapshot>,
): ReadonlyArray<PkgSnapshot> =>
  [...packages].sort((a, b) =>
    a.name < b.name
      ? -1
      : a.name > b.name
        ? 1
        : 0,
  );

/**
 * A stable, order-independent fingerprint of `packages`'
 * name/version/latestTag triples. Two snapshots holding the same
 * packages in a different order hash identically; a version bump, a
 * `latest` retag, or a package added/removed changes the hash.
 */
export const distTagGeneration = (
  packages: ReadonlyArray<PkgSnapshot>,
): string => {
  const canonical = sortByName(packages).map(
    (p) =>
      `${p.name}@${p.version}#${p.latestTag ?? ""}`,
  );
  return createHash("sha256")
    .update(canonical.join("\n"))
    .digest("hex");
};

/**
 * Captures one `FetchContext` from a live registry read the caller
 * already performed. `packages` is sorted by name so two captures of
 * the same reality always compare equal regardless of query order.
 */
export const captureFetchContext = (
  registry: string,
  fetchedAt: string,
  packages: ReadonlyArray<PkgSnapshot>,
): FetchContext => {
  const sorted = sortByName(packages);
  return {
    registry,
    fetchedAt,
    packages: sorted,
    distTagGeneration: distTagGeneration(sorted),
  };
};

/**
 * Why a resume attempt's freshly re-fetched context was rejected
 * against the one its plan was computed from. Exactly one reason per
 * rejection — {@link validateResume} stops at the first it finds.
 */
export type ContextRejection =
  | Readonly<{
      reason: "registry-mismatch";
      saved: string;
      current: string;
    }>
  | Readonly<{
      reason: "non-monotonic-fetch";
      saved: string;
      current: string;
    }>
  | Readonly<{
      reason: "missing-package";
      name: string;
    }>
  | Readonly<{
      reason: "unexpected-package";
      name: string;
    }>
  | Readonly<{
      reason: "package-version-mismatch";
      name: string;
      saved: string;
      current: string;
    }>
  | Readonly<{
      reason: "dist-tag-generation-mismatch";
      saved: string;
      current: string;
      movedTags: ReadonlyArray<string>;
    }>;

/**
 * Validates a resume attempt's freshly re-fetched `current` context
 * against the `saved` one a resume plan was computed from. Returns
 * `null` only when `current` is the same fetch context — the same
 * registry, no earlier in time, the exact same named packages, and
 * every version and `latest` dist-tag unchanged. Otherwise returns
 * the single most specific reason to reject resuming, checked in this
 * order: registry identity, time direction, per-package presence and
 * version, then the dist-tag generation as a whole.
 */
export const validateResume = (
  saved: FetchContext,
  current: FetchContext,
): ContextRejection | null => {
  if (saved.registry !== current.registry) {
    return {
      reason: "registry-mismatch",
      saved: saved.registry,
      current: current.registry,
    };
  }
  if (current.fetchedAt < saved.fetchedAt) {
    return {
      reason: "non-monotonic-fetch",
      saved: saved.fetchedAt,
      current: current.fetchedAt,
    };
  }
  const currentByName = new Map(
    current.packages.map(
      (p): [string, PkgSnapshot] => [
        p.name,
        p,
      ],
    ),
  );
  for (const expected of saved.packages) {
    const found = currentByName.get(expected.name);
    if (found === undefined) {
      return {
        reason: "missing-package",
        name: expected.name,
      };
    }
    if (found.version !== expected.version) {
      return {
        reason: "package-version-mismatch",
        name: expected.name,
        saved: expected.version,
        current: found.version,
      };
    }
  }
  const expectedNames = new Set(
    saved.packages.map((p) => p.name),
  );
  const extra = current.packages.find(
    (p) => !expectedNames.has(p.name),
  );
  if (extra !== undefined) {
    return {
      reason: "unexpected-package",
      name: extra.name,
    };
  }
  if (
    saved.distTagGeneration !==
    current.distTagGeneration
  ) {
    const movedTags = saved.packages
      .filter((p) => {
        const found = currentByName.get(p.name);
        return (
          found !== undefined &&
          found.latestTag !== p.latestTag
        );
      })
      .map((p) => p.name);
    return {
      reason: "dist-tag-generation-mismatch",
      saved: saved.distTagGeneration,
      current: current.distTagGeneration,
      movedTags,
    };
  }
  return null;
};

/** Exhaustiveness guard: a new `ContextRejection` reason must update {@link describeRejection}. */
const unreachable = (x: never): never => {
  throw new Error(
    `publishResumeContext: unreachable rejection ${JSON.stringify(x)}`,
  );
};

/**
 * A one-line, human-readable explanation of a rejection — printed in
 * place of blindly trusting a stale resume plan.
 */
export const describeRejection = (
  rejection: ContextRejection,
): string => {
  switch (rejection.reason) {
    case "registry-mismatch":
      return `resume context rejected: registry changed from "${rejection.saved}" to "${rejection.current}" — this is a different fetch context, not a continuation`;
    case "non-monotonic-fetch":
      return `resume context rejected: the current fetch (${rejection.current}) is earlier than the saved one (${rejection.saved}) — refusing to resume into a context from before the failure`;
    case "missing-package":
      return `resume context rejected: "${rejection.name}" is no longer visible on the registry — refusing to resume against an incomplete fetch`;
    case "unexpected-package":
      return `resume context rejected: "${rejection.name}" was not part of the original publish set — refusing to resume against a differently-scoped fetch`;
    case "package-version-mismatch":
      return `resume context rejected: "${rejection.name}" moved from ${rejection.saved} to ${rejection.current} on the registry since the failure — refusing to resume against a different package version`;
    case "dist-tag-generation-mismatch":
      return `resume context rejected: dist-tags moved for ${rejection.movedTags.join(", ")} since the failure — refusing to resume against a different dist-tag generation`;
    default:
      return unreachable(rejection);
  }
};

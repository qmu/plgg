/**
 * Safe next-step classifier for the "public tarball, TS7 consumer"
 * gate family (e.g. the `gate-public-tarball-node24.sh` shape: fetch a
 * package's REAL, currently-published npm tarball into a scratch
 * consumer and compile/transpile it under that consumer's own
 * `typescript@7`).
 *
 * That gate has one known, non-flaky failure shape today: the registry
 * can legitimately serve a version that still carries a bug this repo
 * has already fixed in source but has not yet published (the #156
 * class — `plgg-bundle@0.0.6`'s nested-`typescript` resolution). A gate
 * that just reports "npm install failed" or "tsc exited 1" for that
 * case invites a developer to debug a bug that is not in their tree.
 *
 * This module takes the few structured, already-known facts such a
 * gate has in hand (never raw diagnostic TEXT — classifying by string
 * search on an error message is brittle, see `publishedTerminal.mjs`'s
 * own rejection of that approach) and turns them into one of three safe
 * next operations, each paired with the concrete command that acts on
 * it. It does not run `npm`, touch the network, or retry anything
 * itself — it only decides what a caller should try next.
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

/** The three safe next operations this gate failure can resolve to. */
export type NextStep =
  | "refetch"
  | "rebuild"
  | "wait-for-publish";

/**
 * No known-safe next step applies — the signals don't match the one
 * failure shape this module understands, so classifying further would
 * mean guessing. Not a `NextStep`: there is no safe automatic action.
 */
export type Unclassified = "unclassified";

export type Classification = Readonly<{
  nextStep: NextStep | Unclassified;
  reason: string;
  command: string;
}>;

/**
 * The facts a public-tarball consumer gate already has on a failed
 * run, before this module is consulted:
 *
 * - `registryNotFound`: the exact version the gate just resolved (via
 *   `npm view <pkg> version` or equivalent) came back 404/ETARGET on
 *   the immediately following `npm install` — the classic publish
 *   propagation race, not a real absence.
 * - `localBuildStale`: the gate's own prerequisite build (this repo's
 *   `dist/`, used as the comparison baseline) is missing or older than
 *   its sources.
 * - `resolvedVersion` / `minimumFixedVersion`: the version the
 *   registry actually served, and the lowest version this repo has
 *   recorded (in the fixing issue/PR) as carrying the fix. When the
 *   registry version is strictly below that floor, no local retry or
 *   rebuild can make the gate pass — only an upstream `npm publish`
 *   can.
 */
export type FailureSignal = Readonly<{
  packageName: string;
  registryNotFound: boolean;
  localBuildStale: boolean;
  resolvedVersion: string;
  minimumFixedVersion: string;
}>;

/** One semver release's precedence-relevant parts. */
type SemverParts = Readonly<{
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
}>;

const SEMVER_PATTERN =
  /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/;

/**
 * Parses the `major.minor.patch[-prerelease]` prefix of a version
 * string. Returns `null` for anything that doesn't start with that
 * shape (this module only ever sees versions drawn from this repo's
 * own manifests and the public registry, both always semver).
 */
export const parseSemver = (
  version: string,
): SemverParts | null => {
  const match = SEMVER_PATTERN.exec(version);
  if (match === null) {
    return null;
  }
  const [, major, minor, patch, prerelease] =
    match;
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    prerelease: prerelease ?? null,
  };
};

/**
 * -1 / 0 / 1 semver precedence compare. A prerelease has LOWER
 * precedence than the same `major.minor.patch` without one (semver
 * 2.0.0 §11.3); this module only needs that one tie-break, not full
 * dot-separated prerelease field comparison.
 */
export const compareSemver = (
  a: SemverParts,
  b: SemverParts,
): number => {
  if (a.major !== b.major) {
    return a.major < b.major ? -1 : 1;
  }
  if (a.minor !== b.minor) {
    return a.minor < b.minor ? -1 : 1;
  }
  if (a.patch !== b.patch) {
    return a.patch < b.patch ? -1 : 1;
  }
  if (a.prerelease === b.prerelease) {
    return 0;
  }
  if (a.prerelease === null) {
    return 1;
  }
  if (b.prerelease === null) {
    return -1;
  }
  return a.prerelease < b.prerelease ? -1 : 1;
};

/**
 * Classifies one failed public-tarball-consumer-gate run into a safe
 * next operation. Checked in a fixed order because the signals are
 * not mutually exclusive and earlier ones are cheaper to act on:
 *
 * 1. `refetch` — the registry hasn't propagated the version it just
 *    resolved yet; retrying the fetch is the whole fix.
 * 2. `rebuild` — this repo's own comparison baseline is stale; no
 *    registry round-trip can help until it's rebuilt.
 * 3. `wait-for-publish` — the registry is serving a real, resolvable
 *    version, but it predates the known fix; nothing this gate (or a
 *    developer running it locally) can do closes that gap but an
 *    upstream `npm publish`.
 *
 * Returns `"unclassified"` when none of the three known signals holds
 * — this module only recognizes the one failure shape described above,
 * and must not launder an unrelated bug into false reassurance.
 */
export const classifyPublicTarballGateFailure = (
  signal: FailureSignal,
): Classification => {
  if (signal.registryNotFound) {
    return {
      nextStep: "refetch",
      reason: `the registry has not yet propagated ${signal.packageName}@${signal.resolvedVersion}`,
      command: `npm view ${signal.packageName}@${signal.resolvedVersion} version && <retry the gate>`,
    };
  }
  if (signal.localBuildStale) {
    return {
      nextStep: "rebuild",
      reason: `this repo's own build of ${signal.packageName} is missing or stale`,
      command: `./scripts/build.sh && <retry the gate>`,
    };
  }
  const resolved = parseSemver(
    signal.resolvedVersion,
  );
  const minimumFixed = parseSemver(
    signal.minimumFixedVersion,
  );
  if (
    resolved !== null &&
    minimumFixed !== null &&
    compareSemver(resolved, minimumFixed) < 0
  ) {
    return {
      nextStep: "wait-for-publish",
      reason: `the public registry still serves ${signal.packageName}@${signal.resolvedVersion}, below the known-fixed ${signal.minimumFixedVersion}`,
      command: `npm view ${signal.packageName} version   # re-run once this reports >= ${signal.minimumFixedVersion}`,
    };
  }
  return {
    nextStep: "unclassified",
    reason: `no known-safe cause matched this ${signal.packageName} failure`,
    command: `<investigate manually — this is not the known #156-class failure>`,
  };
};

/** Parses `--flag value` / `--flag` CLI arguments into a map. */
const parseArgs = (
  argv: ReadonlyArray<string>,
): Map<string, string | true> => {
  const out = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === undefined || !arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      out.set(key, next);
      i += 1;
    } else {
      out.set(key, true);
    }
  }
  return out;
};

const main = (): void => {
  const args = parseArgs(process.argv.slice(2));
  const packageName = args.get("package");
  const resolvedVersion = args.get("resolved-version");
  const minimumFixedVersion = args.get(
    "minimum-fixed-version",
  );
  if (
    typeof packageName !== "string" ||
    typeof resolvedVersion !== "string" ||
    typeof minimumFixedVersion !== "string"
  ) {
    process.stderr.write(
      "usage: publicTarballGateFailure.ts --package <name> " +
        "--resolved-version <v> --minimum-fixed-version <v> " +
        "[--registry-not-found] [--local-build-stale]\n",
    );
    process.exit(2);
  }
  const classification = classifyPublicTarballGateFailure({
    packageName,
    registryNotFound: args.get("registry-not-found") === true,
    localBuildStale: args.get("local-build-stale") === true,
    resolvedVersion,
    minimumFixedVersion,
  });
  process.stdout.write(
    `${JSON.stringify(classification)}\n`,
  );
};

// Run the CLI only when invoked directly, never when a spec imports the
// helpers above.
const invoked = process.argv[1];
if (
  invoked !== undefined &&
  fileURLToPath(import.meta.url) === resolve(invoked)
) {
  main();
}

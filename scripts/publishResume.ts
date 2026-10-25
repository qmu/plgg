/**
 * Pure resume/rollback planning for a multi-package npm publish run
 * (`publish.ts --publish`) that dies partway through its ordered set.
 *
 * Split out of the I/O orchestration so the one place a wrong answer
 * would either re-attempt an already-irreversible `npm publish` or tell
 * a developer to delete a version that is live — is a small pure
 * function with its own unit test, with no process spawn in the way.
 *
 * `.workaholic/deployments/npm.md` treats a publish as irreversible (npm
 * forbids re-publishing a version); this module never recommends
 * `npm unpublish` for that reason — the only rollback it names is
 * `npm deprecate` plus a fresh patch version.
 */

/** The step a package's publish died at, in the order they run. */
export type PublishStage =
  | "publish"
  | "resolve"
  | "smoke";

/** The identity a resume plan reasons about — no filesystem needed. */
export type PkgRef = Readonly<{
  dir: string;
  name: string;
  version: string;
}>;

/**
 * The outcome of one failed run, split against the full ordered set that
 * was passed to `--only`.
 */
export type ResumePlan = Readonly<{
  /** Already published, resolved and smoke-tested this run — leave alone. */
  completed: ReadonlyArray<PkgRef>;
  /** The package the run died on, and which step it died at. */
  failed: Readonly<{ pkg: PkgRef; stage: PublishStage }>;
  /** Never attempted this run. */
  pending: ReadonlyArray<PkgRef>;
  /**
   * True once `npm publish` for `failed` is known to have already
   * succeeded (died at "resolve" or "smoke", both of which run strictly
   * after a successful publish) — re-running it would hit npm's refusal
   * to publish over an existing version.
   */
  failedIsOnRegistry: boolean;
}>;

/**
 * Split `order` — the exact `--only` set a run was given, in its
 * publish order — around the package it died on. Throws if `failedDir`
 * is not one of `order`'s dirs: that would mean the caller is reporting
 * a failure against the wrong run.
 */
export const planResume = (
  order: ReadonlyArray<PkgRef>,
  failedDir: string,
  stage: PublishStage,
): ResumePlan => {
  const i = order.findIndex(
    (p) => p.dir === failedDir,
  );
  if (i < 0) {
    throw new Error(
      `planResume: ${failedDir} is not in the publish set (${order
        .map((p) => p.dir)
        .join(", ")})`,
    );
  }
  const failedPkg = order[i];
  if (failedPkg === undefined) {
    throw new Error(
      `planResume: ${failedDir} resolved to no entry`,
    );
  }
  return {
    completed: order.slice(0, i),
    failed: { pkg: failedPkg, stage },
    pending: order.slice(i + 1),
    failedIsOnRegistry:
      stage === "resolve" || stage === "smoke",
  };
};

/**
 * The exact command that safely continues the run: every package not
 * yet confirmed on the registry, in order. Omits `failed` whenever it is
 * already published (publishing it again is not just unsafe, npm
 * actively refuses it) — a developer must resolve that one by hand
 * (deprecate + patch bump) before any dependent downstream of it can be
 * trusted to pick up a working version.
 */
export const resumeCommand = (
  plan: ResumePlan,
): string => {
  const dirs = [
    ...(plan.failedIsOnRegistry
      ? []
      : [plan.failed.pkg.dir]),
    ...plan.pending.map((p) => p.dir),
  ];
  return dirs.length === 0
    ? "(nothing left to publish — resolve the failed package by hand)"
    : `ONLY=${dirs.join(",")} ./scripts/publish-npm.sh`;
};

/** `<name>@<version>`, the report's per-package label. */
const labelOf = (p: PkgRef): string =>
  `${p.name}@${p.version}`;

/**
 * The human-readable block printed in place of a bare stack trace: what
 * already shipped (never touch it), what died and why that's safe or not,
 * and the exact next command. Never suggests `npm unpublish`.
 */
export const resumeReport = (
  plan: ResumePlan,
): string => {
  const lines: Array<string> = [
    "=== Publish failed partway — already-published versions are left in place ===",
  ];
  lines.push(
    plan.completed.length > 0
      ? `Already published + verified this run (do not republish or unpublish): ${plan.completed
          .map(labelOf)
          .join(", ")}`
      : "Nothing published yet this run.",
  );
  const { pkg, stage } = plan.failed;
  lines.push(
    `Failed at "${stage}": ${labelOf(pkg)}`,
  );
  if (plan.failedIsOnRegistry) {
    lines.push(
      `${labelOf(pkg)} IS already on the registry — the publish itself succeeded; ` +
        `only the post-publish "${stage}" check failed. Do not re-run \`npm publish\` for it ` +
        `(npm refuses to republish a version) and do not \`npm unpublish\` it (treated as ` +
        `irreversible per .workaholic/deployments/npm.md). Rollback: ` +
        `\`npm deprecate ${labelOf(pkg)} '<reason>'\`, then bump its package.json to a new ` +
        `patch version, fix the defect, and publish that version instead.`,
    );
  } else {
    lines.push(
      `${labelOf(pkg)} is NOT on the registry — the \`npm publish\` call itself failed, so it ` +
        `is safe to retry exactly as staged.`,
    );
  }
  lines.push(`Next safe step: ${resumeCommand(plan)}`);
  return lines.join("\n");
};

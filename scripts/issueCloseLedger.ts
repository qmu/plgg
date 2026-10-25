import {
  createHash,
  randomUUID,
} from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  renameSync,
  rmSync,
} from "node:fs";
import {
  resolve,
  dirname,
  join,
} from "node:path";
import { pathToFileURL } from "node:url";

const registry = "https://registry.npmjs.org";
const policies = [
  {
    issue: 155,
    name: "plgg-bundle",
    minimum: "0.0.7",
    prs: [212],
    checks: ["bundle-restart"],
    extra: ["affected-runtime-repeat-build"],
  },
  {
    issue: 156,
    name: "plgg-bundle",
    minimum: "0.0.7",
    prs: [189, 179, 212],
    checks: ["consumer-ts7"],
    extra: [
      "consumer-declarations",
      "corpd-tsgo-workaround-removed",
    ],
  },
  {
    issue: 157,
    name: "plgg-view",
    minimum: "0.0.3",
    prs: [166],
    checks: ["frame-dispatch", "lazy-subtree"],
    extra: ["corpd-frame-lazy"],
  },
  {
    issue: 158,
    name: "plgg-view",
    minimum: "0.0.3",
    prs: [216],
    checks: ["svg-elements", "raw-identity"],
    extra: ["corpd-typed-svg-child-selector"],
  },
];
const record = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value);
const list = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];
const object = (
  value: unknown,
): Record<string, unknown> =>
  record(value) ? value : {};
const sha = (bytes: string): string =>
  createHash("sha256")
    .update(bytes)
    .digest("hex");
const stableVersion = (
  value: unknown,
): value is string =>
  typeof value === "string" &&
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(
    value,
  );
const atLeast = (
  value: unknown,
  minimum: string,
): boolean => {
  if (!stableVersion(value)) return false;
  const actual = value.split(".").map(BigInt);
  const floor = minimum.split(".").map(BigInt);
  for (const index of [0, 1, 2]) {
    const a = actual[index];
    const b = floor[index];
    if (a === undefined || b === undefined)
      return false;
    if (a !== b) return a > b;
  }
  return true;
};
const one = (
  values: unknown,
  key: string,
  expected: string | number,
): Record<string, unknown> => {
  const matches = list(values).filter(
    (value) =>
      record(value) && value[key] === expected,
  );
  return matches.length === 1
    ? object(matches[0])
    : {};
};
const passed = (
  values: unknown,
  id: string,
): boolean =>
  one(values, "id", id).status === "passed";
const date = (value: unknown): value is string =>
  typeof value === "string" &&
  Number.isFinite(Date.parse(value));

/** Join trusted producer snapshots. No npm probes, feature gates or issue mutations. */
export const buildIssueCloseLedger = (
  completionBytes: string,
  tagBytes: string,
  supplementalBytes: string,
  pulls: unknown,
) => {
  const completion = object(
    JSON.parse(completionBytes),
  );
  const tags = object(JSON.parse(tagBytes));
  const supplemental = object(
    JSON.parse(supplementalBytes),
  );
  const sourceSha256 = sha(completionBytes);
  const bound =
    completion.schemaVersion === 1 &&
    completion.registry === registry &&
    completion.complete === true &&
    /^v24\./.test(String(completion.node)) &&
    /^7\./.test(
      String(completion.consumerTypeScript),
    ) &&
    tags.schemaVersion === 1 &&
    tags.registry === registry &&
    tags.complete === true &&
    list(tags.reasons).length === 0 &&
    tags.sourceSha256 === sourceSha256 &&
    supplemental.schemaVersion === 1 &&
    supplemental.sourceSha256 === sourceSha256;
  const issues = policies.map((policy) => {
    const pkg = one(
      completion.packages,
      "name",
      policy.name,
    );
    const observation = one(
      tags.observations,
      "name",
      policy.name,
    );
    const publication =
      stableVersion(pkg.version) &&
      atLeast(pkg.version, policy.minimum) &&
      observation.matched === true &&
      observation.recordedVersion ===
        pkg.version &&
      observation.publishedVersion ===
        pkg.version &&
      observation.distTag === "latest" &&
      observation.distTagVersion === pkg.version;
    const prs = policy.prs.map((number) => {
      const pull = one(pulls, "number", number);
      const base = object(pull.base);
      const repo = object(base.repo);
      const merged =
        pull.merged === true &&
        date(pull.merged_at) &&
        typeof pull.merge_commit_sha ===
          "string" &&
        /^[a-f0-9]{40}$/.test(
          pull.merge_commit_sha,
        ) &&
        base.ref === "main" &&
        repo.full_name === "qmu/plgg";
      return {
        number,
        url: `https://github.com/qmu/plgg/pull/${number}`,
        merged,
        mergedAt: merged ? pull.merged_at : null,
        mergeCommit: merged
          ? pull.merge_commit_sha
          : null,
      };
    });
    const consumerChecks = policy.checks.map(
      (id) => ({
        id,
        passed: passed(completion.checks, id),
      }),
    );
    const extra = one(
      supplemental.issues,
      "issue",
      policy.issue,
    );
    const closureChecks = policy.extra.map(
      (id) => ({
        id,
        passed: passed(extra.checks, id),
      }),
    );
    const blockers = [
      ...(!bound
        ? [
            "unbound-or-incomplete-public-evidence",
          ]
        : []),
      ...(!publication
        ? ["npm-version-or-latest-mismatch"]
        : []),
      ...prs
        .filter((pr) => !pr.merged)
        .map(
          (pr) => `pr-not-merged:${pr.number}`,
        ),
      ...consumerChecks
        .filter((check) => !check.passed)
        .map(
          (check) =>
            `consumer-check-pending:${check.id}`,
        ),
      ...closureChecks
        .filter((check) => !check.passed)
        .map(
          (check) =>
            `closure-check-pending:${check.id}`,
        ),
    ];
    return {
      issue: policy.issue,
      url: `https://github.com/qmu/plgg/issues/${policy.issue}`,
      package: policy.name,
      minimumVersion: policy.minimum,
      npmVersion: stableVersion(pkg.version)
        ? pkg.version
        : null,
      latest: stableVersion(
        observation.distTagVersion,
      )
        ? observation.distTagVersion
        : null,
      publicationMatched: publication,
      prs,
      consumerChecks,
      closureChecks,
      canClose: blockers.length === 0,
      blockers,
    };
  });
  return {
    schemaVersion: 1,
    checkedAt: new Date().toISOString(),
    registry,
    sources: {
      completionSha256: sourceSha256,
      tagsSha256: sha(tagBytes),
      supplementalSha256: sha(supplementalBytes),
      pullsSha256: sha(JSON.stringify(pulls)),
    },
    complete: issues.every(
      (issue) => issue.canClose,
    ),
    issues,
  };
};

/** Replace even a stale successful decision with a new blocked decision, atomically. */
export const saveIssueCloseLedger = (
  output: string,
  ledger: ReturnType<
    typeof buildIssueCloseLedger
  >,
  rename: typeof renameSync = renameSync,
): void => {
  const temporary = join(
    dirname(output),
    `.issue-close-${randomUUID()}.tmp`,
  );
  try {
    writeFileSync(
      temporary,
      `${JSON.stringify(ledger, null, 2)}\n`,
      { mode: 0o600, flag: "wx" },
    );
    rename(temporary, output);
  } finally {
    rmSync(temporary, { force: true });
  }
};

if (
  process.argv[1] &&
  import.meta.url ===
    pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const [
      completion,
      tags,
      supplemental,
      output,
    ] = process.argv.slice(2);
    if (
      !completion ||
      !tags ||
      !supplemental ||
      !output
    )
      throw Error("arguments");
    const completionBytes = readFileSync(
      completion,
      "utf8",
    );
    const tagBytes = readFileSync(tags, "utf8");
    const supplementalBytes = readFileSync(
      supplemental,
      "utf8",
    );
    const pulls: unknown[] = [
      ...new Set(
        policies.flatMap((policy) => policy.prs),
      ),
    ].map((number) => {
      try {
        const parsed: unknown = JSON.parse(
          execFileSync(
            "gh",
            [
              "api",
              `repos/qmu/plgg/pulls/${number}`,
            ],
            {
              encoding: "utf8",
              stdio: ["ignore", "pipe", "ignore"],
            },
          ),
        );
        return parsed;
      } catch {
        return { number };
      }
    });
    const ledger = buildIssueCloseLedger(
      completionBytes,
      tagBytes,
      supplementalBytes,
      pulls,
    );
    saveIssueCloseLedger(resolve(output), ledger);
    console.log(
      `issue-close-ledger: ${ledger.complete ? "closable" : "blocked"}`,
    );
    process.exitCode = ledger.complete ? 0 : 1;
  } catch {
    console.error(
      "issue-close-ledger: input-or-save-failed",
    );
    process.exitCode = 1;
  }
}

import { test } from "node:test";
import {
  strictEqual,
  deepStrictEqual,
  throws,
} from "node:assert";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildIssueCloseLedger,
  saveIssueCloseLedger,
} from "./issueCloseLedger.ts";

const fixture = () => {
  const completion = {
    schemaVersion: 1,
    registry: "https://registry.npmjs.org",
    complete: true,
    node: "v24.22.1",
    consumerTypeScript: "7.0.2",
    packages: [
      { name: "plgg-bundle", version: "0.0.7" },
      { name: "plgg-view", version: "0.0.3" },
    ],
    checks: [
      "bundle-restart",
      "consumer-ts7",
      "frame-dispatch",
      "lazy-subtree",
      "svg-elements",
      "raw-identity",
    ].map((id) => ({ id, status: "passed" })),
  };
  const tags = {
    schemaVersion: 1,
    registry: completion.registry,
    complete: true,
    reasons: [],
    sourceSha256: "",
    observations: completion.packages.map(
      (pkg) => ({
        name: pkg.name,
        recordedVersion: pkg.version,
        publishedVersion: pkg.version,
        distTag: "latest",
        distTagVersion: pkg.version,
        matched: true,
      }),
    ),
  };
  const supplemental = {
    schemaVersion: 1,
    sourceSha256: "",
    issues: [
      {
        issue: 155,
        checks: [
          {
            id: "affected-runtime-repeat-build",
            status: "passed",
          },
        ],
      },
      {
        issue: 156,
        checks: [
          "consumer-declarations",
          "corpd-tsgo-workaround-removed",
        ].map((id) => ({ id, status: "passed" })),
      },
      {
        issue: 157,
        checks: [
          {
            id: "corpd-frame-lazy",
            status: "passed",
          },
        ],
      },
      {
        issue: 158,
        checks: [
          {
            id: "corpd-typed-svg-child-selector",
            status: "passed",
          },
        ],
      },
    ],
  };
  const pulls = [212, 189, 179, 166, 216].map(
    (number) => ({
      number,
      merged: true,
      merged_at: "2026-10-25T12:00:00Z",
      merge_commit_sha: "a".repeat(40),
      base: {
        ref: "main",
        repo: { full_name: "qmu/plgg" },
      },
    }),
  );
  const run = () => {
    const bytes = JSON.stringify(completion);
    const hash = createHash("sha256")
      .update(bytes)
      .digest("hex");
    return buildIssueCloseLedger(
      bytes,
      JSON.stringify({
        ...tags,
        sourceSha256: tags.sourceSha256 || hash,
      }),
      JSON.stringify({
        ...supplemental,
        sourceSha256:
          supplemental.sourceSha256 || hash,
      }),
      pulls,
    );
  };
  return {
    completion,
    tags,
    supplemental,
    pulls,
    run,
  };
};

test("joins merges, versions, latest and successful gates into all four closure decisions", () => {
  const ledger = fixture().run();
  strictEqual(ledger.complete, true);
  deepStrictEqual(
    ledger.issues.map((issue) => issue.issue),
    [155, 156, 157, 158],
  );
  strictEqual(
    ledger.issues.every(
      (issue) =>
        issue.canClose &&
        issue.blockers.length === 0,
    ),
    true,
  );
});
for (const number of [212, 189, 179, 166, 216]) {
  test(`unmerged PR ${number} prevents its dependent issue closure`, () => {
    const f = fixture();
    const pull = f.pulls.find(
      (entry) => entry.number === number,
    );
    if (!pull) throw Error("fixture");
    pull.merged = false;
    strictEqual(f.run().complete, false);
    strictEqual(
      f
        .run()
        .issues.some((issue) =>
          issue.blockers.includes(
            `pr-not-merged:${number}`,
          ),
        ),
      true,
    );
  });
}
test("wrong base repository and missing merge commit fail closed", () => {
  const f = fixture();
  for (const pull of f.pulls) {
    pull.base.repo.full_name = "other/plgg";
    pull.merge_commit_sha = "";
  }
  strictEqual(
    f
      .run()
      .issues.every((issue) => !issue.canClose),
    true,
  );
});
test("duplicate PR facts are not counted as merge evidence", () => {
  const f = fixture();
  f.pulls.push(...f.pulls);
  strictEqual(f.run().complete, false);
});
test("a successful Linux restart cannot replace affected-runtime proof", () => {
  const f = fixture();
  f.supplemental.issues =
    f.supplemental.issues.filter(
      (issue) => issue.issue !== 155,
    );
  const ledger = f.run();
  strictEqual(
    ledger.issues.find(
      (issue) => issue.issue === 155,
    )?.canClose,
    false,
  );
  strictEqual(
    ledger.issues.find(
      (issue) => issue.issue === 157,
    )?.canClose,
    true,
  );
});
test("the corpd workaround, declarations and UI observations remain mandatory", () => {
  const f = fixture();
  for (const issue of f.supplemental.issues)
    for (const check of issue.checks)
      check.status = "pending";
  strictEqual(
    f
      .run()
      .issues.every((issue) => !issue.canClose),
    true,
  );
});
test("consumer failure cannot be overridden by complete true", () => {
  const f = fixture();
  for (const check of f.completion.checks)
    check.status = "failed";
  strictEqual(
    f
      .run()
      .issues.every((issue) => !issue.canClose),
    true,
  );
});
test("duplicate consumer checks fail closed", () => {
  const f = fixture();
  f.completion.checks.push(
    ...f.completion.checks,
  );
  strictEqual(f.run().complete, false);
});
for (const field of ["tags", "supplemental"]) {
  test(`${field} from another completion snapshot is rejected`, () => {
    const f = fixture();
    if (field === "tags")
      f.tags.sourceSha256 = "b".repeat(64);
    else
      f.supplemental.sourceSha256 = "b".repeat(
        64,
      );
    strictEqual(
      f
        .run()
        .issues.every((issue) => !issue.canClose),
      true,
    );
  });
}
test("latest drift, stale published version, and duplicate observations block publication", () => {
  for (const mode of [
    "latest",
    "version",
    "duplicate",
  ]) {
    const f = fixture();
    for (const observation of f.tags
      .observations) {
      if (mode === "latest")
        observation.distTagVersion = "0.0.1";
      if (mode === "version")
        observation.publishedVersion = "0.0.1";
    }
    if (mode === "duplicate")
      f.tags.observations.push(
        ...f.tags.observations,
      );
    strictEqual(
      f
        .run()
        .issues.every((issue) => !issue.canClose),
      true,
    );
  }
});
test("minimum versions reject old and prerelease versions but permit later stable releases", () => {
  for (const version of [
    "0.0.6",
    "0.0.7-rc.1",
    "01.0.0",
    "0.0.10",
  ]) {
    const f = fixture();
    for (const pkg of f.completion.packages)
      pkg.version = version;
    for (const observation of f.tags
      .observations) {
      observation.recordedVersion = version;
      observation.publishedVersion = version;
      observation.distTagVersion = version;
    }
    strictEqual(
      f.run().complete,
      version === "0.0.10",
    );
  }
});
test("incomplete upstream boundary and wrong runtime block all issues", () => {
  const f = fixture();
  f.completion.complete = false;
  f.completion.node = "v22.23.4";
  strictEqual(
    f
      .run()
      .issues.every((issue) => !issue.canClose),
    true,
  );
});
test("atomic save replaces stale success with blocked decision and cleans failed rename", () => {
  const directory = mkdtempSync(
    join(tmpdir(), "issue-close-test-"),
  );
  const output = join(directory, "ledger.json");
  try {
    const f = fixture();
    saveIssueCloseLedger(output, f.run());
    f.completion.complete = false;
    const blocked = f.run();
    saveIssueCloseLedger(output, blocked);
    deepStrictEqual(
      JSON.parse(readFileSync(output, "utf8")),
      blocked,
    );
    throws(() =>
      saveIssueCloseLedger(
        output,
        fixture().run(),
        () => {
          throw Error("rename failed");
        },
      ),
    );
    deepStrictEqual(
      JSON.parse(readFileSync(output, "utf8")),
      blocked,
    );
    deepStrictEqual(readdirSync(directory), [
      "ledger.json",
    ]);
  } finally {
    rmSync(directory, {
      recursive: true,
      force: true,
    });
  }
});

test("malformed JSON never becomes a closable ledger", () => {
  throws(() =>
    buildIssueCloseLedger("{", "{}", "{}", []),
  );
});

test("empty objects produce four blocked decisions without echoing unknown fields", () => {
  const ledger = buildIssueCloseLedger(
    '{"secret":"do-not-copy"}',
    "{}",
    "{}",
    [],
  );
  strictEqual(
    ledger.issues.every(
      (issue) => !issue.canClose,
    ),
    true,
  );
  strictEqual(
    JSON.stringify(ledger).includes(
      "do-not-copy",
    ),
    false,
  );
});

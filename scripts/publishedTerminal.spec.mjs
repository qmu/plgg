import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  classify,
  runTerminal,
} from "./publishedTerminal.mjs";

const ids = [
  "bundle-restart",
  "consumer-ts7",
  "svg-elements",
  "raw-identity",
  "frame-dispatch",
  "lazy-subtree",
];
const names = [
  "plgg",
  "plgg-bundle",
  "plgg-view",
];
function evidence() {
  return {
    schemaVersion: 1,
    registry: "https://registry.npmjs.org",
    node: "v24.22.1",
    checkedAt: "2026-10-25T00:00:00.000Z",
    consumerCompilers: { ts7: "7.0.2" },
    complete: true,
    packages: names.map((name) => ({
      name,
      version: "1.0.0",
      sha256: "a".repeat(64),
      sha512: `sha512-${"A".repeat(86)}==`,
    })),
    checks: ids.map((id) => ({
      id,
      status: "passed",
    })),
  };
}
function tags() {
  return {
    schemaVersion: 1,
    registry: "https://registry.npmjs.org",
    complete: true,
    reasons: [],
    observations: names.map((name) => ({
      name,
      matched: true,
    })),
  };
}
const classify24 = (input, tag = tags()) =>
  classify(input, tag, "v24.22.1");

test("all four boundaries must pass; runtime and consumer majors are required", () => {
  assert.equal(
    classify24(evidence()).complete,
    true,
  );
  assert.deepEqual(
    classify(evidence(), tags(), "v22.0.0")
      .reasons,
    ["environment"],
  );
  const input = evidence();
  input.consumerCompilers.ts7 = "6.0.3";
  assert.deepEqual(classify24(input).reasons, [
    "invalid-evidence",
  ]);
});
test("fixed classifications for acquisition, compile, tests and tags coexist", () => {
  const input = evidence();
  input.complete = false;
  input.packages.pop();
  input.checks[1] = {
    id: "consumer-ts7",
    status: "failed",
    phase: "first-build",
    reason: "secret arbitrary text",
  };
  input.checks[2].status = "failed";
  const tag = tags();
  tag.observations[0].matched = false;
  assert.deepEqual(
    classify24(input, tag).reasons,
    [
      "npm-acquisition",
      "consumer-compile",
      "test",
      "dist-tag",
    ],
  );
  input.checks[1].phase = "install";
  assert.equal(
    classify24(input).reasons.includes(
      "consumer-compile",
    ),
    false,
  );
});
test("missing, duplicate and malformed records fail closed", () => {
  for (const mutate of [
    (input) => input.checks.pop(),
    (input) => input.checks.push(input.checks[0]),
    (input) => {
      input.checks[0].status = "unknown";
    },
    (input) => {
      input.packages[0].sha256 = "invalid";
    },
    (input) => {
      input.packages[0] = input.packages[1];
    },
    (input) => {
      input.complete = false;
    },
    (input) => {
      input.checks.forEach((check) => {
        check.status = "blocked";
      });
    },
    (input) => {
      input.infrastructure = "blocked";
    },
  ]) {
    const input = evidence();
    mutate(input);
    assert.equal(
      classify24(input).complete,
      false,
    );
  }
  assert.equal(
    classify24(null, null).complete,
    false,
  );
});
test("consumer-only incompleteness does not become a dist-tag failure", () => {
  const input = evidence();
  input.complete = false;
  input.checks[1].status = "failed";
  const tag = tags();
  tag.complete = false;
  tag.reasons = ["consumer-checks-incomplete"];
  assert.deepEqual(
    classify24(input, tag).reasons,
    ["consumer-compile"],
  );
  tag.reasons.push("registry-unavailable:plgg");
  assert.deepEqual(
    classify24(input, tag).reasons,
    ["consumer-compile", "dist-tag"],
  );
});
async function fixture(run) {
  const directory = await mkdtemp(
    join(tmpdir(), "terminal-test-"),
  );
  try {
    await run(directory);
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
}
const options = (input = evidence()) => ({
  node: "v24.22.1",
  produce: async (path) =>
    writeFile(path, JSON.stringify(input)),
  bindTags: async (source) => {
    assert.deepEqual(source, input);
    return tags();
  },
});
test("single terminal JSON strips unknown fields and replaces stale success on failure", () =>
  fixture(async (directory) => {
    const output = join(directory, "final.json");
    const input = evidence();
    input.secret = "must-not-appear";
    assert.equal(
      (await runTerminal(output, options(input)))
        .complete,
      true,
    );
    assert.equal(
      (await readFile(output, "utf8")).includes(
        "must-not-appear",
      ),
      false,
    );
    const failed = await runTerminal(output, {
      ...options(),
      produce: async () => {
        throw Error("must-not-appear");
      },
    });
    assert.equal(failed.complete, false);
    assert.ok(
      failed.reasons.includes(
        "producer-unavailable",
      ),
    );
    assert.deepEqual(
      JSON.parse(await readFile(output, "utf8")),
      failed,
    );
    assert.deepEqual(await readdir(directory), [
      "final.json",
    ]);
  }));
test("tag exceptions retain consumer failures and never copy diagnostics", () =>
  fixture(async (directory) => {
    const input = evidence();
    input.complete = false;
    input.checks[1].status = "failed";
    const output = join(directory, "final.json");
    const result = await runTerminal(output, {
      ...options(input),
      bindTags: async () => {
        throw Error("private diagnostic");
      },
    });
    assert.ok(
      result.reasons.includes("consumer-compile"),
    );
    assert.ok(
      result.reasons.includes("dist-tag"),
    );
    assert.equal(
      (await readFile(output, "utf8")).includes(
        "private diagnostic",
      ),
      false,
    );
  }));
test("rename failure preserves old file, removes temporary file, rejects", () =>
  fixture(async (directory) => {
    const output = join(directory, "final.json");
    await writeFile(output, "old");
    await assert.rejects(
      runTerminal(output, {
        ...options(),
        rename: async () => {
          throw Error("disk");
        },
      }),
    );
    assert.equal(
      await readFile(output, "utf8"),
      "old",
    );
    assert.deepEqual(await readdir(directory), [
      "final.json",
    ]);
  }));
test("CLI saves incomplete JSON and exits 1 when producer dependencies are missing", () =>
  fixture(async (directory) => {
    const output = join(directory, "final.json");
    const result = spawnSync(
      process.execPath,
      [
        "scripts/publishedTerminal.mjs",
        output,
        directory,
      ],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 1);
    assert.equal(
      JSON.parse(await readFile(output, "utf8"))
        .complete,
      false,
    );
    assert.ok(
      result.stdout.includes(
        "producer-unavailable",
      ),
    );
  }));

test("CLI exits 0 only after persisting a complete result", () =>
  fixture(async (directory) => {
    await writeFile(
      join(directory, "publishedCompletion.mjs"),
      `import { writeFile } from 'node:fs/promises'; export async function generate(path) { await writeFile(path, ${JSON.stringify(JSON.stringify(evidence()))}); }`,
    );
    await writeFile(
      join(directory, "publishedTagLedger.ts"),
      `export async function bindPublishedTags() { return ${JSON.stringify(tags())}; }`,
    );
    const output = join(directory, "final.json");
    const result = spawnSync(
      process.execPath,
      [
        "scripts/publishedTerminal.mjs",
        output,
        directory,
      ],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      JSON.parse(await readFile(output, "utf8"))
        .complete,
      true,
    );
  }));

test("unexecuted probes after acquisition failure are not compile or test failures", () => {
  const input = evidence();
  input.packages = [];
  input.complete = false;
  input.checks.forEach((check) => {
    check.status = "blocked";
  });
  const result = classify24(input);
  assert.deepEqual(result.reasons, [
    "npm-acquisition",
  ]);
});

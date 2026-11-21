import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { planWorkflow, run } from "./node24Workflows.ts";

const baseline = (name: string): string =>
  readFileSync(
    new URL(`./fixtures/node24-workflows/${name}.yml`, import.meta.url),
    "utf8",
  );

test("the unique plan is idempotent and preserves the single publisher", () => {
  const tests = planWorkflow("run-tests", baseline("run-tests"));
  assert.match(tests, /fail-fast: false/);
  assert.match(tests, /node: \["22.x", "24.x"\]/);
  assert.match(tests, /node-version: \$\{\{ matrix.node \}\}/);
  for (const name of ["run-tests", "deploy-guide"]) {
    const target = planWorkflow(name, baseline(name));
    assert.equal(planWorkflow(name, target), target);
    assert.equal((target.match(/actions\/checkout@v5/g) ?? []).length, 1);
    assert.equal((target.match(/actions\/setup-node@v5/g) ?? []).length, 1);
  }
  const deploy = planWorkflow("deploy-guide", baseline("deploy-guide"));
  assert.match(deploy, /node-version: "22.x"/);
  assert.doesNotMatch(deploy, /matrix:|strategy:/);
  assert.equal((deploy.match(/run: npm run deploy/g) ?? []).length, 1);
});

test("rejects unknown, drifted and partially edited workflows", () => {
  assert.throws(() => planWorkflow("other", ""));
  const source = baseline("run-tests");
  assert.throws(() => planWorkflow("run-tests", source + "\n"));
  assert.throws(() =>
    planWorkflow("run-tests", source.replace("checkout@v4", "checkout@v5")),
  );
});

test("check is read-only, write converges, and drift preflights both files", () => {
  const root = mkdtempSync(join(tmpdir(), "node24-workflows-"));
  const directory = join(root, ".github/workflows");
  mkdirSync(directory, { recursive: true });
  const tests = join(directory, "run-tests.yml");
  const deploy = join(directory, "deploy-guide.yml");
  try {
    writeFileSync(tests, baseline("run-tests"));
    writeFileSync(deploy, baseline("deploy-guide") + "\n");
    assert.throws(() => run(root, "--write"));
    assert.equal(readFileSync(tests, "utf8"), baseline("run-tests"));
    writeFileSync(deploy, baseline("deploy-guide"));
    assert.equal(run(root, "--check"), 1);
    assert.equal(readFileSync(tests, "utf8"), baseline("run-tests"));
    assert.equal(run(root, "--write"), 0);
    assert.equal(run(root, "--check"), 0);
    const generated = readFileSync(tests, "utf8");
    assert.equal(run(root, "--write"), 0);
    assert.equal(readFileSync(tests, "utf8"), generated);
    assert.throws(() => run(root, "--unknown"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  validateNpmTimeOrder,
  commitPublishedTimeOrder,
} from "./commitPublishedTimeOrder.mjs";

const fields = ["fetchedAt", "preflightAt", "publishedAt", "checkedAt"];
const fixture = () => ({
  complete: true,
  npmTimeline: Object.fromEntries(
    fields.map((key, i) => [key, `2026-10-25T12:00:0${i}.000Z`]),
  ),
});

test("ordered and equal milliseconds are accepted", () => {
  const value = fixture();
  assert.equal(validateNpmTimeOrder(value), value);
  for (const key of fields)
    value.npmTimeline[key] = value.npmTimeline.fetchedAt;
  assert.equal(validateNpmTimeOrder(value), value);
});
for (const key of fields.slice(1)) {
  test(`rejects reversal at ${key} and preserves prior terminal bytes`, async () => {
    const dir = await mkdtemp(join(tmpdir(), "npm-time-"));
    try {
      const candidate = join(dir, "candidate.json");
      const output = join(dir, "terminal.json");
      const value = fixture();
      value.npmTimeline[key] = "2026-10-25T11:59:59.999Z";
      await writeFile(candidate, JSON.stringify(value));
      await writeFile(output, "prior terminal bytes");
      await assert.rejects(commitPublishedTimeOrder(candidate, output), {
        message: "npm-time-order-reversed",
      });
      assert.equal(await readFile(output, "utf8"), "prior terminal bytes");
      assert.deepEqual((await readdir(dir)).sort(), [
        "candidate.json",
        "terminal.json",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}
for (const invalid of [
  undefined,
  null,
  0,
  "",
  "2026-02-30T12:00:00.000Z",
  "2026-10-25",
  "2026-10-25T12:00:00+00:00",
  "not-a-date",
]) {
  test(`invalid timestamp ${JSON.stringify(invalid)}`, () => {
    for (const key of fields) {
      const value = fixture();
      value.npmTimeline[key] = invalid;
      assert.throws(() => validateNpmTimeOrder(value), {
        message: "invalid-npm-timestamp",
      });
    }
  });
}
test("missing timeline and incomplete evidence fail closed", () => {
  for (const value of [null, [], {}, { ...fixture(), complete: false }])
    assert.throws(() => validateNpmTimeOrder(value), {
      message: "incomplete-terminal-evidence",
    });
  assert.throws(() => validateNpmTimeOrder({ complete: true }), {
    message: "invalid-npm-timestamp",
  });
});
test("CLI commits exact valid bytes, rejects invalid JSON without leaking input", async () => {
  const dir = await mkdtemp(join(tmpdir(), "npm-time-"));
  try {
    const input = join(dir, "candidate.json");
    const output = join(dir, "terminal.json");
    const bytes = JSON.stringify(fixture(), null, 2) + "\n";
    await writeFile(input, bytes);
    await commitPublishedTimeOrder(input, output);
    assert.equal(await readFile(output, "utf8"), bytes);
    await assert.rejects(commitPublishedTimeOrder(input, input), {
      message: "distinct-paths-required",
    });
    await writeFile(input, "private-invalid-json");
    const run = spawnSync(
      process.execPath,
      ["scripts/commitPublishedTimeOrder.mjs", input, output],
      { encoding: "utf8" },
    );
    assert.equal(run.status, 1);
    assert.equal(run.stderr.trim(), "npm time order: invalid-terminal-json");
    assert.equal(await readFile(output, "utf8"), bytes);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

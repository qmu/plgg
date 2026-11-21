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
import { runGate } from "./gate-corpd-consumer.mjs";

function fixture(body) {
  const root = mkdtempSync(
    join(tmpdir(), "corpd-gate-test-"),
  );
  const output = join(
    root,
    ".corpd-consumer",
    "latest",
  );
  mkdirSync(
    join(
      root,
      "scripts",
      "fixtures",
      "corpd-consumer",
    ),
    {
      recursive: true,
    },
  );
  try {
    body(root, output);
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
}

const successfulRun =
  (calls) => (command, args, cwd) => {
    calls.push([command, args, cwd]);
    if (args[0] === "pack") {
      const filename = `${cwd.split("/").pop()}-test.tgz`;
      writeFileSync(
        join(args[3], filename),
        "packed bytes",
      );
      return {
        status: 0,
        output: JSON.stringify([{ filename }]),
      };
    }
    if (args[0] === "install")
      writeFileSync(
        join(cwd, "package-lock.json"),
        "{}",
      );
    return {
      status: 0,
      output:
        args[0] === "rev-parse"
          ? "revision\n"
          : "",
    };
  };

test("one isolated installation, TS7 check, two builds, DOM tests and fixed artifacts", () =>
  fixture((root, output) => {
    const calls = [];
    const result = runGate(
      root,
      output,
      successfulRun(calls),
      "24.1.0",
    );
    assert.equal(result.status, "passed");
    assert.equal(result.packages.length, 4);
    assert.ok(
      result.packages.every((p) =>
        /^[a-f0-9]{64}$/.test(p.sha256),
      ),
    );
    assert.equal(
      calls.filter(
        ([, args]) => args[0] === "install",
      ).length,
      1,
    );
    assert.equal(
      calls.filter(
        ([, args]) =>
          args[0] ===
          "node_modules/plgg-bundle/bin/plgg-bundle.mjs",
      ).length,
      2,
    );
    assert.equal(
      JSON.parse(
        readFileSync(
          join(output, "result.json"),
          "utf8",
        ),
      ).status,
      "passed",
    );
    assert.equal(
      readFileSync(
        join(output, "consumer-lock.json"),
        "utf8",
      ),
      "{}",
    );
  }));

test("a failed rerun replaces a previous green result and stops immediately", () =>
  fixture((root, output) => {
    runGate(
      root,
      output,
      successfulRun([]),
      "24.1.0",
    );
    const calls = [];
    const result = runGate(
      root,
      output,
      (...args) => {
        calls.push(args);
        return { status: 17, output: "failure" };
      },
      "24.1.0",
    );
    assert.equal(result.status, "failed");
    assert.equal(calls.length, 1);
    assert.equal(
      JSON.parse(
        readFileSync(
          join(output, "result.json"),
          "utf8",
        ),
      ).status,
      "failed",
    );
    assert.match(
      readFileSync(
        join(output, "gate.log"),
        "utf8",
      ),
      /failure/,
    );
  }));

test("rejects other Node majors without executing commands", () =>
  fixture((root, output) => {
    const result = runGate(
      root,
      output,
      () => {
        throw new Error("must not execute");
      },
      "22.0.0",
    );
    assert.equal(result.status, "failed");
    assert.match(result.error, /Node 24/);
  }));

test("refuses to remove directories outside the artifact namespace", () =>
  fixture((root) => {
    assert.throws(
      () => runGate(root, root),
      /Output must/,
    );
    assert.throws(
      () => runGate(root, join(root, "scripts")),
      /Output must/,
    );
  }));

test("compiler failure retains runtime evidence without reporting green", () =>
  fixture((root, output) => {
    const calls = [];
    const success = successfulRun(calls);
    const result = runGate(
      root,
      output,
      (command, args, cwd) => {
        const execution = success(
          command,
          args,
          cwd,
        );
        return args[0] ===
          "node_modules/typescript/bin/tsc"
          ? {
              status: 2,
              output: "declaration failure",
            }
          : execution;
      },
      "24.1.0",
    );
    assert.equal(result.status, "failed");
    assert.equal(
      result.steps.at(-1).name,
      "packed DOM acceptance #157 #158",
    );
    assert.equal(result.steps.at(-1).status, 0);
    assert.equal(
      calls.filter(
        ([, args]) =>
          args[0] ===
          "node_modules/plgg-bundle/bin/plgg-bundle.mjs",
      ).length,
      2,
    );
  }));

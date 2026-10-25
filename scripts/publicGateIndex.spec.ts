import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import {
  publicGateGeneratorVersion,
  readPublicGateArtifact,
  assertPublicGateIndexDestination,
  publicConsumerGates,
  node24CiEvidence,
  collectPublicGateIndex,
  writePublicGateIndex,
  type Gate,
} from "./publicGateIndex.ts";

const fixture = (
  run: (root: string) => void,
): void => {
  const root = mkdtempSync(
    join(tmpdir(), "public-gate-index-"),
  );
  try {
    run(root);
  } finally {
    rmSync(root, {
      recursive: true,
      force: true,
    });
  }
};

const gate = (name: string): Gate => ({
  package: name,
  executable: process.execPath,
  script: `${name}.mjs`,
  args: [],
  env: { INDEX_GATE_OPT_IN: "1" },
  command: `node ${name}.mjs`,
  prerequisite:
    "https://github.com/qmu/plgg/pull/195",
});

test("runs all gates, forces opt-in, suppresses child secrets and indexes failures", () => {
  fixture((root) => {
    writeFileSync(
      join(root, "pass.mjs"),
      'process.exit(process.env.INDEX_GATE_OPT_IN === "1" ? 0 : 1);',
    );
    writeFileSync(
      join(root, "fail.mjs"),
      'console.error("secret-must-not-escape"); process.exit(7);',
    );
    const index = collectPublicGateIndex(
      root,
      "24.0.0",
      [gate("fail"), gate("pass")],
    );
    assert.deepEqual(
      index.packages.map((entry) => [
        entry.package,
        entry.status,
        entry.reason,
      ]),
      [
        [
          "fail",
          "failed",
          "consumer-gate-failed",
        ],
        ["pass", "passed", "passed"],
      ],
    );
    assert.equal(
      index.packages[0]?.reproduction,
      "npx --yes --package=node@24 -c 'node fail.mjs'",
    );
    assert.equal(
      JSON.stringify(index).includes(
        "secret-must-not-escape",
      ),
      false,
    );
  });
});

test("missing gates and wrong Node are blocked, never passed or executed", () => {
  fixture((root) => {
    const execute = (): never => {
      throw new Error("must not execute");
    };
    assert.equal(
      collectPublicGateIndex(
        root,
        "24.0.0",
        [gate("missing")],
        execute,
      ).packages[0]?.reason,
      "gate-unavailable",
    );
    writeFileSync(join(root, "present.mjs"), "");
    const index = collectPublicGateIndex(
      root,
      "22.0.0",
      [gate("present")],
      execute,
    );
    assert.equal(
      index.packages[0]?.reason,
      "node-24-required",
    );
    assert.equal(
      index.packages[0]?.status,
      "blocked",
    );
  });
});

test("spawn errors and timeouts have fixed safe reasons and do not stop later gates", () => {
  fixture((root) => {
    writeFileSync(join(root, "present.mjs"), "");
    writeFileSync(join(root, "later.mjs"), "");
    for (const outcome of [
      { status: null },
      {
        status: null,
        error: new Error("secret"),
      },
    ]) {
      const index = collectPublicGateIndex(
        root,
        "24.0.0",
        [gate("present"), gate("later")],
        () => outcome,
      );
      assert.equal(index.packages.length, 2);
      assert.equal(
        index.packages[0]?.reason,
        "gate-execution-failed",
      );
      assert.equal(
        index.packages[0]?.status,
        "blocked",
      );
      assert.equal(
        JSON.stringify(index).includes("secret"),
        false,
      );
    }
  });
});

test("complete snapshot replaces stale failure entries atomically", () => {
  fixture((root) => {
    const output = join(root, "index.json");
    const failed = collectPublicGateIndex(
      root,
      "24.0.0",
      [gate("missing")],
    );
    writePublicGateIndex(output, failed);
    const green = collectPublicGateIndex(
      root,
      "24.0.0",
      [],
    );
    writePublicGateIndex(output, green);
    assert.deepEqual(
      JSON.parse(readFileSync(output, "utf8")),
      green,
    );
    assert.deepEqual(readdirSync(root), [
      "index.json",
    ]);
  });
});

test("write failure preserves previous index and removes temporary file", () => {
  fixture((root) => {
    // A directory cannot be atomically replaced by the index file.
    const index = collectPublicGateIndex(
      root,
      "24.0.0",
      [],
    );
    assert.throws(() =>
      writePublicGateIndex(root, index),
    );
    assert.deepEqual(readdirSync(root), []);
  });
});

test("CLI writes a complete index and exits nonzero when prerequisites are absent", () => {
  fixture((root) => {
    const output = join(root, "index.json");
    mkdirSync(join(root, "scripts"));
    for (const name of [
      "runPublicGateIndex.ts",
      "publicGateIndex.ts",
    ]) {
      copyFileSync(
        fileURLToPath(
          new URL(name, import.meta.url),
        ),
        join(root, "scripts", name),
      );
    }
    const cli = join(
      root,
      "scripts",
      "runPublicGateIndex.ts",
    );
    const result = spawnSync(
      process.execPath,
      [cli, output],
      {
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 1);
    const contents = readFileSync(output, "utf8");
    assert.match(
      contents,
      /"package": "plgg-test"/,
    );
    assert.match(
      contents,
      /"package": "plgg-md"/,
    );
    assert.match(contents, /"package": "plgg"/);
    assert.equal(
      contents.includes('"status": "passed"'),
      false,
    );
    assert.match(
      result.stdout,
      /plgg-test: blocked/,
    );
  });
});

test("all repeated package names are blocked before execution while unique gates still run", () => {
  fixture((root) => {
    writeFileSync(join(root, "unique.mjs"), "");
    writeFileSync(join(root, "repeated.mjs"), "");
    for (const nodeVersion of [
      "24.0.0",
      "22.0.0",
    ]) {
      const executed: string[] = [];
      const index = collectPublicGateIndex(
        root,
        nodeVersion,
        [
          gate("repeated"),
          gate("unique"),
          {
            ...gate("repeated"),
            script: "missing.mjs",
            command: "different command",
          },
          gate("repeated"),
        ],
        (entry) => {
          executed.push(entry.package);
          return { status: 0 };
        },
      );
      assert.deepEqual(
        executed,
        nodeVersion === "24.0.0"
          ? ["unique"]
          : [],
      );
      assert.deepEqual(
        index.packages
          .filter(
            (entry) =>
              entry.package === "repeated",
          )
          .map((entry) => [
            entry.status,
            entry.reason,
          ]),
        Array.from({ length: 3 }, () => [
          "blocked",
          "duplicate-package-name",
        ]),
      );
      const output = join(root, "index.json");
      writePublicGateIndex(output, index);
      assert.deepEqual(
        JSON.parse(readFileSync(output, "utf8")),
        index,
      );
      assert.equal(
        index.packages.some(
          (entry) => entry.status !== "passed",
        ),
        true,
      );
    }
  });
});

test("default public consumer gates have unique package names", () => {
  const names = publicConsumerGates.map(
    (entry) => entry.package,
  );
  assert.equal(new Set(names).size, names.length);
});

test("CLI exits nonzero and persists fixed duplicate reasons without running duplicate children", () => {
  fixture((root) => {
    const marker = join(root, "executed");
    const output = join(root, "index.json");
    const script = join(root, "child.mjs");
    writeFileSync(
      script,
      `import { writeFileSync } from "node:fs"; writeFileSync(${JSON.stringify(marker)}, "ran");`,
    );
    const moduleUrl = new URL(
      "./publicGateIndex.ts",
      import.meta.url,
    ).href;
    const cliUrl = new URL(
      "./runPublicGateIndex.ts",
      import.meta.url,
    ).href;
    const entry = { ...gate("repeated"), script };
    const result = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "--eval",
        `import { publicConsumerGates } from ${JSON.stringify(moduleUrl)};
publicConsumerGates.splice(0, publicConsumerGates.length, ${JSON.stringify(entry)}, ${JSON.stringify(entry)});
process.argv = [process.execPath, "runPublicGateIndex.ts", ${JSON.stringify(output)}];
await import(${JSON.stringify(cliUrl)});`,
      ],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 1);
    assert.match(
      result.stdout,
      /repeated: blocked \(duplicate-package-name\)/,
    );
    assert.equal(
      readdirSync(root).includes("executed"),
      false,
    );
    assert.deepEqual(
      JSON.parse(
        readFileSync(output, "utf8"),
      ).packages.map(
        (entry: {
          reason: string;
          status: string;
        }) => [entry.status, entry.reason],
      ),
      [
        ["blocked", "duplicate-package-name"],
        ["blocked", "duplicate-package-name"],
      ],
    );
  });
});

test("persists the generator version independently of the schema version", () => {
  fixture((root) => {
    const index = collectPublicGateIndex(
      root,
      "24.0.0",
      [],
    );
    const output = join(root, "index.json");
    writePublicGateIndex(output, index);
    const saved = JSON.parse(
      readFileSync(output, "utf8"),
    );
    assert.equal(
      saved.generatorVersion,
      index.generatorVersion,
    );
    assert.equal(saved.generatorVersion, "1.1.1");
    assert.equal(saved.schemaVersion, 1);
  });
});

test("rejects incompatible incoming and existing artifacts without changing files", () => {
  fixture((root) => {
    const output = join(root, "index.json");
    const index = collectPublicGateIndex(
      root,
      "24.0.0",
      [],
    );
    assert.throws(
      () =>
        writePublicGateIndex(output, {
          ...index,
          generatorVersion: "other",
        }),
      /generator version mismatch/,
    );
    assert.deepEqual(readdirSync(root), []);
    for (const previous of [
      { ...index, generatorVersion: "other" },
      { schemaVersion: 1, packages: [] },
      null,
      { ...index, generatorVersion: 1 },
    ]) {
      const contents = JSON.stringify(previous);
      writeFileSync(output, contents);
      assert.throws(
        () => writePublicGateIndex(output, index),
        /generator version mismatch/,
      );
      assert.equal(
        readFileSync(output, "utf8"),
        contents,
      );
      assert.deepEqual(readdirSync(root), [
        "index.json",
      ]);
    }
    writeFileSync(output, "{invalid");
    assert.throws(() =>
      writePublicGateIndex(output, index),
    );
    assert.equal(
      readFileSync(output, "utf8"),
      "{invalid",
    );
  });
});

test("CLI rejects an older artifact with a safe diagnostic and preserves it", () => {
  fixture((root) => {
    mkdirSync(join(root, "scripts"));
    for (const name of [
      "runPublicGateIndex.ts",
      "publicGateIndex.ts",
    ]) {
      copyFileSync(
        fileURLToPath(
          new URL(name, import.meta.url),
        ),
        join(root, "scripts", name),
      );
    }
    const output = join(root, "index.json");
    const previous = JSON.stringify({
      generatorVersion: "older",
      packages: [],
    });
    writeFileSync(output, previous);
    const result = spawnSync(
      process.execPath,
      [
        join(
          root,
          "scripts",
          "runPublicGateIndex.ts",
        ),
        output,
      ],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.match(
      result.stderr,
      /Public gate index could not be saved/,
    );
    assert.equal(
      readFileSync(output, "utf8"),
      previous,
    );
    assert.deepEqual(readdirSync(root).sort(), [
      "index.json",
      "scripts",
    ]);
  });
});

test("CLI rejects incompatible destinations before executing children", () => {
  fixture((root) => {
    const output = join(root, "index.json");
    const marker = join(root, "executed");
    const script = join(root, "child.mjs");
    writeFileSync(
      script,
      `import { writeFileSync } from "node:fs"; writeFileSync(${JSON.stringify(marker)}, "ran");`,
    );
    const moduleUrl = new URL(
      "./publicGateIndex.ts",
      import.meta.url,
    ).href;
    const cliUrl = new URL(
      "./runPublicGateIndex.ts",
      import.meta.url,
    ).href;
    const entry = {
      ...gate("probe"),
      script: relative(
        fileURLToPath(
          new URL("..", import.meta.url),
        ),
        script,
      ),
    };
    const run = (evidence?: string) =>
      spawnSync(
        process.execPath,
        [
          "--input-type=module",
          "--eval",
          `import { publicConsumerGates } from ${JSON.stringify(moduleUrl)};
Object.defineProperty(process.versions, "node", { value: "24.0.0" });
publicConsumerGates.splice(0, publicConsumerGates.length, ${JSON.stringify(entry)});
process.argv = [process.execPath, "runPublicGateIndex.ts", ${JSON.stringify(output)}, ...${JSON.stringify(evidence === undefined ? [] : [evidence])}];
await import(${JSON.stringify(cliUrl)});`,
        ],
        { encoding: "utf8" },
      );
    for (const previous of [
      '{"generatorVersion":"older"}',
      '{"generatorVersion":1}',
      "{}",
      "null",
      "{invalid",
    ]) {
      writeFileSync(output, previous);
      const result = run();
      assert.equal(result.status, 1);
      assert.equal(result.stdout, "");
      assert.match(
        result.stderr,
        /Public gate index could not be saved\./,
      );
      assert.equal(
        readFileSync(output, "utf8"),
        previous,
      );
      assert.deepEqual(readdirSync(root).sort(), [
        "child.mjs",
        "index.json",
      ]);
    }
    writeFileSync(
      output,
      JSON.stringify(
        collectPublicGateIndex(
          root,
          "24.0.0",
          [],
        ),
      ),
    );
    const compatible = run();
    assert.equal(compatible.status, 1);
    assert.match(
      compatible.stdout,
      /Node 24 CI: unknown; complete: false/,
    );
    assert.match(
      compatible.stdout,
      /probe: passed/,
    );
    assert.equal(
      readFileSync(marker, "utf8"),
      "ran",
    );
  });
});

test("writer rechecks a destination changed after preflight", () => {
  fixture((root) => {
    const output = join(root, "index.json");
    const index = collectPublicGateIndex(
      root,
      "24.0.0",
      [],
    );
    writePublicGateIndex(output, index);
    assertPublicGateIndexDestination(output);
    const changed =
      '{"generatorVersion":"other"}';
    writeFileSync(output, changed);
    assert.throws(
      () => writePublicGateIndex(output, index),
      /generator version mismatch/,
    );
    assert.equal(
      readFileSync(output, "utf8"),
      changed,
    );
    assert.deepEqual(readdirSync(root), [
      "index.json",
    ]);
  });
});

test("CI evidence is unique, sanitized and fails closed", () => {
  const url =
    "https://github.com/qmu/plgg/actions/runs/123/job/456";
  for (const status of [
    "passed",
    "failed",
    "pending",
  ]) {
    assert.deepEqual(
      node24CiEvidence({
        status,
        url,
        nodeMajor: 24,
        secret: "omit",
      }),
      { status, url, nodeMajor: 24 },
    );
  }
  for (const value of [
    undefined,
    null,
    {},
    { status: "passed", url, nodeMajor: 22 },
    {
      status: "passed",
      url: url + "?token=secret",
      nodeMajor: 24,
    },
    {
      status: "passed",
      url: "https://github.com/other/repo/actions/runs/123/job/456",
      nodeMajor: 24,
    },
  ]) {
    assert.deepEqual(node24CiEvidence(value), {
      status: "unknown",
    });
  }
  assert.deepEqual(
    node24CiEvidence({
      status: "permission-wait",
      reason: "workflows-permission-required",
      secret: "omit",
    }),
    {
      status: "permission-wait",
      reason: "workflows-permission-required",
      issue:
        "https://github.com/qmu/plgg/issues/171",
    },
  );
});

test("local success requires passing Node 24 CI evidence for completion", () => {
  fixture((root) => {
    writeFileSync(join(root, "pass.mjs"), "");
    const collect = (
      evidence: unknown,
      status = 0,
    ) =>
      collectPublicGateIndex(
        root,
        "24.0.0",
        [gate("pass")],
        () => ({ status }),
        evidence,
      );
    const evidence = {
      status: "passed",
      url: "https://github.com/qmu/plgg/actions/runs/123/job/456",
      nodeMajor: 24,
    };
    assert.equal(
      collect(undefined).complete,
      false,
    );
    assert.equal(
      collect({
        status: "permission-wait",
        reason: "workflows-permission-required",
      }).complete,
      false,
    );
    assert.equal(
      collect({ ...evidence, status: "pending" })
        .complete,
      false,
    );
    assert.equal(
      collect({ ...evidence, status: "failed" })
        .complete,
      false,
    );
    assert.equal(
      collect(evidence).complete,
      true,
    );
    assert.equal(
      collect(evidence, 1).complete,
      false,
    );
    assert.equal(
      collectPublicGateIndex(
        root,
        "24.0.0",
        [],
        undefined,
        evidence,
      ).complete,
      false,
    );
  });
});

test("artifact reader rejects parent and absolute references before reading", () => {
  fixture((root) => {
    // None of these files exists: a read would throw ENOENT instead.
    for (const path of [
      "",
      "../outside.json",
      "nested/../evidence.json",
      "nested/../../outside.json",
      "/outside.json",
      "C:/outside.json",
      "C:outside.json",
      "C:\\outside.json",
      "\\\\server\\share\\outside.json",
      "//server/share/outside.json",
      "nested\\..\\outside.json",
      "bad\0.json",
    ]) {
      assert.throws(
        () => readPublicGateArtifact(root, path),
        {
          message:
            "Invalid public gate artifact relative path.",
        },
      );
    }
  });
});

test("artifact reader accepts nested relative JSON and reports invalid JSON", () => {
  fixture((root) => {
    mkdirSync(join(root, "evidence"));
    writeFileSync(
      join(root, "evidence", "ci.json"),
      '{"status":"passed"}',
    );
    assert.deepEqual(
      readPublicGateArtifact(
        root,
        "evidence/ci.json",
      ),
      {
        status: "passed",
      },
    );
    assert.deepEqual(
      readPublicGateArtifact(
        root,
        "./evidence/ci.json",
      ),
      {
        status: "passed",
      },
    );
    writeFileSync(
      join(root, "evidence", "ci.json"),
      "invalid",
    );
    assert.throws(
      () =>
        readPublicGateArtifact(
          root,
          "evidence/ci.json",
        ),
      SyntaxError,
    );
  });
});

test("CLI rejects unsafe evidence references before executing consumers or replacing output", () => {
  fixture((temporary) => {
    const root = join(temporary, "checkout");
    mkdirSync(root);
    const evidence = JSON.stringify({
      status: "passed",
      nodeMajor: 24,
      url: "https://github.com/qmu/plgg/actions/runs/1/job/1",
    });
    writeFileSync(
      join(temporary, "outside.json"),
      evidence,
    );
    writeFileSync(
      join(root, "ci.json"),
      evidence,
    );
    mkdirSync(join(root, "nested"));
    mkdirSync(join(root, "scripts"));
    for (const name of [
      "runPublicGateIndex.ts",
      "publicGateIndex.ts",
    ]) {
      copyFileSync(
        new URL(name, import.meta.url),
        join(root, "scripts", name),
      );
    }
    writeFileSync(
      join(
        root,
        "scripts",
        "gate-public-tarball-node24.sh",
      ),
      "touch child-ran",
    );
    const output = join(root, "index.json");
    const previous = JSON.stringify({
      generatorVersion:
        publicGateGeneratorVersion,
    });
    writeFileSync(output, previous);
    for (const reference of [
      "../outside.json",
      join(temporary, "outside.json"),
      "nested/../ci.json",
      "C:/outside.json",
    ]) {
      const result = spawnSync(
        process.execPath,
        [
          join(
            root,
            "scripts",
            "runPublicGateIndex.ts",
          ),
          output,
          reference,
        ],
        { encoding: "utf8" },
      );
      assert.equal(result.status, 1);
      assert.equal(result.stdout, "");
      assert.equal(
        result.stderr.trim(),
        "Public gate index could not be saved.",
      );
      assert.equal(
        readFileSync(output, "utf8"),
        previous,
      );
      assert.equal(
        readdirSync(root).includes("child-ran"),
        false,
      );
    }
  });
});

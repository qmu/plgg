import { test } from "node:test";
import {
  strictEqual,
  throws,
  rejects,
  deepStrictEqual,
} from "node:assert";
import {
  mkdtemp,
  writeFile,
  readFile,
  readdir,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  validateNpmContext,
  commitNpmContext,
} from "./commitNpmContext.ts";

const names = [
  "plgg",
  "plgg-bundle",
  "plgg-view",
];
const fixture = () => ({
  schemaVersion: 1,
  complete: true,
  node: "v24.22.1",
  consumerTypeScript: "7.0.2",
  packages: names.map((name) => ({
    name,
    version: "1.0.0",
  })),
  npmContext: {
    registry: "https://registry.npmjs.org",
    fetchedAt: "2026-10-25T12:00:00.000Z",
    latest: Object.fromEntries(
      names.map((name) => [name, "1.0.0"]),
    ),
  },
  npmResults: names.map((name) => ({
    name,
    version: "1.0.0",
    latest: "1.0.0",
    registry: "https://registry.npmjs.org",
    fetchedAt: "2026-10-25T12:00:00.000Z",
  })),
});

test("one context accepts reordered results and package-specific latest versions", () => {
  const input = fixture();
  input.packages[0]!.version = "2.0.0";
  input.npmResults[0]!.version = "2.0.0";
  input.npmResults[0]!.latest = "2.0.0";
  input.npmContext.latest.plgg = "2.0.0";
  input.npmResults.reverse();
  validateNpmContext(input);
});
for (const name of names) {
  for (const [field, value, reason] of [
    [
      "registry",
      "https://mirror.example/npm",
      "npm-registry-mismatch",
    ],
    [
      "fetchedAt",
      "2026-10-25T12:00:01.000Z",
      "npm-fetch-time-mismatch",
    ],
    ["latest", "1.0.1", "npm-latest-mismatch"],
    ["version", "1.0.1", "npm-latest-mismatch"],
  ]) {
    test(`${name}: rejects mixed ${field}`, () => {
      const input = fixture();
      const result = input.npmResults.find(
        (item) => item.name === name,
      );
      if (!result || !field || !value || !reason)
        throw Error("fixture");
      Object.assign(result, { [field]: value });
      throws(() => validateNpmContext(input), {
        message: reason,
      });
    });
  }
}
for (const [label, change] of Object.entries({
  "missing context": (
    input: ReturnType<typeof fixture>,
  ) => {
    Reflect.deleteProperty(input, "npmContext");
  },
  "missing registry": (
    input: ReturnType<typeof fixture>,
  ) => {
    Reflect.deleteProperty(
      input.npmResults[0]!,
      "registry",
    );
  },
  "invalid date": (
    input: ReturnType<typeof fixture>,
  ) => {
    input.npmContext.fetchedAt =
      "2026-02-30T12:00:00.000Z";
  },
  credentials: (
    input: ReturnType<typeof fixture>,
  ) => {
    input.npmContext.registry =
      "https://secret:secret@registry.npmjs.org";
  },
  "duplicate results": (
    input: ReturnType<typeof fixture>,
  ) => {
    input.npmResults[0]!.name = "plgg-view";
  },
  "missing package": (
    input: ReturnType<typeof fixture>,
  ) => {
    input.packages.pop();
  },
  "extra latest": (
    input: ReturnType<typeof fixture>,
  ) => {
    input.npmContext.latest.extra = "1.0.0";
  },
  "stale shared latest": (
    input: ReturnType<typeof fixture>,
  ) => {
    input.npmContext.latest.plgg = "0.9.0";
    input.npmResults[0]!.latest = "0.9.0";
  },
  incomplete: (
    input: ReturnType<typeof fixture>,
  ) => {
    input.complete = false;
  },
  "wrong Node": (
    input: ReturnType<typeof fixture>,
  ) => {
    input.node = "v22.0.0";
  },
  "wrong TS": (
    input: ReturnType<typeof fixture>,
  ) => {
    input.consumerTypeScript = "6.0.3";
  },
}))
  test(`rejects ${label}`, () => {
    const input = fixture();
    change(input);
    throws(() => validateNpmContext(input));
  });

test("atomic boundary preserves old bytes on mixed input, malformed JSON and rename failure", async () => {
  const dir = await mkdtemp(
    join(tmpdir(), "npm-context-"),
  );
  try {
    const candidate = join(dir, "candidate.json");
    const output = join(dir, "terminal.json");
    await writeFile(output, "old-ledger\n");
    const input = fixture();
    input.npmResults[1]!.latest = "2.0.0";
    await writeFile(
      candidate,
      JSON.stringify(input),
    );
    await rejects(
      commitNpmContext(candidate, output),
      {
        message: "npm-latest-mismatch",
      },
    );
    strictEqual(
      await readFile(output, "utf8"),
      "old-ledger\n",
    );
    await writeFile(candidate, "{");
    await rejects(
      commitNpmContext(candidate, output),
      {
        message: "invalid-terminal-json",
      },
    );
    strictEqual(
      await readFile(output, "utf8"),
      "old-ledger\n",
    );
    const bytes =
      JSON.stringify(fixture(), null, 2) + "\n";
    await writeFile(candidate, bytes);
    await rejects(
      commitNpmContext(candidate, dir),
    );
    deepStrictEqual((await readdir(dir)).sort(), [
      "candidate.json",
      "terminal.json",
    ]);
    await commitNpmContext(candidate, output);
    strictEqual(
      await readFile(output, "utf8"),
      bytes,
    );
  } finally {
    await rm(dir, {
      recursive: true,
      force: true,
    });
  }
});

test("CLI rejects without exposing input and commits consistent candidate", async () => {
  const dir = await mkdtemp(
    join(tmpdir(), "npm-context-cli-"),
  );
  try {
    const candidate = join(dir, "candidate.json");
    const output = join(dir, "terminal.json");
    const run = () =>
      spawnSync(
        process.execPath,
        [
          "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
          "scripts/commitNpmContext.ts",
          candidate,
          output,
        ],
        { encoding: "utf8" },
      );
    await writeFile(
      candidate,
      '{"secret":"DO-NOT-ECHO"}',
    );
    const failure = run();
    strictEqual(failure.status, 1);
    strictEqual(failure.stdout, "");
    strictEqual(
      failure.stderr,
      "npm-context-commit-rejected\n",
    );
    await writeFile(
      candidate,
      JSON.stringify(fixture()),
    );
    const success = run();
    strictEqual(success.status, 0);
    strictEqual(
      success.stdout,
      "npm-context-committed\n",
    );
  } finally {
    await rm(dir, {
      recursive: true,
      force: true,
    });
  }
});

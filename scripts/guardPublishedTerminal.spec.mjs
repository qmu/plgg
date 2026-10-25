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
import { guardPublishedTerminal } from "./guardPublishedTerminal.mjs";

const names = [
  "plgg",
  "plgg-bundle",
  "plgg-view",
];
const registry = "https://registry.npmjs.org";
async function scenario(options, check) {
  const directory = await mkdtemp(
    join(tmpdir(), "plgg-tag-guard-"),
  );
  const target = join(directory, "terminal.json");
  const checkpoint = join(
    directory,
    "resume.json",
  );
  const calls = [];
  await writeFile(target, "previous-ledger\n");
  try {
    const result = await guardPublishedTerminal(
      target,
      checkpoint,
      {
        readLatest: async (name) => {
          calls.push(name);
          return options.read
            ? options.read(name, calls.length)
            : "0.0.1";
        },
        runTerminal: async (candidate) => {
          calls.push("produce");
          // A restart point is already durable when acquisition starts.
          assert.equal(
            JSON.parse(
              await readFile(checkpoint, "utf8"),
            ).restartFrom,
            "acquisition",
          );
          if (options.failProducer)
            throw Error("secret-diagnostic");
          await writeFile(
            candidate,
            JSON.stringify({
              registry,
              complete: options.complete ?? true,
              packages: names.map((name) => ({
                name,
                version:
                  options.acquired ?? "0.0.1",
              })),
            }),
          );
          return { complete: true };
        },
        ...(options.rename
          ? { rename: options.rename }
          : {}),
      },
    );
    const saved = JSON.parse(
      await readFile(checkpoint, "utf8"),
    );
    assert.deepEqual(saved, result);
    assert.equal(saved.complete, false);
    assert.ok(
      !JSON.stringify(saved).includes(
        "secret-diagnostic",
      ),
    );
    assert.deepEqual(
      (await readdir(directory)).sort(),
      ["resume.json", "terminal.json"],
    );
    await check({
      result,
      calls,
      contents: await readFile(target, "utf8"),
    });
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
}

test("stable tags commit only after acquisition and the second observation", async () => {
  await scenario(
    {},
    ({ result, calls, contents }) => {
      assert.equal(result.reason, "committed");
      assert.equal(result.restartFrom, null);
      assert.deepEqual(calls, [
        ...names,
        "produce",
        ...names,
      ]);
      assert.equal(
        JSON.parse(contents).complete,
        true,
      );
    },
  );
});

for (const changed of names) {
  test(`concurrent publication of ${changed} preserves ledger and requires fresh acquisition`, async () => {
    await scenario(
      {
        read: (name, count) =>
          count > 4 && name === changed
            ? "0.0.2"
            : "0.0.1",
      },
      ({ result, contents }) => {
        assert.equal(
          result.reason,
          "dist-tag-conflict",
        );
        assert.equal(
          result.restartFrom,
          "acquisition",
        );
        assert.equal(
          result.initial.find(
            (item) => item.name === changed,
          ).latest,
          "0.0.1",
        );
        assert.equal(
          result.final.find(
            (item) => item.name === changed,
          ).latest,
          "0.0.2",
        );
        assert.equal(
          contents,
          "previous-ledger\n",
        );
      },
    );
  });
}

for (const [label, options, reason] of [
  [
    "initial read error",
    {
      read: () => {
        throw Error("secret-diagnostic");
      },
    },
    "initial-tag-unavailable",
  ],
  [
    "initial malformed tag",
    {
      read: () => ({
        token: "secret-diagnostic",
      }),
    },
    "initial-tag-unavailable",
  ],
  [
    "final read error",
    {
      read: (name, count) => {
        if (count > 4)
          throw Error("secret-diagnostic");
        return "0.0.1";
      },
    },
    "final-tag-unavailable",
  ],
  [
    "acquisition raced initial snapshot",
    { acquired: "0.0.2" },
    "candidate-not-bound-to-initial-tags",
  ],
  [
    "incomplete producer",
    { complete: false },
    "candidate-not-bound-to-initial-tags",
  ],
  [
    "producer exception",
    { failProducer: true },
    "terminal-boundary-failed",
  ],
  [
    "commit rename failure",
    {
      rename: async () => {
        throw Error("secret-diagnostic");
      },
    },
    "terminal-boundary-failed",
  ],
]) {
  test(`${label} cannot finalize`, async () => {
    await scenario(
      options,
      ({ result, calls, contents }) => {
        assert.equal(result.reason, reason);
        assert.equal(
          result.restartFrom,
          "acquisition",
        );
        assert.equal(
          contents,
          "previous-ledger\n",
        );
        if (reason === "initial-tag-unavailable")
          assert.ok(!calls.includes("produce"));
      },
    );
  });
}

test("checkpoint must differ from terminal path", async () => {
  await assert.rejects(
    guardPublishedTerminal(
      "same.json",
      "same.json",
    ),
    /distinct-paths-required/,
  );
});

test("retry after conflict reacquires instead of promoting a saved candidate", async () => {
  const directory = await mkdtemp(
    join(tmpdir(), "plgg-tag-retry-"),
  );
  const target = join(directory, "terminal.json");
  const checkpoint = join(
    directory,
    "resume.json",
  );
  let reads = 0;
  let acquisitions = 0;
  const options = {
    readLatest: async () =>
      ++reads <= 3 ? "0.0.1" : "0.0.2",
    runTerminal: async (candidate) => {
      acquisitions++;
      await writeFile(
        candidate,
        JSON.stringify({
          registry,
          complete: true,
          packages: names.map((name) => ({
            name,
            version:
              acquisitions === 1
                ? "0.0.1"
                : "0.0.2",
          })),
        }),
      );
    },
  };
  try {
    assert.equal(
      (
        await guardPublishedTerminal(
          target,
          checkpoint,
          options,
        )
      ).reason,
      "dist-tag-conflict",
    );
    await assert.rejects(readFile(target), {
      code: "ENOENT",
    });
    assert.equal(
      (
        await guardPublishedTerminal(
          target,
          checkpoint,
          options,
        )
      ).reason,
      "committed",
    );
    assert.equal(acquisitions, 2);
    assert.equal(
      JSON.parse(await readFile(target, "utf8"))
        .packages[0].version,
      "0.0.2",
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});

test("checkpoint persistence failure blocks acquisition", async () => {
  const directory = await mkdtemp(
    join(tmpdir(), "plgg-tag-save-"),
  );
  let called = false;
  try {
    await assert.rejects(
      guardPublishedTerminal(
        join(directory, "terminal.json"),
        directory,
        {
          readLatest: async () => {
            called = true;
            return "0.0.1";
          },
        },
      ),
    );
    assert.equal(called, false);
    assert.deepEqual(
      await readdir(directory),
      [],
    );
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});

test("default registry reader validates latest metadata and disables caching", async (context) => {
  const directory = await mkdtemp(
    join(tmpdir(), "plgg-tag-http-"),
  );
  let requests = 0;
  context.mock.method(
    globalThis,
    "fetch",
    async (url, options) => {
      requests++;
      assert.equal(options.cache, "no-store");
      assert.equal(options.redirect, "error");
      assert.ok(
        options.signal instanceof AbortSignal,
      );
      const name = names.find(
        (item) => url === `${registry}/${item}`,
      );
      assert.ok(name);
      return Response.json({
        name,
        "dist-tags": { latest: "0.0.1" },
      });
    },
  );
  try {
    const result = await guardPublishedTerminal(
      join(directory, "terminal.json"),
      join(directory, "resume.json"),
      {
        runTerminal: async (candidate) =>
          writeFile(
            candidate,
            JSON.stringify({
              registry,
              complete: true,
              packages: names.map((name) => ({
                name,
                version: "0.0.1",
              })),
            }),
          ),
      },
    );
    assert.equal(result.reason, "committed");
    assert.equal(requests, 6);
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
});

for (const mode of [
  "stable",
  "conflict",
  "missing-producer",
]) {
  test(`CLI ${mode} exit code and checkpoint match the actual commit`, async () => {
    const { spawnSync } =
      await import("node:child_process");
    const directory = await mkdtemp(
      join(tmpdir(), "plgg-tag-cli-"),
    );
    const target = join(
      directory,
      "terminal.json",
    );
    const checkpoint = join(
      directory,
      "resume.json",
    );
    const loader = join(directory, "loader.mjs");
    try {
      await writeFile(
        loader,
        `let reads = 0;
        globalThis.fetch = async (url) => Response.json({
          name: url.split('/').pop(),
          'dist-tags': { latest: ${JSON.stringify(mode)} === 'conflict' && ++reads > 3 ? '0.0.2' : '0.0.1' }
        });`,
      );
      if (mode !== "missing-producer")
        await writeFile(
          join(
            directory,
            "publishedTerminal.mjs",
          ),
          `
        import { writeFile } from 'node:fs/promises';
        export async function runTerminal(output) {
          await writeFile(output, JSON.stringify({
            registry: ${JSON.stringify(registry)}, complete: true,
            packages: ${JSON.stringify(names)}.map(name => ({ name, version: '0.0.1' }))
          }));
        }`,
        );
      const child = spawnSync(
        process.execPath,
        [
          "--import",
          loader,
          new URL(
            "./guardPublishedTerminal.mjs",
            import.meta.url,
          ).pathname,
          target,
          checkpoint,
          directory,
        ],
        { encoding: "utf8" },
      );
      assert.equal(
        child.status,
        mode === "stable" ? 0 : 1,
        child.stderr,
      );
      assert.match(
        child.stdout,
        /published terminal guard:/,
      );
      const state = JSON.parse(
        await readFile(checkpoint, "utf8"),
      );
      assert.equal(
        state.reason,
        mode === "stable"
          ? "committed"
          : mode === "conflict"
            ? "dist-tag-conflict"
            : "terminal-boundary-failed",
      );
      if (mode === "stable")
        assert.equal(
          JSON.parse(
            await readFile(target, "utf8"),
          ).complete,
          true,
        );
      else
        await assert.rejects(readFile(target), {
          code: "ENOENT",
        });
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });
}

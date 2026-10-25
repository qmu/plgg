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
import { createHash } from "node:crypto";
import {
  readResumeFetch,
  saveResumeFetch,
} from "./publishResumeFetch.ts";

const registry = "https://registry.npmjs.org/";
const pkg = {
  registry,
  name: "plgg",
  version: "0.0.27",
  latestTag: "0.0.27",
};
const envelope = {
  registry,
  fetchedAt: "2026-10-25T12:00:00.000Z",
  packages: [pkg],
};

test("same-registry JSON becomes a #229-compatible context", () => {
  assert.deepEqual(readResumeFetch(envelope), {
    registry,
    fetchedAt: envelope.fetchedAt,
    packages: [
      {
        name: pkg.name,
        version: pkg.version,
        latestTag: pkg.latestTag,
      },
    ],
    distTagGeneration: createHash("sha256")
      .update("plgg@0.0.27#0.0.27")
      .digest("hex"),
  });
});

test("generation is order-independent and null latest is retained", () => {
  const second = {
    ...pkg,
    name: "plgg-view",
    latestTag: null,
  };
  const first = readResumeFetch({
    ...envelope,
    packages: [second, pkg],
  });
  assert.deepEqual(
    first,
    readResumeFetch({
      ...envelope,
      packages: [pkg, second],
    }),
  );
  assert.equal(
    first.packages[1]?.latestTag,
    null,
  );
});

for (const other of [
  "https://other.example/",
  "https://registry.npmjs.org/private/",
  "http://registry.npmjs.org/",
  "https://registry.npmjs.org",
]) {
  test(`rejects distinct registry identity: ${other}`, () => {
    assert.throws(
      () =>
        readResumeFetch({
          ...envelope,
          packages: [
            pkg,
            {
              ...pkg,
              name: "plgg-view",
              registry: other,
            },
          ],
        }),
      /mixed-registry/,
    );
  });
}

for (const value of [
  undefined,
  null,
  "",
  42,
  "not a URL",
  "https://user:secret@example.test/",
  "https://example.test/?token=secret",
]) {
  test(`rejects malformed package registry (${typeof value})`, () => {
    assert.throws(
      () =>
        readResumeFetch({
          ...envelope,
          packages: [{ ...pkg, registry: value }],
        }),
      /invalid package registry/,
    );
  });
}

for (const input of [
  null,
  [],
  {},
  { ...envelope, registry: "" },
  { ...envelope, fetchedAt: "yesterday" },
  { ...envelope, fetchedAt: "2026-10-25" },
  { ...envelope, packages: [] },
  { ...envelope, packages: {} },
  { ...envelope, packages: [null] },
  {
    ...envelope,
    packages: [{ ...pkg, version: 27 }],
  },
  {
    ...envelope,
    packages: [{ ...pkg, latestTag: undefined }],
  },
  { ...envelope, packages: [pkg, pkg] },
]) {
  test("rejects malformed or ambiguous acquisition input", () => {
    assert.throws(() => readResumeFetch(input));
  });
}

test("later mismatched result cannot overwrite saved context or leave temporary files", async () => {
  const dir = await mkdtemp(
    join(tmpdir(), "resume-fetch-"),
  );
  try {
    const source = join(dir, "input.json");
    const destination = join(dir, "context.json");
    await writeFile(
      destination,
      "previous valid context\n",
    );
    await writeFile(
      source,
      JSON.stringify({
        ...envelope,
        packages: [
          pkg,
          {
            ...pkg,
            name: "plgg-view",
            registry: "https://other.example/",
          },
        ],
      }),
    );
    await assert.rejects(
      saveResumeFetch(source, destination),
      /mixed-registry/,
    );
    assert.equal(
      await readFile(destination, "utf8"),
      "previous valid context\n",
    );
    assert.deepEqual(
      (await readdir(dir)).sort(),
      ["context.json", "input.json"],
    );
    await writeFile(
      source,
      JSON.stringify(envelope),
    );
    await saveResumeFetch(source, destination);
    assert.deepEqual(
      JSON.parse(
        await readFile(destination, "utf8"),
      ),
      readResumeFetch(envelope),
    );
  } finally {
    await rm(dir, {
      recursive: true,
      force: true,
    });
  }
});

test("CLI rejects malformed JSON without creating output or echoing input", async () => {
  const dir = await mkdtemp(
    join(tmpdir(), "resume-fetch-cli-"),
  );
  try {
    const source = join(dir, "input.json");
    await writeFile(
      source,
      '{"secret":"DO-NOT-PRINT",',
    );
    const result = spawnSync(
      process.execPath,
      [
        "scripts/publishResumeFetch.ts",
        source,
        join(dir, "output.json"),
      ],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /context rejected/,
    );
    assert.doesNotMatch(
      result.stderr + result.stdout,
      /DO-NOT-PRINT/,
    );
    assert.deepEqual(await readdir(dir), [
      "input.json",
    ]);
  } finally {
    await rm(dir, {
      recursive: true,
      force: true,
    });
  }
});

test("CLI refuses mixed registries before creating output and accepts a corrected acquisition", async () => {
  const dir = await mkdtemp(
    join(tmpdir(), "resume-fetch-cli-"),
  );
  try {
    const source = join(dir, "input.json");
    const destination = join(dir, "context.json");
    await writeFile(
      source,
      JSON.stringify({
        ...envelope,
        packages: [
          {
            ...pkg,
            registry: "https://other.example/",
          },
          pkg,
        ],
      }),
    );
    const rejected = spawnSync(
      process.execPath,
      [
        "scripts/publishResumeFetch.ts",
        source,
        destination,
      ],
      { encoding: "utf8" },
    );
    assert.equal(rejected.status, 1);
    assert.match(
      rejected.stderr,
      /context rejected/,
    );
    assert.deepEqual(await readdir(dir), [
      "input.json",
    ]);
    await writeFile(
      source,
      JSON.stringify(envelope),
    );
    const accepted = spawnSync(
      process.execPath,
      [
        "scripts/publishResumeFetch.ts",
        source,
        destination,
      ],
      { encoding: "utf8" },
    );
    assert.equal(
      accepted.status,
      0,
      accepted.stderr,
    );
    assert.deepEqual(
      JSON.parse(
        await readFile(destination, "utf8"),
      ),
      readResumeFetch(envelope),
    );
  } finally {
    await rm(dir, {
      recursive: true,
      force: true,
    });
  }
});

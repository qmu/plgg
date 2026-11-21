import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
  mkdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  commitPublishedMonotonic,
  comparePublishedVersions,
} from "./commitPublishedMonotonic.mjs";

const ledger = (version, bundle = "1.0.0") => ({
  complete: true,
  packages: [
    { name: "plgg", version },
    { name: "plgg-bundle", version: bundle },
  ],
});
async function scenario(run) {
  const directory = await mkdtemp(
    join(tmpdir(), "plgg-monotonic-"),
  );
  const target = join(directory, "terminal.json");
  const candidate = join(
    directory,
    "candidate.json",
  );
  const put = (path, value) =>
    writeFile(path, JSON.stringify(value));
  try {
    await run({
      directory,
      target,
      candidate,
      put,
    });
  } finally {
    await rm(directory, {
      recursive: true,
      force: true,
    });
  }
}

test("semver precedence uses numeric core, prerelease ordering, and ignores build metadata", () => {
  const sequence = [
    "1.0.0-alpha",
    "1.0.0-alpha.1",
    "1.0.0-alpha.beta",
    "1.0.0-beta",
    "1.0.0-beta.2",
    "1.0.0-beta.11",
    "1.0.0-rc.1",
    "1.0.0",
    "1.0.1",
    "1.1.0",
    "1.10.0",
    "2.0.0",
    "9007199254740993.0.0",
  ];
  for (
    let index = 1;
    index < sequence.length;
    index++
  ) {
    assert.equal(
      comparePublishedVersions(
        sequence[index - 1],
        sequence[index],
      ),
      -1,
    );
    assert.equal(
      comparePublishedVersions(
        sequence[index],
        sequence[index - 1],
      ),
      1,
    );
  }
  assert.equal(
    comparePublishedVersions(
      "1.0.0+build.01",
      "1.0.0+other",
    ),
    0,
  );
  assert.equal(
    comparePublishedVersions(
      "1.0.0-9007199254740993",
      "1.0.0-9007199254740992",
    ),
    1,
  );
  for (const invalid of [
    "01.0.0",
    "1.0",
    "v1.0.0",
    "1.0.0\n",
    "1.0.0-01",
    "1.0.0-",
    "1.0.0+",
    "1.0.0-a..b",
    null,
  ])
    assert.throws(() =>
      comparePublishedVersions(invalid, "1.0.0"),
    );
});

test("first save, equal precedence, and higher versions commit checked bytes", async () =>
  scenario(async ({ target, candidate, put }) => {
    for (const version of [
      "1.0.0-rc.1",
      "1.0.0",
      "1.0.0+new",
      "1.10.0",
      "2.0.0",
    ]) {
      await put(candidate, ledger(version));
      await commitPublishedMonotonic(
        candidate,
        target,
      );
      assert.equal(
        await readFile(target, "utf8"),
        await readFile(candidate, "utf8"),
      );
    }
  }));

for (const [before, after] of [
  ["2.0.0", "1.99.99"],
  ["1.10.0", "1.9.99"],
  ["1.0.2", "1.0.1"],
  ["1.0.0", "1.0.0-rc.1"],
  ["1.0.0-beta.11", "1.0.0-beta.2"],
]) {
  test(`refuses ${before} -> ${after} without changing the previous ledger`, async () =>
    scenario(
      async ({
        directory,
        target,
        candidate,
        put,
      }) => {
        await put(target, ledger(before));
        const original = await readFile(
          target,
          "utf8",
        );
        await put(
          candidate,
          ledger(after, "99.0.0"),
        );
        await assert.rejects(
          commitPublishedMonotonic(
            candidate,
            target,
          ),
          /package-version-regression/,
        );
        assert.equal(
          await readFile(target, "utf8"),
          original,
        );
        assert.deepEqual(
          (await readdir(directory)).sort(),
          ["candidate.json", "terminal.json"],
        );
      },
    ));
}

test("matches packages by name, and refuses a lower second package despite a higher first", async () =>
  scenario(async ({ target, candidate, put }) => {
    await put(target, ledger("1.0.0", "2.0.0"));
    const next = ledger("9.0.0", "1.0.0");
    next.packages.reverse();
    await put(candidate, next);
    await assert.rejects(
      commitPublishedMonotonic(candidate, target),
      /package-version-regression/,
    );
  }));

test("malformed baseline or candidate, missing package, duplicates, and incomplete candidate fail closed", async () =>
  scenario(async ({ target, candidate, put }) => {
    for (const invalid of [
      {},
      { packages: [] },
      {
        packages: [
          { name: "plgg", version: "01.0.0" },
        ],
      },
      {
        packages: [
          { name: "plgg", version: "1.0.0" },
          { name: "plgg", version: "2.0.0" },
        ],
      },
    ]) {
      await put(target, invalid);
      const original = await readFile(
        target,
        "utf8",
      );
      await put(candidate, ledger("2.0.0"));
      await assert.rejects(
        commitPublishedMonotonic(
          candidate,
          target,
        ),
      );
      assert.equal(
        await readFile(target, "utf8"),
        original,
      );
      await put(target, ledger("1.0.0"));
      await put(candidate, {
        ...invalid,
        complete: true,
      });
      await assert.rejects(
        commitPublishedMonotonic(
          candidate,
          target,
        ),
      );
    }
    await put(target, ledger("1.0.0"));
    await put(candidate, {
      complete: true,
      packages: [
        { name: "plgg", version: "2.0.0" },
      ],
    });
    await assert.rejects(
      commitPublishedMonotonic(candidate, target),
      /previous-package-missing/,
    );
    await put(candidate, {
      ...ledger("2.0.0"),
      complete: false,
    });
    await assert.rejects(
      commitPublishedMonotonic(candidate, target),
      /candidate-incomplete/,
    );
    await writeFile(target, "not JSON");
    await put(candidate, ledger("2.0.0"));
    await assert.rejects(
      commitPublishedMonotonic(candidate, target),
    );
    assert.equal(
      await readFile(target, "utf8"),
      "not JSON",
    );
  }));

test("incomplete previous evidence cannot erase a higher recorded version", async () =>
  scenario(async ({ target, candidate, put }) => {
    await put(target, {
      ...ledger("2.0.0"),
      complete: false,
    });
    await put(candidate, ledger("1.0.0"));
    await assert.rejects(
      commitPublishedMonotonic(candidate, target),
      /package-version-regression/,
    );
  }));

test("busy lock is preserved; retry rereads the newly committed baseline", async () =>
  scenario(async ({ target, candidate, put }) => {
    await put(target, ledger("1.0.0"));
    await put(candidate, ledger("2.0.0"));
    await mkdir(`${target}.lock`);
    await assert.rejects(
      commitPublishedMonotonic(candidate, target),
      { code: "EEXIST" },
    );
    await put(target, ledger("3.0.0"));
    await rm(`${target}.lock`, {
      recursive: true,
    });
    await assert.rejects(
      commitPublishedMonotonic(candidate, target),
      /package-version-regression/,
    );
  }));

test("concurrent writers never let the lower candidate replace the higher ledger", async () =>
  scenario(
    async ({
      target,
      candidate,
      directory,
      put,
    }) => {
      const higher = join(
        directory,
        "higher.json",
      );
      await put(target, ledger("1.0.0"));
      await put(candidate, ledger("2.0.0"));
      await put(higher, ledger("3.0.0"));
      await Promise.allSettled([
        commitPublishedMonotonic(higher, target),
        commitPublishedMonotonic(
          candidate,
          target,
        ),
      ]);
      await commitPublishedMonotonic(
        higher,
        target,
      );
      await assert.rejects(
        commitPublishedMonotonic(
          candidate,
          target,
        ),
        /package-version-regression/,
      );
      assert.equal(
        JSON.parse(await readFile(target, "utf8"))
          .packages[0].version,
        "3.0.0",
      );
    },
  ));

test("read failures clean up only this writer's lock", async () =>
  scenario(
    async ({
      target,
      candidate,
      directory,
      put,
    }) => {
      await assert.rejects(
        commitPublishedMonotonic(
          candidate,
          target,
        ),
      );
      assert.deepEqual(
        await readdir(directory),
        [],
      );
      await put(candidate, ledger("1.0.0"));
      await mkdir(target);
      await assert.rejects(
        commitPublishedMonotonic(
          candidate,
          target,
        ),
      );
      assert.deepEqual(
        (await readdir(directory)).sort(),
        ["candidate.json", "terminal.json"],
      );
    },
  ));

test("CLI returns 0 for committed and 1 for refusal, without echoing raw input", async () =>
  scenario(async ({ target, candidate, put }) => {
    const run = () =>
      spawnSync(
        process.execPath,
        [
          "scripts/commitPublishedMonotonic.mjs",
          candidate,
          target,
        ],
        { encoding: "utf8" },
      );
    await put(candidate, ledger("2.0.0"));
    assert.equal(run().status, 0);
    await put(candidate, {
      ...ledger("1.0.0"),
      diagnostic: "private-input",
    });
    const refused = run();
    assert.equal(refused.status, 1);
    assert.ok(
      !`${refused.stdout}${refused.stderr}`.includes(
        "private-input",
      ),
    );
  }));

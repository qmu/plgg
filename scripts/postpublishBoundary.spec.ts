import { test } from "node:test";
import {
  strictEqual,
  deepStrictEqual,
  throws,
} from "node:assert";
import { createHash } from "node:crypto";
import {
  decode,
  inspect,
} from "./postpublishBoundary.ts";
const commit = "a".repeat(40);
const head = "b".repeat(40);
const plan = [155, 156, 157, 158].map(
  (issue) => ({
    issue,
    package:
      issue <= 156 ? "plgg-bundle" : "plgg-view",
    commit,
    version: "0.0.7",
    rollback: "0.0.6",
  }),
);
const bytes = new Uint8Array([1, 2, 3]);
const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
const deps = {
  ancestor: () => true,
  manifest: (_commit: string, name: string) => ({
    name,
    version: "0.0.7",
  }),
  metadata: async (
    name: string,
    version: string,
  ) => ({
    name,
    version,
    gitHead: head,
    dist: {
      integrity,
      tarball: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`,
    },
  }),
  tarball: async () => bytes,
};
test("accepts all four integrated and published fixes", async () => {
  const result = await inspect(plan, deps);
  strictEqual(result.complete, true);
  strictEqual(result.results.length, 4);
  strictEqual(
    result.results.every(
      (r) => r.rollbackTarget === null,
    ),
    true,
  );
});
test("rejects missing, duplicate, mistyped and conflicting plans", () => {
  for (const value of [
    null,
    [],
    plan.slice(1),
    [...plan.slice(1), plan[1]],
    plan.map((e) => ({ ...e, commit: "main" })),
    plan.map((e) => ({
      ...e,
      rollback: e.version,
    })),
    plan.map((e) => ({ ...e, package: "other" })),
    plan.map((e) => ({
      ...e,
      version:
        e.issue === 155 ? "0.0.8" : e.version,
    })),
  ])
    throws(() => decode(value), /INVALID_PLAN/);
});
test("unmerged fix never reaches registry and returns exact rollback", async () => {
  const result = await inspect(plan, {
    ...deps,
    ancestor: () => false,
    metadata: async () => {
      throw new Error("must not fetch");
    },
  });
  deepStrictEqual(
    result.results.map((r) => r.reason),
    Array(4).fill("FIX_NOT_IN_MAIN"),
  );
  strictEqual(
    result.results[0]?.rollbackTarget,
    "plgg-bundle@0.0.6",
  );
});
test("old published commit fails even when fix is merged", async () => {
  const result = await inspect(plan, {
    ...deps,
    ancestor: (source, target) =>
      !(source === commit && target === head),
  });
  strictEqual(
    result.results[0]?.reason,
    "PUBLISHED_COMMIT_MISMATCH",
  );
});
test("validates registry data, manifest, URL, and downloaded bytes", async () => {
  for (const [expected, overrides] of [
    [
      "INVALID_REGISTRY_METADATA",
      { metadata: async () => ({}) },
    ],
    [
      "PUBLISHED_VERSION_MISMATCH",
      { manifest: () => ({}) },
    ],
    [
      "TARBALL_INTEGRITY_MISMATCH",
      {
        tarball: async () => new Uint8Array([4]),
      },
    ],
    [
      "EVIDENCE_UNAVAILABLE",
      {
        metadata: async () => {
          throw new Error("secret");
        },
      },
    ],
  ]) {
    if (
      typeof expected !== "string" ||
      typeof overrides !== "object"
    )
      throw new Error("test setup");
    const result = await inspect(plan, {
      ...deps,
      ...overrides,
    });
    strictEqual(
      result.results[0]?.reason,
      expected,
    );
    strictEqual(result.complete, false);
  }
});
test("rejects foreign registry URLs before downloading", async () => {
  const result = await inspect(plan, {
    ...deps,
    metadata: async (name, release) => ({
      ...(await deps.metadata(name, release)),
      dist: {
        integrity,
        tarball: "https://example.com/pkg.tgz",
      },
    }),
    tarball: async () => {
      throw new Error("must not fetch");
    },
  });
  strictEqual(
    result.results[0]?.reason,
    "UNSAFE_TARBALL_URL",
  );
});
test("continues independent issues and never echoes transport errors", async () => {
  const result = await inspect(plan, {
    ...deps,
    metadata: async (name, release) => {
      if (name === "plgg-bundle")
        throw new Error("SECRET");
      return deps.metadata(name, release);
    },
  });
  strictEqual(result.results[2]?.reason, "MATCH");
  strictEqual(
    JSON.stringify(result).includes("SECRET"),
    false,
  );
});

test("latest version drift fails with observed version", async () => {
  const result = await inspect(plan, {
    ...deps,
    metadata: async (name, release) => ({
      ...(await deps.metadata(name, release)),
      version: "0.0.8",
    }),
  });
  strictEqual(
    result.results[0]?.reason,
    "REGISTRY_VERSION_MISMATCH",
  );
  strictEqual(
    result.results[0]?.published?.version,
    "0.0.8",
  );
});
test("published head must also be integrated", async () => {
  const result = await inspect(plan, {
    ...deps,
    ancestor: (source, target) =>
      !(
        source === head &&
        target === "origin/main"
      ),
  });
  strictEqual(
    result.results[0]?.reason,
    "PUBLISHED_COMMIT_MISMATCH",
  );
});
test("rejects malformed integrity and URL credentials", async () => {
  for (const tarball of [
    "https://registry.npmjs.org.evil.test/pkg.tgz",
    "https://user:pass@registry.npmjs.org/plgg-bundle/-/plgg-bundle-0.0.7.tgz",
    "https://registry.npmjs.org/plgg-bundle/-/plgg-bundle-0.0.7.tgz?token=value",
  ]) {
    const result = await inspect(plan, {
      ...deps,
      metadata: async (name, release) => ({
        ...(await deps.metadata(name, release)),
        dist: { integrity, tarball },
      }),
    });
    strictEqual(
      result.results[0]?.reason,
      "UNSAFE_TARBALL_URL",
    );
    strictEqual(
      JSON.stringify(result).includes("pass@"),
      false,
    );
  }
  const result = await inspect(plan, {
    ...deps,
    metadata: async (name, release) => ({
      ...(await deps.metadata(name, release)),
      dist: {
        integrity: "sha1-wrong",
        tarball: "https://registry.npmjs.org/",
      },
    }),
  });
  strictEqual(
    result.results[0]?.reason,
    "INVALID_REGISTRY_METADATA",
  );
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  distTagGeneration,
  captureFetchContext,
  validateResume,
  describeRejection,
  type PkgSnapshot,
  type FetchContext,
} from "./publishResumeContext.ts";

const pkgs: ReadonlyArray<PkgSnapshot> = [
  {
    name: "plgg-bundle",
    version: "0.0.7",
    latestTag: "0.0.7",
  },
  {
    name: "plgg",
    version: "1.2.0",
    latestTag: "1.2.0",
  },
  {
    name: "plgg-view",
    version: "0.0.3",
    latestTag: "0.0.2",
  },
];

test("distTagGeneration: order-independent over the same packages", () => {
  const reversed = [...pkgs].reverse();
  assert.equal(
    distTagGeneration(pkgs),
    distTagGeneration(reversed),
  );
});

test("distTagGeneration: changes when a version moves", () => {
  const bumped = pkgs.map((p) =>
    p.name === "plgg-view"
      ? { ...p, version: "0.0.4" }
      : p,
  );
  assert.notEqual(
    distTagGeneration(pkgs),
    distTagGeneration(bumped),
  );
});

test("distTagGeneration: changes when the latest dist-tag moves", () => {
  const retagged = pkgs.map((p) =>
    p.name === "plgg-view"
      ? { ...p, latestTag: "0.0.3" }
      : p,
  );
  assert.notEqual(
    distTagGeneration(pkgs),
    distTagGeneration(retagged),
  );
});

test("captureFetchContext: sorts packages by name", () => {
  const ctx = captureFetchContext(
    "https://registry.npmjs.org",
    "2026-10-25T12:00:00.000Z",
    [...pkgs].reverse(),
  );
  assert.deepEqual(
    ctx.packages.map((p) => p.name),
    ["plgg", "plgg-bundle", "plgg-view"],
  );
  assert.equal(
    ctx.distTagGeneration,
    distTagGeneration(pkgs),
  );
});

const savedCtx: FetchContext = captureFetchContext(
  "https://registry.npmjs.org",
  "2026-10-25T12:00:00.000Z",
  pkgs,
);

test("validateResume: the identical context resumes cleanly", () => {
  const current = captureFetchContext(
    "https://registry.npmjs.org",
    "2026-10-25T12:05:00.000Z",
    pkgs,
  );
  assert.equal(validateResume(savedCtx, current), null);
});

test("validateResume: an exactly-equal fetchedAt is not rejected for time", () => {
  const current = captureFetchContext(
    savedCtx.registry,
    savedCtx.fetchedAt,
    pkgs,
  );
  assert.equal(validateResume(savedCtx, current), null);
});

test("validateResume: a different registry is rejected", () => {
  const current = captureFetchContext(
    "https://registry.internal.example",
    "2026-10-25T12:05:00.000Z",
    pkgs,
  );
  const rejection = validateResume(
    savedCtx,
    current,
  );
  assert.deepEqual(rejection, {
    reason: "registry-mismatch",
    saved: "https://registry.npmjs.org",
    current: "https://registry.internal.example",
  });
});

test("validateResume: a current fetch earlier than the saved one is rejected", () => {
  const current = captureFetchContext(
    savedCtx.registry,
    "2026-10-25T11:59:00.000Z",
    pkgs,
  );
  const rejection = validateResume(
    savedCtx,
    current,
  );
  assert.deepEqual(rejection, {
    reason: "non-monotonic-fetch",
    saved: "2026-10-25T12:00:00.000Z",
    current: "2026-10-25T11:59:00.000Z",
  });
});

test("validateResume: a package missing from the current fetch is rejected", () => {
  const current = captureFetchContext(
    savedCtx.registry,
    "2026-10-25T12:05:00.000Z",
    pkgs.filter((p) => p.name !== "plgg-view"),
  );
  const rejection = validateResume(
    savedCtx,
    current,
  );
  assert.deepEqual(rejection, {
    reason: "missing-package",
    name: "plgg-view",
  });
});

test("validateResume: a package outside the original set is rejected", () => {
  const current = captureFetchContext(
    savedCtx.registry,
    "2026-10-25T12:05:00.000Z",
    [
      ...pkgs,
      {
        name: "plgg-cms",
        version: "0.4.0",
        latestTag: "0.4.0",
      },
    ],
  );
  const rejection = validateResume(
    savedCtx,
    current,
  );
  assert.deepEqual(rejection, {
    reason: "unexpected-package",
    name: "plgg-cms",
  });
});

test("validateResume: a package version that moved since the failure is rejected", () => {
  const current = captureFetchContext(
    savedCtx.registry,
    "2026-10-25T12:05:00.000Z",
    pkgs.map((p) =>
      p.name === "plgg-view"
        ? {
            ...p,
            version: "0.0.4",
            latestTag: "0.0.4",
          }
        : p,
    ),
  );
  const rejection = validateResume(
    savedCtx,
    current,
  );
  assert.deepEqual(rejection, {
    reason: "package-version-mismatch",
    name: "plgg-view",
    saved: "0.0.3",
    current: "0.0.4",
  });
});

test("validateResume: a dist-tag retag with versions unchanged is rejected and names the mover", () => {
  const current = captureFetchContext(
    savedCtx.registry,
    "2026-10-25T12:05:00.000Z",
    pkgs.map((p) =>
      p.name === "plgg-view"
        ? { ...p, latestTag: "0.0.3" }
        : p,
    ),
  );
  const rejection = validateResume(
    savedCtx,
    current,
  );
  if (rejection === null) {
    assert.fail("expected a rejection");
  }
  assert.equal(
    rejection.reason,
    "dist-tag-generation-mismatch",
  );
  if (
    rejection.reason !==
    "dist-tag-generation-mismatch"
  ) {
    assert.fail(
      "expected dist-tag-generation-mismatch",
    );
  }
  assert.deepEqual(rejection.movedTags, [
    "plgg-view",
  ]);
});

test("describeRejection: names the registry change", () => {
  assert.match(
    describeRejection({
      reason: "registry-mismatch",
      saved: "https://registry.npmjs.org",
      current: "https://registry.internal.example",
    }),
    /different fetch context/,
  );
});

test("describeRejection: names the moved dist-tags", () => {
  assert.match(
    describeRejection({
      reason: "dist-tag-generation-mismatch",
      saved: "aaaa",
      current: "bbbb",
      movedTags: ["plgg-view"],
    }),
    /plgg-view/,
  );
});

test("describeRejection: names the moved package version", () => {
  assert.match(
    describeRejection({
      reason: "package-version-mismatch",
      name: "plgg-view",
      saved: "0.0.3",
      current: "0.0.4",
    }),
    /0\.0\.3.*0\.0\.4/,
  );
});

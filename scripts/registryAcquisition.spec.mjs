import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  acquireRegistryEvidence,
  validateRegistryEvidence,
} from "./registryAcquisition.mjs";

const data = Buffer.from("public tarball fixture");
const sha256 = createHash("sha256").update(data).digest("hex");
const sha512 = `sha512-${createHash("sha512").update(data).digest("base64")}`;
const registry = "https://registry.npmjs.org";
function fixture(complete = true) {
  return JSON.stringify({
    schemaVersion: 1,
    registry,
    node: "v24.22.1",
    consumerTypeScript: "7.0.2",
    checkedAt: "2026-10-25T10:00:00.000Z",
    complete,
    reason: complete ? "passed" : "consumer-evidence-incomplete",
    packages: ["plgg", "plgg-bundle", "plgg-view"].map((name) => ({
      name,
      version: "1.0.0",
      sha256,
      sha512,
    })),
    checks: [
      "bundle-restart",
      "consumer-ts7",
      "svg-elements",
      "raw-identity",
      "frame-dispatch",
      "lazy-subtree",
    ].map((id) => ({ id, status: complete ? "passed" : "failed" })),
  });
}
async function request(url) {
  if (url.endsWith(".tgz")) return new Response(data);
  const name = new URL(url).pathname.split("/")[1];
  return Response.json({
    name,
    version: "1.0.0",
    dist: { integrity: sha512, tarball: `${registry}/${name}/fixture.tgz` },
  });
}

test("one context contains registry, fetch time, exact versions and consumer evidence", async () => {
  const bytes = fixture();
  const result = await acquireRegistryEvidence(bytes, request);
  assert.equal(result.complete, true);
  assert.equal(
    validateRegistryEvidence(JSON.parse(JSON.stringify(result)), bytes)
      .complete,
    true,
  );
  assert.equal(result.acquisition.registry, registry);
  assert.ok(result.acquisition.fetchedAt);
  assert.equal(result.packages.length, 3);
});

test("reject mixed time, registry, operation, source and actual version", async () => {
  const bytes = fixture();
  const original = await acquireRegistryEvidence(bytes, request);
  for (const [key, value] of [
    ["fetchedAt", "2026-10-24T00:00:00.000Z"],
    ["registry", "https://example.org"],
    ["acquisitionId", "other"],
    ["sourceSha256", "0".repeat(64)],
  ]) {
    const mixed = structuredClone(original);
    mixed.packages[1].acquisition[key] = value;
    assert.throws(
      () => validateRegistryEvidence(mixed, bytes),
      /mixed-acquisition/,
    );
  }
  const mixed = structuredClone(original);
  mixed.packages[1].version = "2.0.0";
  assert.throws(
    () => validateRegistryEvidence(mixed, bytes),
    /mixed-acquisition/,
  );
  const another = await acquireRegistryEvidence(bytes, request);
  another.packages[0] = original.packages[0];
  assert.throws(
    () => validateRegistryEvidence(another, bytes),
    /mixed-acquisition/,
  );
});

test("reject changed source bytes, duplicate packages and forged completion", async () => {
  const bytes = fixture(false);
  const result = await acquireRegistryEvidence(bytes, request);
  assert.equal(result.complete, false);
  assert.throws(
    () => validateRegistryEvidence(result, `${bytes} `),
    /invalid-context/,
  );
  result.complete = true;
  assert.throws(
    () => validateRegistryEvidence(result, bytes),
    /mixed-consumer/,
  );
  const invalid = JSON.parse(fixture());
  invalid.packages[1] = invalid.packages[0];
  await assert.rejects(
    acquireRegistryEvidence(JSON.stringify(invalid), request),
    /invalid-package/,
  );
});

test("reject unavailable registry, mismatched metadata, redirected host and modified tarballs", async () => {
  for (const response of [
    new Response("", { status: 503 }),
    Response.json({ name: "wrong" }),
    Response.json({
      name: "plgg",
      version: "1.0.0",
      dist: { integrity: sha512, tarball: "https://example.org/fixture.tgz" },
    }),
  ]) {
    await assert.rejects(
      acquireRegistryEvidence(fixture(), async () => response),
    );
  }
  await assert.rejects(
    acquireRegistryEvidence(fixture(), async (url) =>
      url.endsWith(".tgz") ? new Response("tampered") : request(url),
    ),
    /tarball-hash-mismatch/,
  );
});

test("persist the whole context together and replace stale success on acquisition failure", async () => {
  const { mkdtemp, readFile, writeFile, readdir, rm } =
    await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { saveRegistryEvidence } = await import("./registryAcquisition.mjs");
  const directory = await mkdtemp(join(tmpdir(), "acquisition-"));
  const input = join(directory, "input.json");
  const output = join(directory, "output.json");
  try {
    await writeFile(input, fixture());
    await saveRegistryEvidence(input, output, request);
    const saved = JSON.parse(await readFile(output, "utf8"));
    assert.equal(validateRegistryEvidence(saved, fixture()).complete, true);
    await saveRegistryEvidence(input, output, async () => {
      throw Error("private diagnostic");
    });
    const failure = await readFile(output, "utf8");
    assert.equal(JSON.parse(failure).complete, false);
    assert.ok(!failure.includes("private diagnostic"));
    assert.deepEqual((await readdir(directory)).sort(), [
      "input.json",
      "output.json",
    ]);
    await assert.rejects(
      saveRegistryEvidence(input, input, request),
      /distinct-paths-required/,
    );
    await assert.rejects(saveRegistryEvidence(input, directory, request));
    assert.deepEqual((await readdir(directory)).sort(), [
      "input.json",
      "output.json",
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("require Node 24 / TS7 and strip unrelated input before persistence", async () => {
  for (const [field, value] of [
    ["node", "v22.23.4"],
    ["consumerTypeScript", "6.0.2"],
    ["registry", "https://example.org"],
    ["checkedAt", "2026-02-30T00:00:00.000Z"],
  ]) {
    const input = JSON.parse(fixture());
    input[field] = value;
    await assert.rejects(
      acquireRegistryEvidence(JSON.stringify(input), request),
    );
  }
  const input = JSON.parse(fixture());
  input.diagnostic = "private diagnostic fixture";
  input.packages[0].unrelated = "private diagnostic fixture";
  const result = await acquireRegistryEvidence(
    JSON.stringify(input),
    async (url, options) => {
      assert.equal(options.redirect, "error");
      return request(url);
    },
  );
  assert.ok(!JSON.stringify(result).includes("private diagnostic fixture"));
});

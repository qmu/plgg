import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bindPublishedTags,
  type MetadataReader,
} from "./publishedTagLedger.ts";

const names = [
  "plgg-bundle",
  "plgg-view",
  "plgg",
];
const integrity = `sha512-${"A".repeat(86)}==`;
const source = () => ({
  schemaVersion: 1,
  registry: "https://registry.npmjs.org",
  complete: true,
  packages: names.map((name) => ({
    name,
    version: "0.0.7",
    sha512: integrity,
  })),
  checks: [
    "bundle-restart",
    "consumer-ts7",
    "svg-elements",
    "raw-identity",
    "frame-dispatch",
    "lazy-subtree",
  ].map((id) => ({ id, status: "passed" })),
});
const metadata = (
  name: string,
  latest = "0.0.7",
) => ({
  name,
  "dist-tags": { latest },
  versions: {
    "0.0.7": {
      name,
      version: "0.0.7",
      dist: { integrity },
    },
  },
});
const read: MetadataReader = async (name) =>
  metadata(name);

test("records actual published version and latest for every dependency", async () => {
  const result = await bindPublishedTags(
    source(),
    read,
  );
  assert.equal(result.complete, true);
  assert.equal(result.observations.length, 3);
  assert.ok(
    result.observations.every(
      (row) =>
        row.publishedVersion === "0.0.7" &&
        row.distTagVersion === "0.0.7",
    ),
  );
});
test("rejects moved latest even when pinned version still exists", async () => {
  const result = await bindPublishedTags(
    source(),
    async (name) => metadata(name, "0.0.8"),
  );
  assert.equal(result.complete, false);
  assert.equal(
    result.observations[0]?.publishedVersion,
    "0.0.7",
  );
  assert.equal(
    result.observations[0]?.distTagVersion,
    "0.0.8",
  );
});
test("rejects repointed integrity, absent versions and malformed metadata", async () => {
  for (const readBad of [
    async (name: string) => ({
      ...metadata(name),
      versions: {},
    }),
    async (name: string) => ({
      ...metadata(name),
      versions: {
        "0.0.7": {
          name,
          version: "0.0.7",
          dist: { integrity: "wrong" },
        },
      },
    }),
    async () => null,
  ])
    assert.equal(
      (await bindPublishedTags(source(), readBad))
        .complete,
      false,
    );
});
test("rejects forged completion, failed, duplicate and missing checks", async () => {
  for (const input of [
    { ...source(), complete: false },
    {
      ...source(),
      checks: source().checks.slice(1),
    },
    {
      ...source(),
      checks: [
        ...source().checks,
        source().checks[0],
      ],
    },
    {
      ...source(),
      checks: source().checks.map((check) => ({
        ...check,
        status: "failed",
      })),
    },
    { ...source(), schemaVersion: 2 },
    null,
  ])
    assert.equal(
      (await bindPublishedTags(input, read))
        .complete,
      false,
    );
});
test("rejects duplicate, missing and unexpected packages", async () => {
  const packages = source().packages;
  for (const list of [
    packages.slice(1),
    [...packages, packages[0]],
    [packages[0], packages[0], packages[2]],
    [...packages, { name: "other" }],
  ])
    assert.equal(
      (
        await bindPublishedTags(
          { ...source(), packages: list },
          read,
        )
      ).complete,
      false,
    );
});
test("registry failure stays incomplete and does not expose diagnostics", async () => {
  const result = await bindPublishedTags(
    source(),
    async () => {
      throw Error("private diagnostic");
    },
  );
  assert.equal(result.complete, false);
  assert.equal(result.observations.length, 3);
  assert.ok(
    !JSON.stringify(result).includes(
      "private diagnostic",
    ),
  );
});

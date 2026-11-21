import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyPublicTarballGateFailure,
  compareSemver,
  parseSemver,
} from "./publicTarballGateFailure.ts";
import type { FailureSignal } from "./publicTarballGateFailure.ts";

const baseSignal: FailureSignal = {
  packageName: "plgg-bundle",
  registryNotFound: false,
  localBuildStale: false,
  resolvedVersion: "0.0.6",
  minimumFixedVersion: "0.0.7",
};

test("parseSemver reads major.minor.patch", () => {
  assert.deepEqual(parseSemver("0.0.7"), {
    major: 0,
    minor: 0,
    patch: 7,
    prerelease: null,
  });
});

test("parseSemver reads a prerelease suffix", () => {
  assert.deepEqual(parseSemver("7.0.1-rc"), {
    major: 7,
    minor: 0,
    patch: 1,
    prerelease: "rc",
  });
});

test("parseSemver rejects a non-semver string", () => {
  assert.equal(parseSemver("latest"), null);
});

test("compareSemver orders by major, then minor, then patch", () => {
  const a = parseSemver("0.0.6");
  const b = parseSemver("0.0.7");
  assert.ok(a !== null && b !== null);
  assert.equal(compareSemver(a, b), -1);
  assert.equal(compareSemver(b, a), 1);
  assert.equal(compareSemver(a, a), 0);
});

test("compareSemver ranks a prerelease below its release", () => {
  const rc = parseSemver("7.0.1-rc");
  const release = parseSemver("7.0.1");
  assert.ok(rc !== null && release !== null);
  assert.equal(compareSemver(rc, release), -1);
  assert.equal(compareSemver(release, rc), 1);
});

test("registryNotFound classifies as refetch, regardless of the other signals", () => {
  const result = classifyPublicTarballGateFailure({
    ...baseSignal,
    registryNotFound: true,
    localBuildStale: true,
    resolvedVersion: "0.0.7",
    minimumFixedVersion: "0.0.7",
  });
  assert.equal(result.nextStep, "refetch");
  assert.match(result.reason, /not yet propagated/);
  assert.match(result.command, /npm view/);
});

test("localBuildStale classifies as rebuild when the registry resolved fine", () => {
  const result = classifyPublicTarballGateFailure({
    ...baseSignal,
    localBuildStale: true,
    resolvedVersion: "0.0.7",
    minimumFixedVersion: "0.0.7",
  });
  assert.equal(result.nextStep, "rebuild");
  assert.match(result.command, /build\.sh/);
});

test("a registry version below the known fix classifies as wait-for-publish", () => {
  const result = classifyPublicTarballGateFailure(
    baseSignal,
  );
  assert.equal(result.nextStep, "wait-for-publish");
  assert.match(result.reason, /0\.0\.6/);
  assert.match(result.reason, /0\.0\.7/);
});

test("a registry version at the known fix is left unclassified", () => {
  const result = classifyPublicTarballGateFailure({
    ...baseSignal,
    resolvedVersion: "0.0.7",
  });
  assert.equal(result.nextStep, "unclassified");
});

test("a registry version past the known fix is left unclassified", () => {
  const result = classifyPublicTarballGateFailure({
    ...baseSignal,
    resolvedVersion: "0.0.9",
  });
  assert.equal(result.nextStep, "unclassified");
});

test("an unparseable version is left unclassified rather than guessed at", () => {
  const result = classifyPublicTarballGateFailure({
    ...baseSignal,
    resolvedVersion: "latest",
  });
  assert.equal(result.nextStep, "unclassified");
});

test("refetch takes priority over a version that would otherwise classify as wait-for-publish", () => {
  const result = classifyPublicTarballGateFailure({
    ...baseSignal,
    registryNotFound: true,
  });
  assert.equal(result.nextStep, "refetch");
});

test("rebuild takes priority over wait-for-publish when both signals hold", () => {
  const result = classifyPublicTarballGateFailure({
    ...baseSignal,
    localBuildStale: true,
  });
  assert.equal(result.nextStep, "rebuild");
});

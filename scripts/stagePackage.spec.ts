import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stageEntries,
  stagedManifest,
  type PackageJson,
} from "./stagePackage.ts";

test("stageEntries appends README + LICENSE and dedups", () => {
  assert.deepEqual(
    stageEntries({ files: ["dist", "bin"] }),
    ["dist", "bin", "README.md", "LICENSE"],
  );
  // No `files` field → still ships the conventional pair.
  assert.deepEqual(stageEntries({}), [
    "README.md",
    "LICENSE",
  ]);
  // An already-listed README is not duplicated.
  assert.deepEqual(
    stageEntries({ files: ["README.md", "dist"] }),
    ["README.md", "dist", "LICENSE"],
  );
});

test("stagedManifest rewrites file: deps to a caret range", () => {
  const pkg: PackageJson = {
    name: "consumer",
    version: "1.0.0",
    dependencies: {
      "plgg-view": "file:../plgg-view",
      external: "^2.0.0",
    },
    devDependencies: {
      "plgg-test": "file:../plgg-test",
    },
  };
  const out = stagedManifest(pkg, (spec) =>
    spec === "file:../plgg-view"
      ? "0.3.1"
      : spec === "file:../plgg-test"
        ? "0.0.5"
        : "0.0.0",
  );
  const parsed: PackageJson = JSON.parse(out);
  const deps = parsed["dependencies"] as Record<
    string,
    unknown
  >;
  const dev = parsed[
    "devDependencies"
  ] as Record<string, unknown>;
  assert.equal(deps["plgg-view"], "^0.3.1");
  // A non-file: range is left untouched.
  assert.equal(deps["external"], "^2.0.0");
  assert.equal(dev["plgg-test"], "^0.0.5");
  // Trailing newline, like the shell heredoc wrote.
  assert.ok(out.endsWith("\n"));
});

test("stagedManifest throws if a file: specifier survives an unrewritten dep map", () => {
  const pkg: PackageJson = {
    name: "broken",
    version: "1.0.0",
    // peerDependencies is NOT among the rewritten maps (dependencies /
    // devDependencies, matching the shell), so a file: peer survives to
    // the serialized text and must fail loudly rather than publish an
    // unresolvable range.
    peerDependencies: { dep: "file:../dep" },
  };
  assert.throws(
    () => stagedManifest(pkg, () => "1.0.0"),
    /file: specifier survived/,
  );
});

test("stagedManifest is a no-op when there are no file: deps", () => {
  const pkg: PackageJson = {
    name: "leaf",
    version: "2.1.0",
    dependencies: { typescript: "^6.0.3" },
  };
  const out = stagedManifest(pkg, () => {
    throw new Error("resolveVersion must not be called");
  });
  const parsed: PackageJson = JSON.parse(out);
  const deps = parsed["dependencies"] as Record<
    string,
    unknown
  >;
  assert.equal(deps["typescript"], "^6.0.3");
});

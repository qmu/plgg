import { test } from "node:test";
import assert from "node:assert/strict";
import {
  stageEntries,
  stagedManifest,
  declaresStageAllowlist,
  entryTargets,
  missingEntryTargets,
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

test("declaresStageAllowlist rejects the shapes that stage no dist", () => {
  assert.equal(
    declaresStageAllowlist({ files: ["dist"] }),
    true,
  );
  // The plggmatic@0.2.1 shape: no `files` at all. A local `npm pack`
  // masks it (npm's default packs everything); the stage does not.
  assert.equal(declaresStageAllowlist({}), false);
  // The same defect spelled differently.
  assert.equal(
    declaresStageAllowlist({ files: [] }),
    false,
  );
  assert.equal(
    declaresStageAllowlist({ files: "dist" }),
    false,
  );
});

test("entryTargets collects main, types, nested exports and bin", () => {
  // The plggmatic shape: subpath keys over condition maps.
  assert.deepEqual(
    entryTargets({
      main: "dist/index.es.js",
      types: "dist/index.d.ts",
      exports: {
        ".": {
          types: "./dist/index.d.ts",
          default: "./dist/index.es.js",
        },
        "./style": {
          types: "./dist/styleEntry.d.ts",
          default: "./dist/styleEntry.es.js",
        },
      },
    }),
    [
      "dist/index.es.js",
      "dist/index.d.ts",
      "dist/styleEntry.d.ts",
      "dist/styleEntry.es.js",
    ],
  );
  // The plgg shape: bare import/require conditions, no "." key.
  assert.deepEqual(
    entryTargets({
      exports: {
        import: { default: "./dist/index.es.js" },
        require: { default: "./dist/index.cjs.js" },
      },
    }),
    ["dist/index.es.js", "dist/index.cjs.js"],
  );
  // The plgg-bundle shape: bin-only, no importable surface.
  assert.deepEqual(
    entryTargets({
      bin: { "plgg-bundle": "bin/plgg-bundle.mjs" },
    }),
    ["bin/plgg-bundle.mjs"],
  );
  // A `null` condition blocks a subpath and names no file; a wildcard
  // pattern names a shape, not a path — neither is existence-checkable.
  assert.deepEqual(
    entryTargets({
      exports: {
        ".": "./dist/index.js",
        "./internal": null,
        "./*": "./dist/*.js",
      },
    }),
    ["dist/index.js"],
  );
  // Nothing declared is nothing to check (not an error here).
  assert.deepEqual(entryTargets({}), []);
});

test("missingEntryTargets names every declared path absent from the stage", () => {
  const pkg: PackageJson = {
    main: "dist/index.es.js",
    types: "dist/index.d.ts",
  };
  // A stage that holds neither: both are reported, not just the first.
  assert.deepEqual(
    missingEntryTargets(pkg, () => false),
    ["dist/index.es.js", "dist/index.d.ts"],
  );
  // The real failure: `files` was declared but the package was never
  // built, so the types rode along and the entry point did not.
  assert.deepEqual(
    missingEntryTargets(
      pkg,
      (p) => p === "dist/index.d.ts",
    ),
    ["dist/index.es.js"],
  );
  // A complete stage passes.
  assert.deepEqual(
    missingEntryTargets(pkg, () => true),
    [],
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

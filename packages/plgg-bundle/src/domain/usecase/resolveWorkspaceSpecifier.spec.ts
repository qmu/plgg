import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { join } from "node:path";
import { discoverWorkspace } from "plgg-bundle/domain/usecase/discoverWorkspace";
import { resolveWorkspaceSpecifier } from "plgg-bundle/domain/usecase/resolveWorkspaceSpecifier";

const bundleRoot = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
);
const packagesDir = join(bundleRoot, "..");
const packages = discoverWorkspace(bundleRoot);

// Any file standing in for the importer.
const fromFile = join(
  packagesDir,
  "example",
  "src",
  "app.ts",
);
const resolve = (specifier: string) =>
  resolveWorkspaceSpecifier({
    specifier,
    fromFile,
    packages,
  });
const pkgSrc = (
  name: string,
  ...rest: ReadonlyArray<string>
) => join(packagesDir, name, "src", ...rest);

test("resolves a bare workspace package to its src index", () =>
  check(
    resolve("plgg"),
    toBe(pkgSrc("plgg", "index.ts")),
  ));

test("resolves a public export subpath, honouring the styleEntry rename", () =>
  all([
    check(
      resolve("plgg-view/client"),
      toBe(pkgSrc("plgg-view", "client.ts")),
    ),
    check(
      resolve("plgg-view/style"),
      toBe(pkgSrc("plgg-view", "styleEntry.ts")),
    ),
  ]));

test("resolves an internal self-alias path (not a declared export)", () =>
  check(
    resolve("plgg/Atomics/Num"),
    toBe(pkgSrc("plgg", "Atomics", "Num.ts")),
  ));

test("resolves a relative import against the importer", () =>
  check(
    resolve("./Todo.ts"),
    toBe(
      join(
        packagesDir,
        "example",
        "src",
        "Todo.ts",
      ),
    ),
  ));

test("returns undefined for a non-workspace specifier", () =>
  all([
    check(resolve("react"), toBe(undefined)),
    check(resolve("node:fs"), toBe(undefined)),
  ]));

import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { join } from "node:path";
import { resolveSpecifier } from "plgg-bundle/domain/usecase/resolveSpecifier";

// Resolve against this package's own src tree on disk.
const srcRoot = join(
  import.meta.dirname,
  "..",
  "..",
);
const aliasArgs = {
  aliasPrefix: "plgg-bundle",
  aliasSrcRoot: srcRoot,
};

test("resolveSpecifier resolves an alias to a file", () =>
  check(
    resolveSpecifier({
      specifier:
        "plgg-bundle/domain/usecase/isExternal",
      fromFile: join(srcRoot, "index.ts"),
      ...aliasArgs,
    }),
    toBe(
      join(
        srcRoot,
        "domain",
        "usecase",
        "isExternal.ts",
      ),
    ),
  ));

test("resolveSpecifier returns undefined for an alias dir with no index", () =>
  // domain/model has no index.ts → unresolvable.
  check(
    resolveSpecifier({
      specifier: "plgg-bundle/domain/model",
      fromFile: join(srcRoot, "index.ts"),
      ...aliasArgs,
    }),
    toBe(undefined),
  ));

test("resolveSpecifier resolves a relative path", () =>
  check(
    resolveSpecifier({
      specifier: "./isExternal",
      fromFile: join(
        srcRoot,
        "domain",
        "usecase",
        "collectModules.ts",
      ),
      ...aliasArgs,
    }),
    toBe(
      join(
        srcRoot,
        "domain",
        "usecase",
        "isExternal.ts",
      ),
    ),
  ));

test("resolveSpecifier returns undefined for an external specifier", () =>
  all([
    check(
      resolveSpecifier({
        specifier: "plgg",
        fromFile: join(srcRoot, "index.ts"),
        ...aliasArgs,
      }),
      toBe(undefined),
    ),
    check(
      resolveSpecifier({
        specifier: "node:fs",
        fromFile: join(srcRoot, "index.ts"),
        ...aliasArgs,
      }),
      toBe(undefined),
    ),
  ]));

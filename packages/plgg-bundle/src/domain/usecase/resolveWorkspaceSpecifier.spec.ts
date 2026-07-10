import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
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

test("resolves an installed dist-only package export to its built ESM file", () => {
  const root = fixtureRoot();
  try {
    const app = join(root, "packages", "app");
    writePackage(app, "app", true);
    writePackage(
      join(app, "node_modules", "plgg"),
      "plgg",
      false,
    );
    const installed = discoverWorkspace(app);
    return check(
      resolveWorkspaceSpecifier({
        specifier: "plgg",
        fromFile: join(app, "src", "main.ts"),
        packages: installed,
      }),
      toBe(
        join(
          app,
          "node_modules",
          "plgg",
          "dist",
          "index.es.js",
        ),
      ),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("does not resolve internal paths from a dist-only installed package", () => {
  const root = fixtureRoot();
  try {
    const app = join(root, "packages", "app");
    writePackage(app, "app", true);
    writePackage(
      join(app, "node_modules", "plgg"),
      "plgg",
      false,
    );
    const installed = discoverWorkspace(app);
    return check(
      resolveWorkspaceSpecifier({
        specifier: "plgg/Atomics/Num",
        fromFile: join(app, "src", "main.ts"),
        packages: installed,
      }),
      toBe(undefined),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

const fixtureRoot = (): string =>
  mkdtempSync(join(tmpdir(), "plgg-bundle-resolve-"));

const writePackage = (
  dir: string,
  name: string,
  source: boolean,
): void => {
  const codeDir = source
    ? join(dir, "src")
    : join(dir, "dist");
  mkdirSync(codeDir, { recursive: true });
  writeFileSync(join(codeDir, "index.es.js"), "");
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name,
        type: "module",
        exports: {
          import: {
            default: "./dist/index.es.js",
          },
          require: {
            default: "./dist/index.cjs.js",
          },
        },
      },
      null,
      2,
    ),
  );
};

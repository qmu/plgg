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

// Run against the real monorepo: this package's root is
// `packages/plgg-bundle`, so discovery scans `packages/*`.
const bundleRoot = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
);

const packages = discoverWorkspace(bundleRoot);
const byName = (name: string) =>
  packages.find((p) => p.name === name);

test("discoverWorkspace finds sibling packages", () =>
  all([
    check(
      byName("plgg") !== undefined,
      toBe(true),
    ),
    check(
      byName("plgg-view") !== undefined,
      toBe(true),
    ),
  ]));

test("discoverWorkspace reads the conditions-only '.' export (plgg)", () =>
  check(
    byName("plgg")?.exports.get("."),
    toBe("./dist/index.es.js"),
  ));

test("discoverWorkspace reads a subpath export incl. the styleEntry rename", () =>
  all([
    check(
      byName("plgg-view")?.exports.get(
        "./client",
      ),
      toBe("./dist/client.es.js"),
    ),
    check(
      byName("plgg-view")?.exports.get("./style"),
      toBe("./dist/styleEntry.es.js"),
    ),
  ]));

test("discoverWorkspace sorts longest-name first (so plgg-view beats plgg)", () => {
  const iView = packages.findIndex(
    (p) => p.name === "plgg-view",
  );
  const iCore = packages.findIndex(
    (p) => p.name === "plgg",
  );
  return check(iView < iCore, toBe(true));
});

test("discoverWorkspace finds dist-only packages installed under node_modules", () => {
  const root = fixtureRoot();
  try {
    const app = join(root, "packages", "app");
    writePackage(app, "app", true);
    writePackage(
      join(app, "node_modules", "plgg"),
      "plgg",
      false,
    );
    const found = discoverWorkspace(app).find(
      (p) => p.name === "plgg",
    );
    return all([
      check(found?.kind, toBe("dist")),
      check(
        found?.exports.get("."),
        toBe("./dist/index.es.js"),
      ),
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("discoverWorkspace keeps a sibling source package before an installed duplicate", () => {
  const root = fixtureRoot();
  try {
    const app = join(root, "packages", "app");
    writePackage(app, "app", true);
    writePackage(
      join(root, "packages", "plgg"),
      "plgg",
      true,
    );
    writePackage(
      join(app, "node_modules", "plgg"),
      "plgg",
      false,
    );
    const found = discoverWorkspace(app).find(
      (p) => p.name === "plgg",
    );
    return check(found?.kind, toBe("source"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("discoverWorkspace finds installed deps of a sibling source package", () => {
  const root = fixtureRoot();
  try {
    const app = join(root, "packages", "app");
    writePackage(app, "app", true);
    const local = join(root, "packages", "local");
    writePackage(local, "local", true);
    writePackage(
      join(local, "node_modules", "plgg-ui"),
      "plgg-ui",
      false,
    );
    const found = discoverWorkspace(app).find(
      (p) => p.name === "plgg-ui",
    );
    return check(found?.kind, toBe("dist"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

const fixtureRoot = (): string =>
  mkdtempSync(
    join(tmpdir(), "plgg-bundle-discover-"),
  );

const writePackage = (
  dir: string,
  name: string,
  source: boolean,
): void => {
  mkdirSync(source ? join(dir, "src") : join(dir, "dist"), {
    recursive: true,
  });
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

import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
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

import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { join } from "node:path";
import {
  mkdtempSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { deriveExternal } from "plgg-bundle/domain/usecase/deriveExternal";
import { isExternal } from "plgg-bundle/domain/usecase/isExternal";

/** True when `deriveExternal(root)` throws an Error. */
const rejects = (root: string): boolean => {
  try {
    deriveExternal(root);
    return false;
  } catch (e) {
    return e instanceof Error;
  }
};

/** A temp dir carrying a specific package.json body. */
const withManifest = (body: string): string => {
  const dir = mkdtempSync(
    join(tmpdir(), "plgg-derive-"),
  );
  writeFileSync(
    join(dir, "package.json"),
    body,
  );
  return dir;
};

// plgg-bundle's own root: its package.json declares
// `typescript` as the sole dependency.
const root = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
);
const external = deriveExternal(root);

test("deriveExternal externalizes declared deps and node builtins", () =>
  all([
    check(
      isExternal(external, "typescript"),
      toBe(true),
    ),
    check(
      isExternal(external, "node:fs"),
      toBe(true),
    ),
    check(
      isExternal(external, "node:child_process"),
      toBe(true),
    ),
  ]));

test("deriveExternal externalizes a PUBLIC SUBPATH of a declared dep", () =>
  // `typescript/lib/...` is a subpath of the declared
  // `typescript` dep → external (resolved at runtime via
  // the dep's own exports), mirroring `plgg-server/ssg`.
  check(
    isExternal(external, "typescript/lib/typescript"),
    toBe(true),
  ));

test("deriveExternal does NOT externalize undeclared / own-source specifiers", () =>
  all([
    // plgg is not a dependency of plgg-bundle → not
    // external (an import of it would fail loudly).
    check(
      isExternal(external, "plgg"),
      toBe(false),
    ),
    check(
      isExternal(external, "./resolveSpecifier"),
      toBe(false),
    ),
    check(
      isExternal(
        external,
        "plgg-bundle/domain/model/BundleConfig",
      ),
      toBe(false),
    ),
  ]));

test("deriveExternal throws when package.json is missing", () =>
  check(
    rejects(
      join(tmpdir(), "plgg-derive-missing-xyz"),
    ),
    toBe(true),
  ));

test("deriveExternal throws on an unparseable package.json", () =>
  check(
    rejects(withManifest("{ not valid json")),
    toBe(true),
  ));

test("deriveExternal treats a non-object manifest as zero declared deps", () => {
  const ext = deriveExternal(
    withManifest(`"just a string"`),
  );
  return all([
    // node:* is still external by prefix …
    check(
      isExternal(ext, "node:fs"),
      toBe(true),
    ),
    // … but nothing is declared, so any package specifier
    // is undeclared (not external).
    check(
      isExternal(ext, "whatever"),
      toBe(false),
    ),
  ]);
});

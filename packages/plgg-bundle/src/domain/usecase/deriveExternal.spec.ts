import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { join } from "node:path";
import { deriveExternal } from "plgg-bundle/domain/usecase/deriveExternal";
import { isExternal } from "plgg-bundle/domain/usecase/isExternal";

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

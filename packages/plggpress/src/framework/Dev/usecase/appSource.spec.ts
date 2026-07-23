import { test, check, toBe } from "plgg-test";
import { srcRootOf } from "plggpress/framework/Dev/usecase/appSource";

test("srcRootOf finds the package's src root from a nested module", () =>
  check(
    srcRootOf(
      "file:///home/dev/plgg/packages/plggpress/src/framework/Dev/usecase/appSource.ts",
    ),
    toBe("/home/dev/plgg/packages/plggpress/src"),
  ));

test("srcRootOf resolves a module sitting directly in src", () =>
  check(
    srcRootOf(
      "file:///home/dev/plgg/packages/plggpress/src/cli.ts",
    ),
    toBe("/home/dev/plgg/packages/plggpress/src"),
  ));

test("srcRootOf follows the CLI into a node_modules install", () =>
  check(
    srcRootOf(
      "file:///consumer/node_modules/plggpress/src/Press/usecase/devSpec.ts",
    ),
    toBe("/consumer/node_modules/plggpress/src"),
  ));

test("srcRootOf takes the INNERMOST src when the checkout itself lives under one", () =>
  check(
    srcRootOf(
      "file:///home/dev/src/plgg/packages/plggpress/src/theme/home.ts",
    ),
    toBe(
      "/home/dev/src/plgg/packages/plggpress/src",
    ),
  ));

test("srcRootOf falls back to the module's own directory outside any src/", () =>
  check(
    srcRootOf("file:///tmp/loose/entry.ts"),
    toBe("/tmp/loose"),
  ));

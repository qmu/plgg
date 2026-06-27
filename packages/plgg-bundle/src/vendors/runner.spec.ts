import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { join } from "node:path";
import { readExportNames } from "plgg-bundle/vendors/runner";

// Root createRequire at plgg-bundle's own package so a
// bundle's external require resolves against real
// node_modules / node builtins (gap #2: externals-aware
// export-surface discovery).
const resolveBase = join(
  import.meta.dirname,
  "..",
  "..",
);

test("readExportNames reads a self-contained CJS bundle's keys", () =>
  check(
    readExportNames(
      "exports.a = 1; exports.b = 2;",
      resolveBase,
    ).join(","),
    toBe("a,b"),
  ));

test("readExportNames resolves an EXTERNAL require during discovery (gap #2)", () =>
  // The bundle keeps `require("node:path")` as an
  // external; discovery must run it via host require
  // (rooted at the target package) without throwing,
  // and still enumerate the entry's own exports.
  all([
    check(
      readExportNames(
        'const p = require("node:path"); exports.sep = p.sep; exports.x = 1;',
        resolveBase,
      ).join(","),
      toBe("sep,x"),
    ),
    // __esModule is filtered out of the surface.
    check(
      readExportNames(
        'Object.defineProperty(exports, "__esModule", { value: true }); exports.only = 1;',
        resolveBase,
      ).join(","),
      toBe("only"),
    ),
  ]));

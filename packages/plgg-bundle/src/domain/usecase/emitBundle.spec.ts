import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  emitCjsBundle,
  emitEsmBundle,
} from "plgg-bundle/domain/usecase/emitBundle";
import { type Graph } from "plgg-bundle/domain/usecase/collectModules";

const graph: Graph = {
  entryId: "index.ts",
  modules: [
    {
      id: "index.ts",
      code: 'exports.x = require("dep.ts").x;',
      externals: [],
    },
    {
      id: "dep.ts",
      code: "exports.x = 1;",
      externals: [],
    },
  ],
};

test("emitCjsBundle wires the registry and entry export", () =>
  all([
    check(
      emitCjsBundle(graph).includes(
        "function __require(id)",
      ),
      toBe(true),
    ),
    check(
      emitCjsBundle(graph).includes(
        'module.exports = __require("index.ts")',
      ),
      toBe(true),
    ),
    check(
      emitCjsBundle(graph).includes('"dep.ts":'),
      toBe(true),
    ),
  ]));

test("emitEsmBundle emits static named exports", () =>
  all([
    check(
      emitEsmBundle(graph, ["x"]).includes(
        "export default __entry;",
      ),
      toBe(true),
    ),
    check(
      emitEsmBundle(graph, ["x"]).includes(
        "} = __entry;",
      ),
      toBe(true),
    ),
    check(
      emitEsmBundle(graph, ["x"]).includes("  x"),
      toBe(true),
    ),
  ]));

test("the emitted CJS bundle actually runs", () => {
  // Evaluate the emitted CJS in a fresh module scope
  // and confirm the entry's export resolves through the
  // registry runtime.
  const code = emitCjsBundle(graph);
  const mod: {
    exports: Record<string, unknown>;
  } = {
    exports: {},
  };
  new Function(
    "module",
    "exports",
    "require",
    code,
  )(mod, mod.exports, () => ({}));
  return check(mod.exports.x, toBe(1));
});

// A graph whose entry keeps an un-bundled external
// require (e.g. a node builtin).
const externalGraph: Graph = {
  entryId: "index.ts",
  modules: [
    {
      id: "index.ts",
      code: 'exports.read = require("node:fs").readFileSync;',
      externals: ["node:fs"],
    },
  ],
};

test("emitEsmBundle imports externals and routes the registry to them", () =>
  all([
    check(
      emitEsmBundle(externalGraph, [
        "read",
      ]).includes(
        'import * as __ext0 from "node:fs";',
      ),
      toBe(true),
    ),
    check(
      emitEsmBundle(externalGraph, [
        "read",
      ]).includes('"node:fs": __ext0'),
      toBe(true),
    ),
    check(
      emitEsmBundle(externalGraph, [
        "read",
      ]).includes(
        "if (id in __externals) return __externals[id];",
      ),
      toBe(true),
    ),
  ]));

test("emitCjsBundle leaves externals to the host require", () =>
  all([
    // No external import machinery in CJS …
    check(
      emitCjsBundle(externalGraph).includes(
        "__externals",
      ),
      toBe(false),
    ),
    // … the un-rewritten require falls through to host.
    check(
      emitCjsBundle(externalGraph).includes(
        "return require(id);",
      ),
      toBe(true),
    ),
  ]));

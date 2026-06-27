import { type Format } from "plgg-bundle/domain/model/BundleConfig";
import {
  type Graph,
  type Module,
} from "plgg-bundle/domain/usecase/collectModules";

/**
 * Render a resolved {@link Graph} into one bundle's
 * source text for the given {@link Format}, using an
 * in-house module-registry runtime: every module body
 * is wrapped in its own `(module, exports, require)`
 * closure keyed by id, and a cached `__require` links
 * them at runtime. This is collision-free by
 * construction (each module keeps its own scope), so it
 * needs none of rolldown's scope-hoisting/renaming and
 * stays pure JS.
 *
 * - CJS (`cjs`): the runtime, then
 *   `module.exports = __require(entry)`. Unknown
 *   (external) ids fall through to the host `require`.
 * - ESM (`es`): the runtime, then static
 *   `export const NAME = __entry.NAME;` for each name
 *   in `exportNames`, so `import { x } from "pkg"`
 *   resolves. ESM cannot declare exports dynamically,
 *   so the orchestrator computes `exportNames` from the
 *   built CJS bundle's own keys and passes them here.
 */
export const emitCjsBundle = (
  graph: Graph,
): string =>
  [
    `"use strict";`,
    runtime(graph, "require"),
    `module.exports = __require(${entryArg(
      graph,
    )});`,
  ].join("\n");

/**
 * ESM bundle. `exportNames` is the exact public surface
 * (the entry's enumerable export keys), supplied by the
 * orchestrator from the CJS bundle's runtime keys. An
 * external id reached from a pure-ESM bundle is a build
 * mistake (plgg core has no externals), so the host
 * fallback throws rather than silently resolving.
 */
export const emitEsmBundle = (
  graph: Graph,
  exportNames: ReadonlyArray<string>,
): string =>
  [
    runtime(graph, "__hostRequire"),
    `function __hostRequire(id) {`,
    `  throw new Error("Cannot require external '" + id + "' from ESM bundle");`,
    `}`,
    `const __entry = __require(${entryArg(
      graph,
    )});`,
    `export default __entry;`,
    namedExports(exportNames),
  ].join("\n");

/**
 * Dispatch on format for callers that hold the names
 * regardless.
 */
export const emitBundle = (
  graph: Graph,
  format: Format,
  exportNames: ReadonlyArray<string>,
): string =>
  format === "es"
    ? emitEsmBundle(graph, exportNames)
    : emitCjsBundle(graph);

/**
 * The shared registry runtime: a module table plus a
 * caching `__require` that runs a module body once and
 * memoizes its `exports`. Unknown ids fall through to
 * the host loader (externals).
 */
const runtime = (
  graph: Graph,
  hostRequire: string,
): string =>
  [
    `const __modules = {`,
    graph.modules.map(moduleEntry).join(",\n"),
    `};`,
    `const __cache = {};`,
    `function __require(id) {`,
    `  if (id in __cache) return __cache[id].exports;`,
    `  const fn = __modules[id];`,
    `  if (!fn) { return ${hostRequire}(id); }`,
    `  const module = { exports: {} };`,
    `  __cache[id] = module;`,
    `  fn(module, module.exports, __require);`,
    `  return module.exports;`,
    `}`,
  ].join("\n");

/**
 * One module's registry entry: `"id": function (module,
 * exports, require) { <body> }`.
 */
const moduleEntry = (m: Module): string =>
  [
    `${JSON.stringify(m.id)}: `,
    `function (module, exports, require) {\n`,
    m.code,
    `\n}`,
  ].join("");

/**
 * Static named re-exports of the entry namespace. Each
 * name is a valid identifier (a JS export name), so the
 * `export const` list is itself valid ESM.
 */
const namedExports = (
  names: ReadonlyArray<string>,
): string =>
  names.length === 0
    ? ``
    : [
        `export const {`,
        names.map((n) => `  ${n}`).join(",\n"),
        `} = __entry;`,
      ].join("\n");

/**
 * The JSON-quoted entry id used as `__require`'s arg.
 */
const entryArg = (graph: Graph): string =>
  JSON.stringify(graph.entryId);

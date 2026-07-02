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
 * Externals (specifiers left out of the bundle —
 * `node:*`, sibling `plgg*` packages, …) are handled
 * per format:
 * - CJS: an un-rewritten `require("<external>")` in a
 *   module body falls through the registry to the host
 *   `require`.
 * - ESM: there is no host `require`, so the bundle emits
 *   a real top-level `import * as __extN from
 *   "<external>"` for each distinct external and the
 *   registry routes `__require("<external>")` to that
 *   namespace.
 */
export const emitCjsBundle = (
  graph: Graph,
): string =>
  [
    `"use strict";`,
    runtime(graph, `return require(id);`),
    `module.exports = __require(${entryArg(
      graph,
    )});`,
  ].join("\n");

/**
 * ESM bundle. `exportNames` is the exact public surface
 * (the entry's enumerable export keys), supplied by the
 * orchestrator from the CJS bundle's runtime keys —
 * ESM cannot declare exports dynamically. Externals are
 * imported as namespaces at the top and resolved by the
 * registry; an id that is neither a bundled module nor a
 * declared external falls back to a native dynamic
 * `import(id)` (see {@link externalFallback}).
 */
export const emitEsmBundle = (
  graph: Graph,
  exportNames: ReadonlyArray<string>,
): string => {
  const externals = collectExternals(graph);
  return [
    externalImports(externals),
    externalTable(externals),
    runtime(graph, externalFallback()),
    `const __entry = __require(${entryArg(
      graph,
    )});`,
    `export default __entry;`,
    namedExports(exportNames),
  ].join("\n");
};

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
 * memoizes its `exports`. An id with no bundled module
 * runs `unknownBody` (the format-specific external
 * fallback).
 */
const runtime = (
  graph: Graph,
  unknownBody: string,
): string =>
  [
    `const __modules = {`,
    graph.modules.map(moduleEntry).join(",\n"),
    `};`,
    `const __cache = {};`,
    `function __require(id) {`,
    `  if (id in __cache) return __cache[id].exports;`,
    `  const fn = __modules[id];`,
    `  if (!fn) { ${unknownBody} }`,
    `  const module = { exports: {} };`,
    `  __cache[id] = module;`,
    `  fn(module, module.exports, __require);`,
    `  return module.exports;`,
    `}`,
  ].join("\n");

/**
 * The ESM fallback body for an id with no bundled
 * module: resolve it from the external namespace table
 * (interop: a CJS consumer reads named members off the
 * namespace; `default` carries the whole module), or
 * fall back to a native dynamic `import(id)`. Static
 * imports are always bundled or declared external, so
 * only a transpiled dynamic `import(x)` — emitted as
 * `Promise.resolve(x).then(s => __require(s))`, an
 * async context where the returned Promise flattens —
 * ever reaches the fallback; it lets bundled code load
 * runtime files (e.g. a user's config) the registry
 * cannot know. The CJS runtime keeps its host
 * `require(id)` fall-through instead: its unknown-id
 * branch is also reached by synchronous requires, where
 * a returned Promise would corrupt the module value.
 */
const externalFallback = (): string =>
  [
    `if (id in __externals) return __externals[id];`,
    `return import(id);`,
  ].join(" ");

/**
 * Distinct external specifiers across the whole graph,
 * sorted for deterministic output.
 */
const collectExternals = (
  graph: Graph,
): ReadonlyArray<string> =>
  [
    ...new Set(
      graph.modules.flatMap((m) => m.externals),
    ),
  ].sort();

/**
 * Top-level namespace imports, one per external, named
 * `__ext0`, `__ext1`, … in the externals' sorted order.
 */
const externalImports = (
  externals: ReadonlyArray<string>,
): string =>
  externals
    .map(
      (spec, i) =>
        `import * as ${extVar(i)} from ${JSON.stringify(
          spec,
        )};`,
    )
    .join("\n");

/**
 * The `__externals` lookup mapping each specifier to its
 * imported namespace var.
 */
const externalTable = (
  externals: ReadonlyArray<string>,
): string =>
  [
    `const __externals = {`,
    externals
      .map(
        (spec, i) =>
          `  ${JSON.stringify(spec)}: ${extVar(i)}`,
      )
      .join(",\n"),
    `};`,
  ].join("\n");

/**
 * The namespace variable name for the i-th external.
 */
const extVar = (i: number): string => `__ext${i}`;

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

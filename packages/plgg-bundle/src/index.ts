// Public API of the in-house bundler. The CLI
// (`bin/plgg-bundle.mjs` → `src/entrypoints/cli.ts`) is
// the usual entry; these exports let other tooling
// drive the bundler programmatically.
export * from "plgg-bundle/domain/model/BundleConfig";
export * from "plgg-bundle/domain/usecase/asBundleConfig";
export * from "plgg-bundle/domain/usecase/build";
export * from "plgg-bundle/domain/usecase/collectModules";
export * from "plgg-bundle/domain/usecase/deriveExternal";
export * from "plgg-bundle/domain/usecase/emitBundle";
export * from "plgg-bundle/domain/usecase/emitDts";
export * from "plgg-bundle/domain/usecase/isExternal";
export * from "plgg-bundle/domain/usecase/resolveSpecifier";
export * from "plgg-bundle/domain/usecase/rewriteDtsAliases";

// Dev server (the `plgg-bundle dev` toolchain half): the
// app⇄server contract, the pure hot-reload core, and the
// node-adapter entry point.
export * from "plgg-bundle/Dev/model/Fetch";
export * from "plgg-bundle/Dev/model/ModuleGraph";
export * from "plgg-bundle/Dev/model/Protocol";
export * from "plgg-bundle/Dev/usecase/parseImports";
export * from "plgg-bundle/Dev/usecase/buildGraph";
export * from "plgg-bundle/Dev/usecase/invalidate";
export * from "plgg-bundle/Dev/usecase/reloadDecision";
export * from "plgg-bundle/Dev/usecase/decorateDevHtml";
export * from "plgg-bundle/Dev/usecase/allowedHost";
export * from "plgg-bundle/Dev/node/devServer";

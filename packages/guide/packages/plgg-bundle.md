# plgg-bundle

The monorepo's **in-house minimal library bundler**.
Unlike the rest of the family it is deliberately
plgg-free: its only dependency is the project's own
`typescript`, with no native bindings. It emits dual
ESM + CJS output and a per-file `.d.ts` tree, and it also
provides the guide's `dev` server.

## Why it exists

The family packages each need to ship ESM, CJS, and types
without pulling in a heavy bundler toolchain. plgg-bundle
does exactly that by reusing the TypeScript already
present, so build tooling adds no new dependency surface:

```
typescript ── plgg-bundle ── every package's dist
```

It sits below plgg on purpose — a bundler that imported
plgg could not build plgg — so it is written in plain
TypeScript rather than the plgg idiom.

## How it's organized

Two halves live side by side:

- **the bundler** — `collectModules` walks the entry
  graph, `deriveExternal` / `isExternal` and
  `resolveSpecifier` classify imports, `emitBundle`
  writes the ESM + CJS output, and `emitDts` +
  `rewriteDtsAliases` produce the per-file `.d.ts` tree
  (`asBundleConfig` validates the config).
- **the dev server** (`plgg-bundle dev`) — a module-graph
  model + protocol, `parseImports` / `buildGraph`,
  `invalidate` / `reloadDecision` for true module-runner
  hot-reload, `decorateDevHtml`, `allowedHost`, and a
  `node` adapter (`devServer`).

The CLI (`bin/plgg-bundle.mjs`) is the usual entry; the
programmatic exports let other tooling drive the bundler
directly. The exact config schema and emit details live
in the `plgg-bundle` source.

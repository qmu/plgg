---
created_at: 2026-05-27T14:23:55+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort: 2h
commit_hash: 769597a
category: Added
---

# Create `plgg-view` — presentation layer (JSX-style rendering, POC)

## Overview

Add a new monorepo package `src/plgg-view`: a **presentation-layer library** —
JSX-style declarative rendering, Preact-like in spirit but built **functionally,
from scratch, on top of [plgg](../plgg/)** exactly like `plgg-web` was for the
server. Components are plain functions, the view is pure data, and rendering is
a data-last pipeline. No classes, no React/Preact dependency; the only runtime
dependency is `plgg`. It is the client-side counterpart to the server stack
(`plgg-view` → `plgg-http-client` → `plgg-http-router`).

This is an **UNSTABLE / EXPERIMENTAL POC** — scope is deliberately minimal
(static SSR), with reactivity and DOM mounting explicitly deferred.

**The plgg way (non-negotiable, same doctrine as `plgg-web`):**
dogfood plgg types/combinators (`Box` unions, `Obj`, `SoftStr`, `Option`,
`Result`, `pipe`, `match*`, `cast`); when plgg lacks a primitive, **add it to
plgg core** rather than reaching for stdlib types; `as`/`any`/`ts-ignore` are
STRICTLY PROHIBITED (`CLAUDE.md`); no OOP/method chaining — pure data +
standalone data-last functions through `pipe`; expression-only bodies; errors as
values; platform types (DOM) only at the seam; strict coverage > 90%.

## Key Files

- `src/plgg-web/` - **reference precedent**: mirror its package layout,
  `model/`+`usecase/` feature dirs, `export *` barrels, tsconfig split, and
  `vite.config.ts` (coverage thresholds 91).
- `src/plgg-web/README.md`, `src/plgg-web/example.ts` - the style/doc/example
  shape to follow.
- `src/plgg/src/index.ts` - plgg core barrel; extend core here if a primitive is
  missing (then `npm run build` in `src/plgg` so the symlinked dist updates).
- `sh/check-all.sh`, `sh/npm-install.sh`, `sh/build.sh` - wire the new package in.
- `sh/tsc-plgg-web.sh`, `sh/test-plgg-web.sh` - template the new `*-plgg-view.sh`
  scripts on these.

## Implementation Steps

1. Scaffold `src/plgg-view/`: `package.json` (`name: plgg-view`,
   `dependencies: { plgg: "file:../plgg" }`), `tsconfig.json` (type-check,
   `paths: { "plgg-view*": ["./src/*"] }`, `jsx: "react-jsx"`,
   `jsxImportSource: "plgg-view"`), `tsconfig.build.json` (declaration emit,
   `rootDir: src`), `vite.config.ts` (lib es+cjs, `vite-plugin-dts`, coverage
   thresholds 91), `src/index.ts` barrel.
2. Define the VNode model as a `Box` union — `Element { tag, props, children }`,
   `Text { value }`, `Fragment { children }`. Props are a plgg map
   (`Dict<string, …>`); children a normalized `ReadonlyArray<VNode>`; plain
   strings/numbers lift to `Text`.
3. Add the `h(tag, props, ...children)` hyperscript, then a `jsx-runtime`
   (`jsx` / `jsxs` / `Fragment`) so `.tsx` compiles via
   `jsxImportSource: "plgg-view"`.
4. Implement `renderToString(vnode): string` as a pure plgg pipeline that
   **escapes** text and attribute values (XSS-safety is a correctness
   requirement). DOM mounting is deferred.
5. Provide a function-component example `(props) => VNode` composed and rendered.
6. Add `sh/tsc-plgg-view.sh`, `sh/test-plgg-view.sh` (+ watch variants) and wire
   them into `sh/check-all.sh`, `sh/npm-install.sh`, `sh/build.sh`.
7. Add `README.md` and a runnable `example.ts` (`npx tsx`) that renders a small
   page to a string and prints it.
8. Ensure `sh/tsc-plgg-view.sh` and `sh/test-plgg-view.sh` are green with
   coverage > 90%.

## Considerations

- **XSS / output escaping** is a correctness requirement, not optional — text
  nodes and attribute values must be escaped in `renderToString` (`src/plgg-view/`).
- **Out of scope for this POC** (note as "later", do not build): reactivity /
  signals / state, diffing / reconciliation, DOM mounting, event handling, hooks.
- **plgg core edits require a rebuild**: after editing `src/plgg/src`, run
  `npm run build` in `src/plgg` or `plgg-view` won't see new exports (symlinked
  dist) — same gotcha documented for `plgg-web`.
- Specs should import from `"plgg-view/index"` (bare `"plgg-view"` resolves
  inconsistently under tsconfig `paths`), matching the `plgg-web` convention.

## Final Report

Development completed as planned. The package mirrors `plgg-web`: a `Vnode`
feature (model `VNode` `Box` union + `h`/`jsx` builders) and a `Render` feature
(`renderToString` + escaping), `export *` barrels, the tsconfig split, and a
`vite.config.ts` with coverage thresholds 91. `tsc` is clean, 26 tests pass at
100% coverage, the es+cjs+dts build is green, and the runnable example renders
with correct escaping.

### Discovered Insights

- **Insight**: Vite 8 transforms with **oxc**, not esbuild, so an `esbuild: {}`
  block in `vite.config.ts` is silently ignored (it warns). The automatic JSX
  runtime still works because Vite reads `jsx`/`jsxImportSource` from
  `tsconfig.json` and the `resolve.alias` maps `plgg-view` → `./src`. No
  per-tool JSX config is needed in `vite.config.ts`.
  **Context**: A future `plgg-view` reviewer (or anyone copying this config for
  a browser-facing plgg package) should configure JSX via `tsconfig.json`, not
  `vite.config.ts`.
- **Insight**: TS type-checks `.tsx` against `plgg-view/jsx-runtime`'s `JSX`
  namespace and emits `jsx`/`jsxs` calls, while Vite/oxc in test (dev) mode
  emits `jsxDEV` from `plgg-view/jsx-dev-runtime`. **Both** entry modules must
  exist; the `JSX` namespace lives only in `jsx-runtime` (the compiler always
  reads it from there, never from the dev runtime).
  **Context**: Explains why this POC ships two near-identical runtime files; the
  dev one is not redundant — vitest needs it to run the `.tsx` specs.
- **Insight**: Under the current Node (`v24`), `npx tsx src/plgg-view/example.ts`
  from the repo root fails with `ERR_PACKAGE_PATH_NOT_EXPORTED` because Node's
  package self-reference (`trySelf`) intercepts the internal `plgg-view/*`
  imports before tsx applies tsconfig `paths`. Running from the package dir
  (`cd src/plgg-view && npx tsx example.ts`) makes tsx resolve the paths and it
  works. `plgg-web`'s example has the identical pre-existing limitation.
  **Context**: The README documents the working invocation; don't "fix" the
  example by switching it off the `plgg-view/index` convention.

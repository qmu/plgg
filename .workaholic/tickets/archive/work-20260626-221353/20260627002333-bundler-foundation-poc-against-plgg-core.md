---
created_at: 2026-06-27T00:23:33+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure, Config]
effort:
commit_hash: 984cd6c
category: Added
depends_on:
---

# Build the in-house minimal bundler (foundation) and prove it against plgg core

## Overview

Stand up a new in-house package — the **minimal bundler** — that reproduces what
`vite build` + `vite-plugin-dts` produce today for a plgg library package, and
**prove it on `plgg` core first** before any wider migration. This is the
foundation (and the PoC) of the larger effort to remove the direct vite
dependency from the monorepo. It mirrors the just-completed vitest→plgg-test
substitution: build the tool, validate it against the real thing, then migrate.

**Scope decision (confirmed with the requester):** the bundler replaces all
*direct* vite usage — library builds and (in a later ticket) `example`'s dev
server + app bundle. The `guide`'s VitePress toolchain (which depends on vite
*transitively*) is explicitly **out of scope** and stays as-is.

What the bundler must emit for a library package, matching the current dist
contract exactly so downstream `file:` consumers keep resolving unchanged:

1. **Dual JS output** — ESM (`index.es.js`) + CJS (`index.cjs.js`) with the
   exact `index.${format}.js` / `${entryName}.${format}.js` naming, `exports:
   "named"`, minified.
2. **Type declarations** — both modes vite-plugin-dts produces today: the
   default per-file `.d.ts` tree mirroring `src/` (rollupTypes:false), and the
   single rolled-up `index.d.ts` (rollupTypes:true, used by plgg-kit and
   plgg-foundry). `tsc` with each package's `tsconfig.build.json` can produce
   the per-file tree directly; `@microsoft/api-extractor` (already a plgg-test
   devDep) can produce the rolled-up `.d.ts`.
3. **External handling** in three forms used across configs: a string array,
   the `/^node:/` regex, and a **predicate function** (plgg-fetch's
   `isFrameworkDep`). Sibling `plgg*` packages and `node:*` stay external.

The actual TS→JS transpile should sit behind a `src/vendors/` anti-corruption
boundary. Per the vendor-neutrality policy, do **not** reintroduce a fragile
native-binding bundler (the rolldown native-binding CI break is the motivating
pain — see the deploy-guide ticket below); prefer a transpiler with a documented
exit strategy, and record the four-point dependency-decision log
(Reason / Assessment / Monitoring / Exit) the policy requires.

**PoC gate:** build `plgg` core with the new bundler and **diff its `dist/`
against the current vite output** (JS shape, exports, and the per-file `.d.ts`
tree). Cutover proceeds only once plgg's dist is reproduced and plgg's existing
plgg-test suite passes against the in-house-built dist.

## Policies

The standard engineering policies that govern this ticket. The implementing
session **MUST** read each linked policy hard copy before writing code and keep
every change defensible against that policy's Goal (目標), Responsibility
(責務), and Practices (実践).

- `workaholic:implementation` / `policies/directory-structure.md` — the bundler
  is one package under `packages/` with a pronounceable plgg-* name; internal
  `src/` follows the domain / entrypoints / vendors three-part split.
- `workaholic:implementation` / `policies/coding-standards.md` — the bundler's
  own TypeScript obeys the no-`as`/`any`/`ts-ignore` rule, Option not null,
  Result not throw, exhaustive `match`; validate the AST / filesystem / config
  inputs at `unknown` boundaries.
- `workaholic:implementation` / `policies/vendor-neutrality.md` — **headline
  policy.** Conservative Vendor Dependence: implement the core substrate
  ourselves, keep freedom to switch; obligates the dependency-decision log and
  forbids re-locking onto a fragile native binding.
- `workaholic:planning` / `policies/proactive-poc.md` — build small with intent
  to discard; validate against one real package (plgg) before full commitment.
- `workaholic:planning` / `policies/it-investment-evaluation.md` — phase the
  investment (PoC → one package → migration) to bound the maintenance-cost risk.
- `plgg-coding-style` skill + `CLAUDE.md` — house style, Prettier printWidth 50
  (each package carries its own `.prettierrc.json`).

## Key Files

- `packages/plgg/vite.config.ts` — baseline single-entry config (name `plgg`,
  formats es+cjs, `index.${format}.js`, minify, rollupTypes:false) the PoC must
  reproduce.
- `packages/plgg/package.json` — the canonical dist contract every consumer
  resolves: `main`/`module`/`exports`/`types`, `build: vite build`. The only
  package published to npm (v0.0.27).
- `packages/plgg/tsconfig.build.json` (and siblings) — exact declaration-emit
  settings (`declaration:true`, `rootDir:src`, `outDir:dist`) the bundler can
  feed to `tsc` instead of vite-plugin-dts.
- `packages/plgg-test/package.json` — already carries `@microsoft/api-extractor`
  in devDeps (candidate for the rolled-up `.d.ts` mode); its runner is
  bundler-independent (`bin/plgg-test.mjs`, Node type-stripping) and must keep
  working.
- `scripts/build.sh` — dependency-ordered build the bundler must slot into; the
  new package itself must build (bootstrap) before it can build others.

## Related History

The monorepo has an established dependency-sovereignty arc: it just replaced the
external vitest runner with the in-house plgg-test framework, and a recent CI
break exposed vite's rolldown native-binding as the next fragility to retire.

- [20260626130000-fix-deploy-guide-rolldown-binding.md](.workaholic/tickets/archive/work-20260626-221353/20260626130000-fix-deploy-guide-rolldown-binding.md) — the rolldown native-binding CI failure that motivates removing vite at the root (this ticket only patched it).
- [work-20260624-135934.md](.workaholic/stories/work-20260624-135934.md) — the vitest→plgg-test "dependency sovereignty" trip; the strategic precedent and sequencing template (build tool → migrate → purge).
- [20260624141705-u3-plgg-cleanup-and-final-grep-gate.md](.workaholic/tickets/archive/work-20260624-135934/20260624141705-u3-plgg-cleanup-and-final-grep-gate.md) — the proven purge/grep-gate pattern this effort's final ticket will follow.

## Implementation Steps

1. Scaffold a new package under `packages/` (suggested name `plgg-bundle` — final
   name is an implementation decision) following directory-structure: `src/domain`
   (pure bundling/config logic), `src/entrypoints` (the CLI bin), `src/vendors`
   (the TS→JS transpiler boundary), its own `.prettierrc.json`, `tsconfig*.json`,
   and a `bin` entry usable as `npm run build`'s target.
2. Choose the transpile mechanism behind `src/vendors/` (prefer a non-native-
   binding TS→JS transpiler with a clean exit strategy); record the four-point
   vendor-neutrality decision log in the package README or a `.workaholic/`
   note.
3. Implement a typed bundler config model (replacing vite.config's `lib`/
   `rollupOptions`): entries (single or multi), formats (es+cjs), `fileName`
   pattern, minify flag, external (string[] | regex | predicate), and dts mode
   (per-file tree | rolled-up). Parse/validate at the `unknown` boundary.
4. Emit dual ESM+CJS with `exports: "named"` and exact `index.${format}.js`
   naming; wire `.d.ts` emission via `tsc` (per-file tree) and api-extractor
   (rolled-up).
5. **PoC:** build `plgg` core with the bundler; diff the produced `dist/`
   against the current vite output (JS + per-file `.d.ts` tree + `exports`
   resolution); run plgg's plgg-test suite against the in-house-built dist.
6. Document the gaps (if any) the bundler does not yet cover, so the migration
   ticket (B2) knows what remains before cutover.

## Considerations

- **Do not reintroduce a native-binding bundler** — that is the exact fragility
  being retired (`packages/*/vite.config.ts` → rolldown; see the deploy-guide
  ticket). Keep the transpiler choice headless-reproducible in CI.
- The bundler must build itself/bootstrap before it can build the others; decide
  bootstrap ordering in `scripts/build.sh` (affects B2).
- Two `.d.ts` modes are mandatory — per-file tree (most packages) and rolled-up
  (`packages/plgg-kit`, `packages/plgg-foundry`). A single mode is insufficient.
- Keep the published dist contract byte-compatible enough that `file:` consumers
  and `packages/plgg/package.json` `exports` resolve unchanged; this is a
  breaking-change-OK project but the *dist shape* is the contract downstream
  packages depend on at build time.
- This is the PoC per `proactive-poc.md`: if the bundler cannot reproduce
  plgg's dist within reasonable effort, that finding (build-vs-buy) is itself a
  valid outcome — surface it rather than forcing the cutover.

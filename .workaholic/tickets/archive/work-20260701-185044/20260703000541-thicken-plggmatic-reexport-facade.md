---
created_at: 2026-07-03T00:05:41+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain, Config]
effort: 1h
commit_hash: 0da6a45
category: Changed
depends_on:
---

# Thicken `plggmatic` into a re-export facade over plgg-view, plgg-server, plgg-http, plgg-md and plgg-highlight

## Overview

Make `plggmatic` a **thicker framework facade**: it re-exports the full surfaces of `plgg-view` (incl. `/style`), `plgg-server` (incl. `/ssg`), `plgg-http`, `plgg-md`, and `plgg-highlight`, so a framework consumer (plggpress, and future apps) can import everything through `plggmatic` alone. This deliberately **amends the "thin framework" boundary agreed in ticket 213410** ("deliberately no plgg-view/md/highlight, since the framework never renders") — the framework now owns the consumer-facing vocabulary of the whole stack, and the consumer's dependency fan-out collapses. This ticket only thickens the facade; the consumer rewire is the dependent ticket `20260703000542-plggpress-consume-thick-plggmatic.md`.

Scope decisions (recommended defaults recorded while the developer was away from the interrogation prompt — confirm or adjust at the `/drive` approval gate):

- **Wrap all five** packages (not just the three named in the request), so plggpress can end with deps `{plgg, plggmatic}`.
- **`plgg` (foundation) stays a direct dependency** of every consumer — it is the universal vocabulary, not a framework concern; it is NOT re-exported.
- **Mirror subpaths**: add `plggmatic/ssg` (mirroring `plgg-server/ssg`) and `plggmatic/style` (mirroring `plgg-view/style`) rather than flattening everything into one barrel — this avoids the known name collisions (`p` in view vs style, `build`/`loadConfig`/`BuildReport`/`configLoadError` between plggmatic's own modules and the wrapped libs).

## Policies

The standard engineering policies that govern this ticket. The implementing session MUST read each linked policy hard copy before writing code.

- `workaholic:implementation` / `policies/directory-structure.md` — conventional project layout (applies to all code work); the facade lives in the framework package, dependencies point down the layer stack only
- `workaholic:implementation` / `policies/coding-standards.md` — no-escape-hatch rule (`as`/`any`/`ts-ignore` prohibited); type-preserving `export { type X } from` re-exports; house style per `plgg-coding-style`
- `workaholic:implementation` / `policies/domain-layer-separation.md` — the facade is an anti-corruption/vendor boundary exposing one framework vocabulary; entry points stay thin
- `workaholic:design` / `policies/vendor-neutrality.md` — the wrap is a pure surface re-export (no logic), so a mid-lib can be rebuilt/switched behind the facade; zero new external dependencies
- `workaholic:implementation` / `policies/vendor-neutrality.md` — implementation counterpart: thin type-preserving barrier; the facade must not become a place where behavior accretes
- `workaholic:design` / `policies/modular-monolith-first.md` — collapsing the consumer's dependency fan-out behind one facade, keeping clean internal module boundaries
- `workaholic:design` / `policies/sacrificial-architecture.md` — this is a deliberate re-boundary of rebuildable units; breaking changes acceptable (plgg is its own only consumer), but the rationale must be recorded (this ticket + the PR story)

## Key Files

- `packages/plggmatic/package.json` - the facade to thicken: deps today are `plgg, plgg-http, plgg-server, plgg-cli`; must ADD `plgg-view, plgg-md, plgg-highlight` (`file:` deps + `npm install` to mint the node_modules symlinks); exports map gains `./ssg` and `./style` (keep `types` + `default` conditions — plgg-bundle's surface `require()` needs them)
- `packages/plggmatic/src/index.ts` - current barrel exports only plggmatic's own modules (AppOptions, loadConfig, buildRouter, BuildSpec/build, AppRunContext/resolveOptions, AppDefinition/runApp); add the wrapped re-exports here; barrel is coverage-excluded, so pure re-exports add no test burden
- `packages/plggmatic/bundle.config.ts` - single `index` ESM entry today; add `ssg` and `style` entries for the mirrored subpaths (externals stay derived from package.json, never listed)
- `packages/plgg-bundle/src/domain/usecase/deriveExternal.ts` - the governing constraint: externals = declared deps (+ `dep/` subpaths) + `node:*`; any undeclared import specifier fails the graph walk loudly — deps and re-exports must land together
- `packages/plggmatic/README.md` - dependency diagram and cross-links must reflect the new deps (`gate-readme.sh` dead-link/coverage gate runs in check-all + CI)
- `packages/plggpress/src/router/pressRouter.ts`, `packages/plggpress/src/theme/shell.ts`, `packages/plggpress/src/devEntry.ts` - read-only reference for THIS ticket: the densest consumers defining the surface the facade must cover (see inventory below)

## Related History

plggmatic was scaffolded as a deliberately thin framework and plggpress rewired onto it with a byte-identical-output guarantee; this ticket amends that boundary explicitly rather than silently.

Past tickets that touched similar areas:

- [20260701213410-scaffold-plggmatic-framework-extract-composition.md](.workaholic/tickets/archive/work-20260701-185044/20260701213410-scaffold-plggmatic-framework-extract-composition.md) - scaffolded plggmatic; its Final Report records "deps: plgg, plgg-http, plgg-server, plgg-cli — deliberately NO plgg-view/md/highlight, since the framework never renders" (the boundary this ticket reverses)
- [20260701213411-reimplement-plgg-press-on-plggmatic.md](.workaholic/tickets/archive/work-20260701-185044/20260701213411-reimplement-plgg-press-on-plggmatic.md) - rewired plgg-press onto plggmatic with byte-identical guide output (the regression oracle this work inherits)
- [20260701213412-rename-plgg-press-to-plggpress.md](.workaholic/tickets/archive/work-20260701-185044/20260701213412-rename-plgg-press-to-plggpress.md) - established the current plggpress package the dependent ticket will edit
- [20260702032000-resume-plggmatic-rewire-blocked-on-bundle-dynamic-import.md](.workaholic/tickets/archive/work-20260701-185044/20260702032000-resume-plggmatic-rewire-blocked-on-bundle-dynamic-import.md) - documents the ESM/bundle constraints (surface require() needs types+default exports; dynamic import fallback) a re-export facade must respect
- [20260702215004-readme-every-package-linked-top-to-bottom.md](.workaholic/tickets/archive/work-20260701-185044/20260702215004-readme-every-package-linked-top-to-bottom.md) - the README dependency-diagram/coverage gate this dep change ripples into

## Implementation Steps

1. **Record the boundary amendment**: note in plggmatic's README (design section) that the framework now owns the full consumer-facing surface (view/server/http/md/highlight) and why (single-facade consumers, dependency fan-out reduction) — sacrificial-architecture policy requires the rationale to be durable.
2. **Add deps**: `plgg-view`, `plgg-md`, `plgg-highlight` as `file:../...` dependencies in `packages/plggmatic/package.json`; run `npm install` in the package to mint node_modules symlinks. (`plgg-http`, `plgg-server` are already deps.)
3. **Main barrel re-exports** in `src/index.ts`: re-export the main surfaces of all five packages. Prefer explicit named re-export lists over blind `export *` where collisions exist; enumerate collisions between plggmatic's own exports (`build`, `loadConfig`, `BuildSpec`, `AppOptions`…) and the wrapped libs first (`grep`-driven inventory), and resolve them without renaming the libs' established names — if a genuine clash is unavoidable, keep the lib name and rename plggmatic's own symbol (the framework's own module names are newer and cheaper to move). No `as`-casts; type-only symbols re-export via `export { type X } from`.
4. **Subpath mirrors**: create `src/ssg.ts` (`export * from "plgg-server/ssg"`) and `src/style.ts` (`export * from "plgg-view/style"`); add `./ssg` and `./style` to the exports map (types + default conditions) and matching entries in `bundle.config.ts`.
5. **Coverage config**: add the new barrel files (`ssg.ts`, `style.ts`) to the coverage exclusions alongside `index.ts` (they are logic-free re-export barrels).
6. **Surface completeness check against the consumer inventory** (from discovery; the dependent ticket relies on this): plgg-view {renderToString, Html, Flow, Attribute, header, div, a, button, span, label, text, attr, class_, section, h1, h3, p, main_, input, slot, nav, html, head, body, title, style, meta, link, collectCss}; plgg-view/style {style_, p}; plgg-md {MarkdownDoc, renderMarkdownWith, frontmatter, plainHighlighter}; plgg-server {HttpRequest, HttpResponse, handle, Web, Handler, Context, HttpError, splitPath, htmlResponse, internalError, notFound, Fetch, toFetch}; plgg-server/ssg {SsgError, discoverPaths}; plgg-highlight {asHighlighter}. Every listed symbol (values AND types) must resolve from `plggmatic` / `plggmatic/ssg` / `plggmatic/style`. Wrap the full public surfaces, not just this list — the list is the floor, not the ceiling.
7. **Build + verify**: rebuild plggmatic's dist (`plgg-bundle`), run `scripts/tsc-plgg.sh`, then a fresh `scripts/check-all.sh` (stale dists mask consumer type drift — fresh rebuild is the only honest check).
8. **README**: update plggmatic's dependency diagram and relative links; `gate-readme.sh` must stay green.

## Quality Gate

Captured from the proposed gate (developer was away; recommended defaults recorded — confirm at the `/drive` approval prompt).

**Acceptance criteria** — the checkable conditions that must hold:

- `packages/plggmatic/package.json` declares `plgg, plgg-http, plgg-server, plgg-cli, plgg-view, plgg-md, plgg-highlight` and its exports map has `.`, `./ssg`, `./style`, each with `types` and `default` conditions
- Every symbol in the Step 6 inventory resolves from `plggmatic` (or its `/ssg`, `/style` subpaths) under `tsc` with no escape hatches (`grep -rn "as \|any\|ts-ignore"` over the new/changed plggmatic files shows no new violations)
- The re-export barrels contain no logic (re-export statements only)
- Guide build output is unchanged by this ticket (plggpress untouched; byte-identity holds trivially and is spot-checked)

**Verification method** — the commands/tests/probes that prove them:

- `scripts/tsc-plgg.sh` clean
- Fresh `scripts/check-all.sh` green — includes the plgg-bundle graph walk (deriveExternal fails loudly on any undeclared import), the >90% per-package coverage gates, and `gate-readme.sh`
- A throwaway compile probe (a `.ts` file importing every Step 6 symbol from `plggmatic`/`plggmatic/ssg`/`plggmatic/style`, type-checked then deleted) or the dependent ticket's rewire acting as the real probe

**Gate** — what must pass before approval:

- tsc + fresh check-all green, the Step 6 inventory proven resolvable, README gate green; the developer confirms the recorded scope decisions (all-five wrap, plgg stays direct, subpath mirrors) at the approval prompt

## Considerations

- This ticket **reverses a recorded design decision** (213410's "the framework never renders"); the reversal is intentional and must stay explicit in the README/PR story, not implicit in a dep list (`packages/plggmatic/README.md`)
- Name collisions are the main hazard of a wide facade: `plgg-view/style` exports `p` and `style_` that clash with or shadow main-barrel names — the subpath mirror avoids cross-package collisions, but plggmatic's own `build`/`loadConfig` vs wrapped-lib names must be inventoried before choosing explicit export lists (`packages/plggmatic/src/index.ts`)
- plggmatic is ESM-only: keep `types` + `default` export conditions on every entry — plgg-bundle discovers the export surface by `require()`ing the built bundle, and import-only maps break it (see 032000 resume ticket / repo memory)
- `deriveExternal` treats `dep/subpath` as external only when `dep` is declared — the subpath mirror files (`export * from "plgg-server/ssg"`) are safe because plgg-server is a declared dep (`packages/plgg-bundle/src/domain/usecase/deriveExternal.ts`)
- Zero new external dependencies: this ticket adds re-export surface, not runtime weight; nothing outside the plgg family enters any package.json
- Do NOT touch plggpress in this ticket — the consumer rewire is `20260703000542-plggpress-consume-thick-plggmatic.md`, which depends on this one; splitting keeps each change independently verifiable (mirrors the proven 213410→213411 split)
- plggmatic must never depend on plggpress or any consumer; dependency direction stays foundation → mid-libs → framework → consumer

## Final Report

Development completed as planned. plggmatic now wraps all five mid-library surfaces (main barrel + `plggmatic/ssg` + `plggmatic/style` mirrors), with the boundary amendment recorded in its README. Verified: `tsc-plgg.sh` clean; fresh `check-all.sh` exit 0; a compiler-API probe proved all 62 consumer-inventory symbols (values and types) resolve from the facade (338 root / 17 ssg / 67 style exports, none missing); escape-hatch grep clean.

### Discovered Insights

- **Insight**: plgg-server's per-file d.ts re-exports plgg-http and plgg-view by specifier, so their shared names are the SAME TypeScript symbols — `export *` from both is unambiguous. plgg-http's entire surface (42 names) is covered by plgg-server's re-exports.
  **Context**: Star-export ambiguity only bites where declarations genuinely differ. Of ~56 name collisions across the five libs, only 9 are distinct symbols (`head`/`header`/`on` view-vs-server; `link`/`strong`/`table`/`text$`/`ListItem`/`TableRow` view-vs-md); ESM/TS silently drops those from star exports, so the facade re-exports the plgg-view variant explicitly. Any future facade work should re-run the symbol-identity check (TS compiler API, `getAliasedSymbol`) rather than trusting name-level collision lists.
- **Insight**: plgg-bundle's `emitDts` preserves external module specifiers in the emitted d.ts, so a consumer resolves `export * from "plgg-view"` through plggmatic's OWN node_modules (npm `file:` symlinks resolve from the realpath).
  **Context**: This is what makes the dep collapse work: plggpress can drop plgg-view et al. from its node_modules because plggmatic's node_modules supplies them at both type-check and runtime.

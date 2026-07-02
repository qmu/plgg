---
created_at: 2026-07-01T21:34:10+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure]
effort: 4h
commit_hash: 1f35945
category: Added
depends_on: [20260701013300-refine-softstr-to-str-domain-strings.md, 20260701013301-brand-case-shaped-strings-kebabcase.md, 20260701013302-refine-number-to-int-ids-counts.md, 20260701013303-refine-number-to-sized-uint-resource-quantities.md, 20260701013304-refine-opacity-number-to-float.md, 20260701195048-defineSite-typed-author-facing-input.md, 20260701204204-define-variant-combinator-collapse-box-scaffold.md, 20260701204205-refined-brand-smart-constructor-factory.md, 20260701204206-ord-compare-total-order-primitive.md, 20260701204207-fold-thrown-unknown-error-adapter.md, 20260701211838-collapse-async-result-ladders-onto-proc.md, 20260701211839-plgg-press-tokens-typography-match-qmu.md, 20260701211840-plgg-press-sidebar-first-layout-match-qmu.md]
---

# Create `plggmatic`: scaffold the composable full-stack framework and extract plgg-press's reusable seam

## Overview

Introduce a new package **`plggmatic`** — "a pre-organized, lightweight, composable full-stack web application framework" — that sits between the plgg libraries and application packages: **`plgg libraries → plggmatic → plggpress`**. This ticket **scaffolds the package and lifts the framework-generic composition** that plgg-press currently hard-wires, so that (in ticket B) plgg-press becomes a thin `plggmatic` consumer and (in ticket C) is renamed `plggpress`.

**Sequencing (author-directed):** implement **after the entire current todo backlog** — the 13 tickets in `depends_on` (branded-type refinements, the four foundation combinators, the proc-ladder collapse, and both qmu.co.jp theming tickets). This ticket runs last; `/drive` topo-sorts it after all of them.

**First-cut scope (author-confirmed): generalize exactly what plgg-press needs** — no speculative surface. Lift the reusable seam plgg-press already exercises:

- **Config loading** — the `loadConfig` mechanism (dynamic-import the consumer's `*.config.ts` via Node type-stripping, pick default export, validate through a caller-supplied caster into a typed value or a typed `ConfigLoadError`). `plggmatic` owns the import+validate+typed-error machinery; the app supplies its own config schema.
- **Render pipeline / router builder** — generalize `pressRouter`/`pageHandler` into "build a `plgg-server` `Web` router from a set of routes each bound to a render function," parameterized by content source + renderer + layout. `plggmatic` owns the router assembly; the app supplies md→highlight→theme specifics.
- **Static build (SSG)** — generalize `build()`: `discoverPaths → (optional link-check hook) → generateStatic(router) → copyAssets → write404`, one `PromisedResult` transform. `plggmatic` owns the orchestration; the app supplies the router factory, the 404 page, and any link-check policy.
- **Dev server** — generalize `dev()`: host the router via `plgg-server/node` serve with a Host allowlist, `fs.watch` debounced rebuild, and SSE live-reload. `plggmatic` owns the dev loop; the app supplies the router factory + reload path.
- **App options** — generalize `PressOptions` (`contentDir/outDir/assetsDir/base/dev/allowedHosts`) into a framework app-options type.
- **Pre-organized CLI** — expose a helper that wires a `plgg-cli` program with `build`/`dev` commands onto the above and folds `Result` to an exit code, so an app's `cli.ts` stays a thin declaration ("pre-organized" = the framework brings the wiring).

**Deferred (not this ticket):** dynamic SSR routes, data/DB (`plgg-sql`) wiring, and API handlers beyond plgg-press's current use — added later once a real consumer needs them (PoC-first, per `workaholic:planning`).

**Design-first note:** the exact `plggmatic` public API and the framework⇄app boundary are a design decision this ticket must **agree before broad coding** (per the plgg working style); land the boundary as a short design sketch in the ticket's Discussion before extraction, then extract.

## Policies

- `workaholic:planning` / `policies/terminology.md` — **"plggmatic"** enters the Ubiquitous Language as a one-word-per-concept term used consistently across package name, path alias, barrel, docs, and commits.
- `workaholic:planning` / `policies/proactive-poc.md` — a new framework is high-uncertainty; prove value with the smallest runnable slice (the plgg-press reimplementation in ticket B is the PoC oracle), don't build speculative surface.
- `workaholic:implementation` / `policies/directory-structure.md` — scaffold `packages/plggmatic` exactly like sibling consumer packages: `src/` with `<Feature>/model` + `<Feature>/usecase` modules, a root `src/index.ts` barrel, `tsconfig.json` with the `plggmatic/*` path alias, `bundle.config.ts`, `plgg-test.config.json`, `package.json` (`file:../*` deps), `.prettierrc.json`. It sits **outside** plgg-core's eleven-category taxonomy (that governs only `packages/plgg`) but under the same conventions.
- `workaholic:implementation` / `policies/coding-standards.md` — full strict-flag set identical to `packages/plgg`; no `as`/`any`/`@ts-ignore`; boundary casters at the config edge.
- `workaholic:implementation` / `policies/domain-layer-separation.md` — `plggmatic` exposes composable domain functions; `build`/`dev`/CLI stay thin entry points over them (the coverable logic must live in testable modules, not the excluded `index.ts`/`cli.ts`).
- `workaholic:implementation` / `policies/functional-programming.md` — the framework API is data-last and composable (a `Web`/router value threaded through `pipe`/`proc`), **not** a mode-y monolith; behavior predictable from signatures.
- `workaholic:design` / `policies/modeless-design.md` — a framework API is developer UX: composable, actions available without entering a mode; sane defaults that stay overridable.
- `workaholic:design` / `policies/vendor-neutrality.md` — build only on the existing plgg family + already-present `typescript`; **zero new external dependencies**; keep the node seam (`plgg-server/node`) thin and swappable.
- `workaholic:operation` / `policies/ci-cd.md` — register the package in the canonical runners and CI so its suite runs reproducibly; no bespoke per-command scripts beyond the established `scripts/*-<pkg>.sh` pattern.
- `plgg-coding-style` (skill) — Option/Result, `pipe`/`proc`/`cast`, Prettier printWidth 50, colocated `*.spec.ts`, ≥90% coverage.

Repo constraints: `.workaholic/constraints/architecture.md` (upward-only dependency direction — the "new package added" review trigger fires; `plggmatic` sits above the plgg libs, below apps, no cycles), `.workaholic/constraints/quality.md` (strict flags, ≥90% coverage, escape-hatch prohibition).

## Key Files

Source of the seam to lift (read, generalize — do not yet delete; ticket B rewires plgg-press):

- `packages/plgg-press/src/build.ts` — the static-build composition to generalize.
- `packages/plgg-press/src/dev.ts` — the dev-server loop to generalize.
- `packages/plgg-press/src/cli.ts` — the CLI wiring (`program`/`command` + `runCli`, `Result`→exit) to pre-organize.
- `packages/plgg-press/src/router/pressRouter.ts` — the router/render pipeline to parameterize.
- `packages/plgg-press/src/Config/usecase/loadConfig.ts` — the config-load mechanism to generalize (decoupled from the press-specific schema).
- `packages/plgg-press/src/Press/model/PressOptions.ts` — the run-input contract to generalize into app-options.
- `packages/plgg-press/src/index.ts` — the current public surface; its framework-generic vs press-specific split defines the `plggmatic`/app boundary.

Building blocks `plggmatic` composes (consume via package-name aliases, unchanged):

- `packages/plgg-server/src/index.ts` — `web()/get()`, `htmlResponse`, `toFetch`/`Fetch`, plus `./ssg` (`generateStatic`/`discoverPaths`/`copyAssets`/`write404`) and `./node` (`serve`) subpath exports.
- `packages/plgg-view/src/index.ts` — `Html`, `renderToString`, `collectCss`, `style_`.
- `packages/plgg-md/src/index.ts` — `renderMarkdownWith(highlighter, hrefResolver)`, `MarkdownDoc`.
- `packages/plgg-highlight/src/index.ts` — `asHighlighter()`.
- `packages/plgg-cli/src/index.ts` — `program`/`command`/`option`/`runCli`.

Scaffolding template (mirror the smallest clean package):

- `packages/plgg-cli/{package.json,tsconfig.json,bundle.config.ts,plgg-test.config.json}` and its `bin/*.mjs` + `bin/hook.mjs` self-alias resolver — the template for `plggmatic`'s package files (and, if `plggmatic` ships a bin, its launcher/hook).
- `scripts/build.sh`, `scripts/check-all.sh`, `scripts/test-<pkg>.sh`/`coverage-<pkg>.sh` — register `plggmatic` in build ordering (after the plgg libs it composes, before apps) and the test/coverage runners.

## Related History

- [20260701184816-plgg-cli-command-line-program-wrapper-toolkit.md](.workaholic/tickets/archive/work-20260701-185044/20260701184816-plgg-cli-command-line-program-wrapper-toolkit.md) — **the precedent to mirror**: a new package born with "scaffold + reimplement plgg-press's CLI on it" as the acceptance oracle. `plggmatic` follows the same "scaffold + one real usecase" proof structure (ticket B).
- [20260630013504-plgg-press-scaffold-siteconfig-cli.md](.workaholic/tickets/archive/work-20260630-013457/20260630013504-plgg-press-scaffold-siteconfig-cli.md) — the origin of the `SiteConfig`/`build()`/`dev()` facade being generalized.
- [20260617001953-ssg-static-site-generation.md](.workaholic/tickets/archive/work-20260617-002003/20260617001953-ssg-static-site-generation.md) — the `plgg-server/Ssg` foundation `plggmatic` formalizes as its static-generation layer.
- [20260528091347-fullstack-example-combining-view-sql-http-client.md](.workaholic/tickets/archive/work-20260528-011843/20260528091347-fullstack-example-combining-view-sql-http-client.md) — prior-art for what a plgg "full-stack" composition looks like (informs the deferred SSR/data surface).

## Implementation Steps

1. **Agree the boundary (design-first).** In a short Discussion note, fix the `plggmatic` public API and the framework⇄app split: which of loadConfig/router-builder/build/dev/app-options/CLI-wiring `plggmatic` owns, and what an app must supply (config caster, route→render map, theme/layout, 404). Confirm it against the modeless/composable design policy before coding.
2. **Scaffold `packages/plggmatic`** from the plgg-cli template: `package.json` (`file:../*` deps: plgg, plgg-server, plgg-view, plgg-md, plgg-highlight, plgg-cli, plgg-http), `tsconfig.json` (`paths: {"plggmatic/*": ["./src/*"]}`, strict, Bundler resolution), `bundle.config.ts` (alias prefix `plggmatic`), `plgg-test.config.json` (threshold 90), `.prettierrc.json`, `src/index.ts` barrel.
3. **Extract config loading** into `plggmatic` (`Config/usecase/loadConfig`): dynamic import + default-export pick + caller-supplied caster → typed value or `ConfigLoadError`. Generic over the config type; no press-specific schema.
4. **Extract the router builder** (`Routing/usecase`): "routes + render fn → `plgg-server` `Web`," parameterized by content/renderer/layout; keep the pure-core vs node-adapter separation.
5. **Extract static build** (`Build/usecase`) and **dev server** (`Dev/usecase`) as generic orchestrations over the router builder + `plgg-server/ssg` + `plgg-server/node`, with the link-check and reload as injected hooks.
6. **Extract app-options** (`App/model`) and the **pre-organized CLI helper** (`Cli/usecase`) that wires `build`/`dev` commands onto the above and folds `Result` → exit code.
7. **Spec everything** (colocated `*.spec.ts`, ≥90% coverage per `plgg-test.config.json`); the coverable logic must live in modules, not the excluded `index.ts`/`cli.ts`.
8. **Register** `plggmatic` in `scripts/build.sh` ordering (after its plgg-lib deps), `scripts/check-all.sh`, and `scripts/test-plggmatic.sh`/`coverage-plggmatic.sh`; ensure CI runs its suite.
9. Run `scripts/tsc-plgg.sh` + `scripts/test-plgg.sh`; confirm no cycle (`plggmatic` imports no app package).

## Quality Gate

**Acceptance criteria:**
- `packages/plggmatic` exists with the full package convention set (package.json/tsconfig+alias/bundle.config/plgg-test.config/.prettierrc/src barrel) and is registered in `build.sh`, `check-all.sh`, and its test/coverage runners + CI.
- `plggmatic` exposes the generalized seam — config-load, router builder, static build, dev server, app-options, pre-organized CLI helper — each as composable, data-last functions with no press-specific types leaking in.
- Dependency direction holds: `plggmatic` imports only the plgg libraries (grep shows **no** import of `plgg-press`/`plggpress`/`example`/`guide`); no import cycle.
- Strict flags identical to `packages/plgg`; **no `as`/`any`/`@ts-ignore`**; ≥90% coverage (statements/branches/functions/lines) with `index.ts`/`cli.ts` excluded per convention.
- plgg-press is **untouched and still green** (this ticket only adds `plggmatic`; the rewire is ticket B).

**Verification method:**
- `scripts/tsc-plgg.sh` exits 0; `scripts/test-plgg.sh` green including the new `plggmatic` suite at ≥90% coverage.
- `git grep -nE "plgg-press|plggpress|/example|/guide" packages/plggmatic/src` returns nothing (clean upward dependency).
- `git grep -nE "as any|@ts-ignore| as [A-Z]" packages/plggmatic/src` returns nothing.

**Gate:** tsc + full test suite green (incl. plggmatic ≥90%), no escape hatch, clean upward-only deps with no cycle, plgg-press still green, and the framework⇄app boundary Discussion note recorded — all before approval.

## Considerations

- **Boundary is the whole game.** Over-lift and plggpress has nothing left / can't override; under-lift and plggmatic isn't a framework. Draw the line at "press supplies schema + theme + content specifics; plggmatic supplies wiring" and validate it against ticket B's thin-consumer target (`packages/plgg-press/src/index.ts`).
- **Keep the pure-core/adapter split.** Mirror `plgg-server`'s root vs `/ssg` vs `/node` separation so dev-server/fs seams stay swappable and testable without node (`packages/plgg-server/src/index.ts`).
- **No new deps.** Everything composes from the plgg family + `typescript`; do not pull an external framework/runtime (`workaholic:design` / vendor-neutrality).
- **Coverage placement.** `index.ts`/`cli.ts` are coverage-excluded; ensure build/dev/router/config logic lives in coverable `usecase` modules (`packages/plgg-press/plgg-test.config.json` shows the exclusion convention).
- **Deferred surface is real.** SSR/dynamic routes + `plgg-sql` data wiring are explicitly out; when added, they extend `plggmatic` without breaking the SSG surface — note the extension seam but don't build it.
- Tickets B (reimplement plgg-press on `plggmatic`) and C (rename → `plggpress`) depend on this; the two qmu.co.jp theming tickets land first (carry-over), so B ports the finished theme forward verbatim.

## Final Report (plggmatic scaffolded + generic seam extracted; plgg-press untouched + green)

### Framework⇄app boundary (design note, agreed before extraction)

**plggmatic owns (framework-generic):** config import+validate+typed-error machinery; the router-assembly fold; the static-build orchestration; the dev-server loop (host allowlist, fs.watch → debounced rebuild, SSE live-reload); the app-options shape; the pre-organized CLI wiring (`build`/`dev` + `Result`→exit).

**The app supplies (specifics):** its config type + boundary caster; the single `Handler` that turns a request path into a rendered response (content-source → renderer → layout); the already-rendered 404 body; any link-check policy; and the `base`/`allowedHosts` it reads from its own config. The line is exactly *"press supplies schema + theme + content specifics; plggmatic supplies wiring."*

### Package (`packages/plggmatic`, `"type": "module"`, ESM-only bundle)

Scaffolded from the plgg-cli template: `package.json` (deps `plgg`, `plgg-http`, `plgg-server`, `plgg-cli` — deliberately **no** plgg-view/md/highlight, since the framework never renders), `tsconfig.json` (`plggmatic/*` alias, ESNext + Bundler, full strict set), `bundle.config.ts` (alias prefix `plggmatic`), `plgg-test.config.json` (threshold 90, excludes `index.ts`/`runApp.ts`/fixtures), `.prettierrc.json`, `src/index.ts` barrel.

Extracted, generalized modules:
- **`Config/usecase/loadConfig`** — `loadConfig<T>(path, cast)`: dynamic-import + default-pick + caller-supplied caster → `T` | `ConfigLoadError`.
- **`Routing/usecase/buildRouter`** — `buildRouter(paths, handler): Web`: one GET route per path, all bound to the app handler.
- **`Build/usecase/build`** — `build(opts, spec)`: discover → optional `linkCheck` (an injected `Option` hook) → `generateStatic(spec.router)` → `copyAssets` → `write404(spec.notFoundHtml)`, one `proc`; error `SsgError | Defect | E`.
- **`Dev/usecase/dev`** — the whole dev loop generalized over an injected `router` factory (reload path `/__plggmatic_reload`).
- **`App/model/AppOptions`** (`AppOptions`/`BuildReport`/`DevServer`) + **`App/model/AppError`** (`ConfigLoadError`, generalized off press).
- **`Cli/usecase/resolveOptions`** (`configPathOf`/`resolveOptions`, coverable) + **`Cli/usecase/runApp`** (`runApp(AppDefinition)` — the thin, coverage-excluded CLI wiring an app's `cli.ts` reduces to `await runApp(def)`).

### Registration
`scripts/build.sh` (plggmatic builds after plgg-cli, before plgg-press), `scripts/check-all.sh` (test step added), new `scripts/test-plggmatic.sh` + `scripts/coverage-plggmatic.sh`. CI note: `run-tests.yml` runs only plgg-core + the gates; `check-all.sh` is the canonical multi-package gate (where plgg-press lives too), so plggmatic joins it there — no per-package `run-tests.yml` entry exists to add.

### Verification
- `packages/plggmatic` tsc clean, **25 passed**; coverage **97.19% st / 92.86% br / 92.19% fn / 97.19% ln** (all >90%).
- `plgg-bundle` builds `dist/index.es.js` + `.d.ts` cleanly.
- `git grep -nE "plgg-press|plggpress|/example|/guide" packages/plggmatic/src` → **empty** (upward-only deps, no cycle).
- `git grep -nE "as any|@ts-ignore| as [A-Z]" packages/plggmatic/src` → **empty**.
- **plgg-press untouched** (no `git status` changes under it) — additive ticket; the rewire is ticket B (213411).

### Deferred (noted, not built)
SSR/dynamic routes and `plgg-sql` data wiring stay out (PoC-first) — they extend plggmatic later without breaking the SSG surface. plggmatic ships **no bin** (its consumer app carries the launcher/hook); a bin can be added if a future app wants `plggmatic`-the-CLI directly.

---
manager: architecture-manager
last_updated: 2026-02-26T04:18:49+09:00
---

# Architecture

The plgg monorepo defines a layered functional type system (`plgg`), vendor adapter layer (`plgg-kit`), and AI operation engine (`plgg-foundry`). These three published packages form a dependency stack with a single upward direction. Structural coherence depends on enforcing this direction and the internal conventions each layer uses.

## Package Dependency Direction

**Bounds**: `plgg` must not import from `plgg-kit`, `plgg-foundry`, or `example`. `plgg-kit` must not import from `plgg-foundry` or `example`. `plgg-foundry` must not import from `example`.

**Rationale**: The dependency stack (`plgg` → `plgg-kit` → `plgg-foundry`) ensures that the foundational type system is free of AI-specific or vendor-specific concerns. Reversing or skipping levels would collapse the abstraction layers and create coupling that prevents independent versioning.

**Affects**: All leader agents modifying `packages/plgg/`, `packages/plgg-kit/`, `packages/plgg-foundry/`, or `packages/example/`.

**Criterion**: A compliance check passes if no `import` statement in `packages/plgg/src/` references `plgg-kit` or `plgg-foundry`, and no `import` in `packages/plgg-kit/src/` references `plgg-foundry`. Verifiable via static import analysis or TypeScript compilation.

**Review trigger**: Revisit if a new package is added to the monorepo or if `plgg-kit` grows beyond vendor adapters.

## Module Export Convention

**Bounds**: Every package must expose its public API exclusively through its root `src/index.ts`. Internal modules may only be imported by consumers using the package-level path alias (e.g., `plgg/Atomics`), never via relative paths that cross package boundaries.

**Rationale**: This convention was established for all four packages and ensures that the `vite-plugin-dts` build produces a coherent single `dist/index.d.ts` declaration file. Breaking this convention would produce incomplete public types.

**Affects**: Leader agents adding new modules or changing import patterns in any package.

**Criterion**: Every new module added to a package must be re-exported from the package's root `src/index.ts` (or a sub-barrel that the root re-exports). Verifiable by checking that TypeScript compilation produces no "not found" errors for the new module's exports.

**Review trigger**: Revisit if a package grows large enough to warrant namespace sub-packages with separate entry points.

## TypeScript Strictness Configuration

**Bounds**: All packages must maintain the current TypeScript strictness settings: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `erasableSyntaxOnly`, `isolatedModules`. The use of `as`, `any`, and `@ts-ignore` is prohibited as stated in `CLAUDE.md`.

**Rationale**: These settings were explicitly chosen across all four packages (identical `tsconfig.json` configurations). They enforce the type discipline that makes the `Result`/`Option`/`cast`/`proc` pipeline pattern reliable without escape hatches.

**Affects**: All leader agents writing TypeScript in any package.

**Criterion**: `scripts/tsc-plgg.sh` (and equivalent scripts for other packages) must exit with code 0. Any `as`, `any`, or `@ts-ignore` in source files constitutes a violation.

**Review trigger**: Revisit when upgrading TypeScript major versions or when a new TypeScript feature would provide a safer alternative to a currently-avoided pattern.

## plgg Category Taxonomy

**Bounds**: New types or functions added to `plgg` must be placed in one of the eleven established categories: `Abstracts`, `Atomics`, `Basics`, `Collectives`, `Conjunctives`, `Contextuals`, `Disjunctives`, `Exceptionals`, `Flowables`, `Functionals`, `Grammaticals`. Creating a new top-level category requires an explicit architecture decision.

**Rationale**: The eleven-category taxonomy has proven sufficient for the current library surface. Each category has a clear semantic scope (primitives, containers, control flow, type-level utilities, etc.). Unbounded category growth would dilute discoverability.

**Affects**: Leader agents working on `plgg` feature additions.

**Criterion**: A new file added to `packages/plgg/src/` must reside under one of the eleven existing category directories. Verifiable by directory listing.

**Review trigger**: Revisit when adding a fundamentally new type class family (e.g., Reader, Writer, State monads) that does not fit an existing category.

## plgg-foundry Apparatus Interface Stability

**Bounds**: The `Processor`, `Switcher`, and `Packer` apparatus interfaces must remain backward-compatible. Specifically: `Processor.fn` must continue to accept `Medium` and return `unknown`; `Switcher.fn` must continue to return `[boolean, Dict<string, Datum>]`. These are the contracts sent to user-defined functions.

**Rationale**: Applications define custom apparatus functions that depend on these contracts. A breaking change would silently mismatch the runtime contract without TypeScript catching it if the user's function is typed permissively.

**Affects**: Leader agents modifying `packages/plgg-foundry/src/Foundry/model/` or `packages/plgg-foundry/src/Alignment/model/`.

**Criterion**: The existing `TodoFoundry.spec.ts` and `ProfileFoundry.spec.ts` tests must continue to pass after any change to the apparatus interfaces. Verifiable via `scripts/test-plgg-foundry.sh`.

**Review trigger**: Revisit when a major version bump of `plgg-foundry` is planned or when the Alignment schema requires a structural change.

## LLM Provider Abstraction Boundary

**Bounds**: All LLM API calls must go through `plgg-kit`'s `generateObject` function. Direct use of OpenAI, Anthropic, or Google SDK clients from `plgg-foundry` source code is prohibited. New vendor support must be added in `plgg-kit/src/LLMs/vendor/`.

**Rationale**: `plgg-foundry` depends on `plgg-kit` specifically to avoid direct vendor coupling. The `Provider` Box type and `generateObject` dispatcher exist to allow provider switching without changing foundry logic.

**Affects**: Leader agents adding new LLM integrations or modifying the blueprint execution in `plgg-foundry`.

**Criterion**: No `import` from an LLM vendor SDK (e.g., `openai`, `@anthropic-ai/sdk`, `@google/generative-ai`) appears in `packages/plgg-foundry/src/`. Verifiable via static import analysis.

**Review trigger**: Revisit when adding a new LLM vendor or when `plgg-kit` is split into separate vendor packages.

## Vendor Boundary (domain / vendors / entrypoints)

**Bounds**: Every package's `src/` keeps third-party code behind an anti-corruption boundary. A third-party import — a `node:*` builtin, a Web-platform SDK, or the tsc compiler API (`typescript`); the repo has zero third-party npm **runtime** deps — may appear in **production** code ONLY under `src/vendors/**` (the anti-corruption layer, the sole place third-party types are touched) or `src/entrypoints/**` (thin CLI/HTTP shells — the program checkpoints, a `bin/` launcher is outside `src/`). The three-part layout is `src/domain/{model,usecase}` (pure domain), `src/vendors/` (boundary), `src/entrypoints/` (checkpoints). plgg-family packages (`plgg`, `plgg-*`, `plggmatic*`, `plggpress*`, and self-aliases) are **domain vocabulary, not vendors** — importable anywhere; so are the sanctioned boundary-crossing plgg types (`Option`, `Result`, `Str`, `SoftStr`, `Dict`, `Datum`, `PromisedResult`, …). Vendor public signatures exchange only primitives, domain-declared types, and plgg types; vendor failures fold into value-level domain errors (`Result`), never thrown across the seam; `index.ts` re-exports domain only. Each package's domain is consumed by at least one program checkpoint outside it (a `bin` CLI, an HTTP adapter, or a downstream app: `example`, `plggpress`, `plgg-cms`, `guide`).

**Rationale**: 消極的ベンダー依存 (Passive Vendor Dependence) — keeping third-party types out of domain signatures means any vendor is swappable without touching domain code, and the domain's unit tests stay green with fakes. This is the code-structure (modularity) half of the vendor-neutrality pillar; plgg itself is the in-house foundation the policy names.

**Scope (v1, decided at drive time)**: The gate governs **production** code. Test code — `*.spec.ts` and shared `testkit/` infrastructure — is excluded, because the "test against the real engine" practice legitimately imports real vendors in tests (a temp-dir `node:fs`, a real `node:sqlite`): that is the anti-corruption layer's tests connecting to the vendor, not domain purity. The reference package `plgg-db-migration` — which passes unexempted — has exactly this shape (domain specs create temp dirs, `testkit/sqliteDb.ts` opens `node:sqlite`). Web-platform globals (`fetch`/`Request`/`Response`/DOM) are ambient, not imported, so import analysis cannot catch them; v1 enforces import-**location** only. Signature-level checking (no third-party type in a vendor public param/return) is a future upgrade — and the no-`as`/`any`/`ts-ignore` rule already surfaces a leaked vendor type in a production signature through `tsc`, since the domain cannot cast it away.

**Criterion**: Verified by `scripts/gate-vendor-boundary.sh` (registered in `scripts/check-all.sh`, which the run-tests CI workflow invokes — one source of truth). It runs `scripts/vendor-boundary-analyzer.mjs`, which uses the already-present `typescript` package (`ts.preProcessFile`, resolved from plgg-bundle — **zero new dependencies**) to classify every import specifier. A third-party import in production code outside `vendors/`/`entrypoints/` is a violation; a package with violations must be listed in `scripts/vendor-boundary-exemptions.txt`; an **exempted-but-clean** package is a stale exemption (also a failure). The gate carries a `--self-test` proving it red on a seeded violation + a stale exemption and green on a clean tree. `plgg` and `plgg-db-migration` pass unexempted.

**Audit** (2026-07-17: the vendor gate reports 34 packages — 29 conformant, 5 exempted. The table below was last enumerated 2026-07-09 over 23 package directories and is extended per new package; guide has no `src/` / plgg-ui retained as the shared UI engine / plgg-cms split from plggpress and now owns the former content and MCP source trees):

| Package | Layout | Boundary status |
| --- | --- | --- |
| `plgg` | flat foundation | conformant — zero third-party imports (the domain vocabulary itself) |
| `plgg-db-migration` | domain/vendors/entrypoints | **conformant (reference)** — `node:fs` in `vendors/fs.ts`, `process`/exit in `entrypoints/cli.ts` |
| `plgg-cli` | legacy Feature/ | conformant — no third-party imports |
| `plgg-fetch` | domain/vendors | **conformant (migrated pilot, ticket 20260704185203)** — `Http/{model,usecase}` → `domain/{model,usecase}`, `seam.ts` → `vendors/fetch.ts` (the sole `fetch` toucher; the domain's `request` delegates to `sendRequest`) |
| `plgg-foundry` | legacy Feature/ | conformant — no third-party imports |
| `plgg-highlight` | legacy Feature/ | conformant — no third-party imports (dropped the tsc peerDep) |
| `plgg-http` | legacy Feature/ | conformant — no third-party imports |
| `plgg-kit` | legacy Feature/ | conformant — production clean (the `LLMs/vendor/` seam names drift is cosmetic; migrate to plural `vendors/` later) |
| `plgg-md` | legacy Feature/ | conformant — no third-party imports |
| `plgg-parser` | legacy Feature/ | conformant — no third-party imports |
| `plgg-router` | legacy Feature/ | conformant — no third-party imports |
| `plgg-sql` | legacy Feature/ | conformant — the `Db` seam is driver-agnostic; `node:sqlite` lives only in `example.ts`/specs |
| `plgg-domain` | legacy Feature/ | conformant — production clean; `node:sqlite` lives only in `src/testkit/` for real-engine tests |
| `plgg-view` | legacy Feature/ | conformant — no third-party imports |
| `plgg-auth` | legacy Feature/ | conformant — production clean (`node:crypto`/`node:sqlite` only in specs) |
| `plgg-ui` | legacy Feature/ | conformant — no third-party imports (the retained UI engine from the plggmatic extraction, trip plggmatic-extraction-cut; depends on `plgg` + `plgg-view` only, imports neither `plggpress` nor the extracted design-system repo — dependency direction one-way; consumed by `plggpress` theme, `plgg-cms` admin surfaces, and the standalone `../plggmatic` repo through the published package boundary) |
| `plgg-bundle` | domain/vendors/entrypoints | conformant — node/platform imports are confined to `vendors/` and `entrypoints/`; domain code is clean |
| `plgg-token-metering` | domain/{model,usecase} | **conformant (no `vendors/` needed)** — the package does no I/O, so it has no third-party import to confine: the published tokenizer vocabularies are caller-supplied DATA parsed by pure functions, not a file it reads or a CDN it fetches (see its `DEPENDENCY-LOG.md`). Its only runtime dep is `plgg`; `TextEncoder`/`atob` are ambient platform globals, not imports. Deliberately carries no tokenizer library — that independence is the package's reason to exist, and this gate is what makes the claim checkable |
| `plgg-server` | legacy Feature/ | **EXEMPT** — `node:http` + `node:fs/promises` in the server + SSG writer, outside a `vendors/` boundary |
| `plgg-test` | legacy | **EXEMPT** — the test runner imports the tsc API (`typescript`) + `node:fs/path/url`; tooling package |
| `plggpress` | legacy Feature/ | **EXEMPT** — the framework writes files (`node:fs/promises`) + serves (`node:http`) outside a `vendors/` boundary |
| `plgg-cms` | legacy Feature/ | **EXEMPT** — the dynamic content surface split from plggpress (2026-07-09); now owns the former content query/index source and MCP protocol/tooling source internally; serves (`node:http`) + persists (`node:fs`, plgg-sql) outside a `vendors/` boundary; depends on `plggpress` one-way (never the reverse) |
| `example` | leaf app | **EXEMPT** — a runnable demo wiring `node:` (child_process/crypto/fs/http/path) directly |
| `guide` | content app (no `src/`) | program checkpoint — a plggpress consumer; no `src/` to gate |

**Migration recipe** (from the plgg-fetch pilot, ticket 20260704185203 — the template for the remaining legacy-layout packages, filed as per-package follow-ups):

1. `git mv` the trees, preserving history: `src/<Feature>/model` → `src/domain/model`, `src/<Feature>/usecase` → `src/domain/usecase`, and the vendor seam file (`seam.ts` / the sole third-party toucher) → `src/vendors/<vendor>.ts` (canonical plural). Remove the now-empty `<Feature>/` dir.
2. Rewire the self-alias import specifiers (`<pkg>/<Feature>/…` → `<pkg>/domain/…` and `<pkg>/vendors/…`).
3. **Pull the vendor CALL into `vendors/`**: if a domain use case invoked the platform directly (plgg-fetch's `request` called `fetch(...)`), move that call into a vendor function with a domain-only signature (`sendRequest(HttpRequest) → PromisedResult<HttpResponse, ClientError>`); the domain calls it and never references a Web/vendor type. Give the vendor module the doc-comment declaring it "the only place this package touches `<API>`" (per `plgg-db-migration/src/vendors/fs.ts`).
4. `index.ts` re-exports **domain only** — never `vendors/`. Vendor functions leave the public surface (verify no downstream consumer imported them); the vendor's own spec imports them from the vendor module path.
5. Keep the injectable-seam testing pattern: domain specs run against a faked vendor (or a stubbed platform global); only the vendor's spec touches the real API.
6. Remove the package from `scripts/vendor-boundary-exemptions.txt` if it was listed, flip its audit row to "conforms", and run `scripts/gate-vendor-boundary.sh` + a fresh `scripts/check-all.sh`.

**Review trigger**: Revisit when a new package is added (audit it — conform or exempt with a reason); when an exempted package migrates (remove its line, the stale-exemption check enforces this); when the durable-core/sacrificial-shell spine (ticket 20260704143031) lands its orthogonal boundary (keep the seam/boundary/checkpoint vocabulary consistent between the two constraint texts); or when v2 adds signature-level or Web-global checking.

# Design v1

- **Author**: Constructor
- **Status**: draft
- **Reviewed-by**: (pending)

## Content

### 0. Problem statement

Replace every remaining vitest-authored test in the repository with
`plgg-test`, removing vitest entirely. The `plgg` package is already
migrated and is the house reference idiom. The user instruction permits
refining `plgg-test` only "if you cannot" migrate faithfully — so the
default is to migrate onto the existing API, and refinement is reserved
for genuine, named gaps.

This design is grounded in the real tree (verified, not assumed). Two
facts from the lead's survey were corrected against the codebase:

1. There are **9 vitest packages, 58 spec files** — confirmed. But the
   coverage situation is NOT uniformly ungated: **6 of the 9 packages
   carry real vitest thresholds** (fetch 91, http 90, router 91, server
   91, sql 91, view 91) and only **3 are ungated** (example, foundry,
   kit, which use `coverage: { all: true }` with no thresholds).
   Preserving coverage parity therefore requires per-package
   `plgg-test.config.json` files for the 6 gated packages — this is a
   real obligation, not a no-op.
2. The already-migrated `plgg` package is **not fully cleaned**: its
   `package.json` still lists `vitest` + `@vitest/coverage-v8` in
   devDependencies, and its `vite.config.ts` still carries
   `/// <reference types="vitest" />` and a dead `test: { coverage }`
   block. The 9 packages were migrated by copying plgg's incomplete
   pattern. So the cleanup scope includes `plgg` itself, not only the
   9 migrating packages.

### 1. Scope and inventory

#### 1a. The 9 vitest packages and their spec-file counts (58 total)

| Package        | spec files | current vitest threshold |
| -------------- | ---------- | ------------------------ |
| `plgg-server`  | 14         | 91 (gated)               |
| `plgg-view`    | 11         | 91 (gated)               |
| `plgg-router`  | 8          | 91 (gated)               |
| `plgg-foundry` | 6          | none (ungated, all:true) |
| `plgg-http`    | 5          | 90 (gated)               |
| `plgg-kit`     | 5          | none (ungated, all:true) |
| `plgg-fetch`   | 4          | 91 (gated)               |
| `plgg-sql`     | 4          | 91 (gated)               |
| `example`      | 1          | none (ungated, all:true) |

The exact 58 files are enumerable with
`grep -rl 'from "vitest"' packages --include="*.spec.ts"`. They are the
authoritative migration worklist; each spec is a leaf edit.

#### 1b. The exact vitest API surface in use (small, fully closed)

Verified by grepping every `import … from "vitest"` and every assertion
call. The *entire* imported surface is four names:

- `test` (55 files), `expect` (53 files), `assert` (10 files),
  `afterEach` (1 file).

`describe`/`beforeEach`/`suite` are **not** imported from vitest
anywhere in the 9 packages. The matcher/assertion calls used:

| vitest call                                | count | plgg-test target                                    |
| ------------------------------------------ | ----- | --------------------------------------------------- |
| `expect(x).toBe(y)`                         | 239   | `check(x, toBe(y))`                                 |
| `expect(x).toEqual(y)`                      | 81    | `check(x, toEqual(y))`                              |
| `expect(x).toContain(y)`                   | 58    | `check(x, toContain(y))`                            |
| `assert(...)` (narrowing)                  | 27    | `okThen`/`errThen`/`someThen` or `shouldBeOk` etc.  |
| `await expect(p).resolves.toBe(y)`         | 24    | `check(await p, toBe(y))`                           |
| `expect(x).toHaveLength(n)`                | 16    | `check(x, toHaveLength(n))`                         |
| `expect(x).not.toContain(y)`               | 11    | `check(x, not(toContain(y)))`                       |
| `expect(x).not.toBe(y)`                    | 5     | `check(x, not(toBe(y)))`                            |
| `expect(x).toBeUndefined()`                | 2     | `check(x, toBeUndefined())`                         |
| `expect(x).toBeInstanceOf(C)`              | 2     | `check(x, toBeInstanceOf(C))`                       |
| `expect(x).toBeGreaterThanOrEqual(n)`      | **1** | **GAP** — see refinement R1                         |
| `expect(spy).not.toHaveBeenCalled()`       | 1     | `check(spy.mock.calls.length, toBe(0))`             |

`.rejects` is used 0 times. The async pattern is uniformly
`.resolves.toBe`/`.toEqual`, which collapses to
`check(await p, …)`.

#### 1c. package.json scripts to swap (per package, ×9 + plgg cleanup)

Current vitest scripts (identical shape across all 9):

```json
"test":          "tsc --noEmit && vitest --run",
"test:watch":    "vitest",
"coverage":      "vitest --run --coverage",
"coverage:watch":"vitest --coverage",
```

Target (the plgg reference idiom, verbatim):

```json
"test":          "tsc --noEmit && plgg-test src",
"test:watch":    "plgg-test src --watch",
"coverage":      "tsc --noEmit && plgg-test src --coverage",
"coverage:watch":"plgg-test src --coverage --watch",
```

(`example` also keeps its non-test scripts `serve`/`serve:ssr`
untouched.)

#### 1d. devDependency swaps (per package, ×9 + plgg)

- Remove: `"vitest": "^4.1.5"`, `"@vitest/coverage-v8": "^4.1.5"`.
- Add: `"plgg-test": "file:../plgg-test"` (if not already present).
- The same removal applies to the **already-migrated `plgg`** package,
  whose devDeps still carry both vitest entries as dead leftovers.

#### 1e. vite.config.ts cleanup (per package, ×9 + plgg)

Each `vite.config.ts` carries two dead-after-migration artifacts:

- the top line `/// <reference types="vitest" />`, and
- a `test: { coverage: { … thresholds … } }` block.

Both are removed. The `build`/`plugins`/`resolve.alias` blocks stay.
`plgg`'s own vite.config.ts gets the same cleanup (its block is still
present).

#### 1f. Shell scripts — **no change required** (verified)

`scripts/test-<pkg>.sh`, `scripts/test-watch-<pkg>.sh`, and
`scripts/coverage-*.sh` all indirect through `npm run test` /
`npm run test:watch` inside the package. Because the runner swap happens
*inside* each package's `package.json` script, the shell wrappers are
runner-agnostic and need no edit. `scripts/check-all.sh` likewise just
calls the per-package `test-*.sh` scripts in dependency order and is
untouched. This is confirmed by reading `test-plgg-view.sh` (calls
`npm run test`) and `check-all.sh`.

#### 1g. Root vitest dependency / config — **none exists** (verified)

There is no root `package.json`, no root `vitest.config.*`, and no
root-level vitest devDependency. vitest lives only per-package. So the
"root cleanup" reduces to: a repo-wide grep gate (Section 4) plus the
per-package devDep/config removals above. The lead's "root vitest
dependency/config to remove" item does not correspond to a real file.

#### 1h. plgg-test source files that may need refinement

Only one source file is implicated by a real gap:
`packages/plgg-test/src/Matchers/matchers.ts` (add `toBeGreaterThanOrEqual`,
refinement R1). The public façade `packages/plgg-test/src/index.ts`
re-exports it. No other plgg-test source change is required — alias
resolution, hooks, spies, coverage gating, and watch already cover the
corpus (Section 2's refinement analysis).

### 2. Implementation approach (the concrete migration recipe)

Match the `plgg` package's plgg-test idiom **exactly** — verified
reference specs: `packages/plgg/src/Atomics/CamelCase.spec.ts`
(narrowing via `okThen`/`shouldBeErr`), `…/Functionals/postJson.spec.ts`
(`vi` spy + `afterEach` + `mock.calls.length`),
`…/Functionals/tap.spec.ts` (`mock.calls.some` + `deepEqual`).

**Per-spec rewrite, mechanical:**

1. **Import rewrite.** Replace `import { … } from "vitest";` with a
   single `import { … } from "plgg-test";` line whose named set is the
   union of plgg-test functions the rewritten body uses (`test`,
   `check`, plus the matchers/combinators/unwrap names actually
   referenced). `expect` and `assert` are dropped from the import (they
   no longer exist). Application imports (`plgg`, `plgg-<pkg>/index`)
   are unchanged. Prettier (printWidth 50) will reflow the named import
   list — that reflow is expected and acceptable (Section 6 risk).

2. **Assertion rewrite (data-last):**
   - `expect(x).toBe(y)` → `check(x, toBe(y))`
   - `expect(x).toEqual(y)` → `check(x, toEqual(y))`
   - `expect(x).toContain(y)` → `check(x, toContain(y))`
   - `expect(x).toHaveLength(n)` → `check(x, toHaveLength(n))`
   - `expect(x).toBeUndefined()` → `check(x, toBeUndefined())`
   - `expect(x).toBeInstanceOf(C)` → `check(x, toBeInstanceOf(C))`
   - `.not.` → wrap the inner matcher in `not(...)`:
     `expect(x).not.toBe(y)` → `check(x, not(toBe(y)))`.
   - `await expect(p).resolves.toBe(y)` → `check(await p, toBe(y))`
     (await the promise once, then assert the resolved value; identical
     semantics to vitest's `.resolves`).
   - `expect(spy).not.toHaveBeenCalled()` →
     `check(spy.mock.calls.length, toBe(0))` (the `vi` spy records
     `mock.calls`; this is the migrated-plgg idiom, no new matcher).

3. **Narrowing rewrite (`assert(...)`).** The 27 `assert(...)` sites
   replace vitest's throw-narrowing. Map by what the next lines do:
   - `assert(isOk(r)); <checks on r.content>` →
     `check(r, okThen((v) => <check on v>))`, or for multiple checks
     `check(r, okThen((v) => all([...])))`. Symmetric `errThen` /
     `someThen` / `shouldBeNone` for the Err/Option channels.
   - Bare existence narrowing `assert(isSome(o))` with later use →
     `someThen`. `errThen` defaults its error channel to `InvalidError`
     (the corpus's dominant error), so a bare `errThen((e) => …)` needs
     no annotation; a matcher-first `errThen(toBe(s))` infers a
     non-`InvalidError` channel. This is exactly how plgg's CamelCase
     spec reads.
   - The single test body returns its assertion (or `all([...])` for
     several), per the runner contract — no fluent chain, no throw.

4. **Hooks (`afterEach`).** `afterEach` re-exports from
   `plgg-test`'s `Core/Registry`. The one fetch spec importing it
   (`plgg-fetch/.../request.spec.ts`) and the `vi`-stubbing specs in
   `plgg-server`/`plgg-view`/`plgg-fetch` move `afterEach` /
   `beforeEach` into the plgg-test import. The teardown body
   (`vi.unstubAllGlobals()` / restoring `globalThis.fetch`) is unchanged
   — `vi.stubGlobal`/`unstubAllGlobals` already exist in plgg-test.

5. **package.json** swap scripts (1c) + devDeps (1d), per package.

6. **vite.config.ts** cleanup (1e), per package.

7. **plgg-test.config.json** for the 6 gated packages (Section 3, R2):
   write `{ "coverage": { "threshold": <n> } }` with the package's
   original vitest threshold (fetch/router/server/sql/view = 91,
   http = 90). The 3 ungated packages (example, foundry, kit) get **no**
   config file — `readConfig` treats a missing file as ungated
   (coverage reported, never fails), which exactly reproduces their
   `all: true`/no-threshold vitest behavior.

**The no-escape-hatch rule.** No `as`, `any`, or `ts-ignore` may be
introduced. NOTE: the existing migrated `plgg` specs contain
`as unknown as typeof fetch`, `as unknown as Response`, and `as any`
(in `postJson.spec.ts`, `proc.spec.ts`). These are pre-existing
violations in the reference package; the migration must NOT copy them.
Where a vitest spec being migrated relies on a loose `globalThis.fetch =
mockFetch as …` cast, prefer `vi.stubGlobal("fetch", vi.fn(impl))` (the
typed seam already used in `plgg-fetch/request.spec.ts`), which needs no
cast. If a faithful migration of a specific spec genuinely cannot avoid
a cast, that is a blocker to surface to the team — not a license to add
one. (Pre-existing casts already in `plgg` are out of this trip's scope
unless a ticket explicitly addresses them.)

### 3. plgg-test refinement plan

Refinements are proposed **only** where a real gap blocks a faithful
migration. The bar: prefer migrating onto existing API; add API only for
a genuine gap.

- **R1 — add `toBeGreaterThanOrEqual` matcher (REQUIRED).** One site
  (`plgg-foundry/.../runFoundry.spec.ts:35`,
  `expect(todos.size).toBeGreaterThanOrEqual(1)`) uses a matcher
  plgg-test does not export. `toBeGreaterThan` exists; `>=` does not.
  Add a sibling matcher in `Matchers/matchers.ts` (same `matcher(...)`
  helper, predicate `actual >= expected`, typed `A extends number |
  bigint`) and re-export from `index.ts`. This is the minimal faithful
  addition. (Rewriting the one call as
  `not(toBeGreaterThan(0))`-style tricks would be unfaithful and
  fragile; a direct matcher is correct.) **Alternative considered**:
  rewrite the single assertion to `toBeGreaterThan(0)` since `size >= 1`
  ⇔ `size > 0` for an integer count — viable and zero-API-cost, but
  semantically narrower and brittle if the value were ever non-integer.
  Recommend R1 (add the matcher); fall back to the `toBeGreaterThan(0)`
  rewrite only if the team wants zero plgg-test surface change.

- **R2 — per-package coverage config files (REQUIRED for parity, not a
  plgg-test code change).** `Coverage/config.ts` already supports
  per-package `plgg-test.config.json` with a `threshold`; a missing file
  = ungated. So preserving the 6 gated packages' thresholds is purely a
  matter of *writing those config files* (Section 2 step 7) — no
  plgg-test source change. Listed here because skipping it would
  silently drop coverage gates (a regression), which the config system
  was explicitly designed to avoid.

- **Gaps explicitly ruled NOT to need refinement (verified):**
  - *Narrowing parity* — covered by `okThen`/`errThen`/`someThen` +
    `shouldBeOk`/`shouldBeErr`/`shouldBeSome`/`shouldBeNone`. No
    `assert` export is needed; data-flow narrowing replaces
    throw-narrowing. (Adding an `assert` shim would re-introduce the
    throw idiom the design deliberately removed.)
  - *Spy "was/not called"* — covered by `spy.mock.calls.length`; no
    `toHaveBeenCalled` matcher needed.
  - *Alias resolution* — every one of the 9 packages uses the identical
    tsconfig `paths` convention `"<pkg>*": ["./src/*"]` (example uses
    none and relies on relative imports). `Resolve/aliases.mjs`'s
    `deriveAliases` already translates exactly this shape, and the bin
    self-resolves `plgg-test/*`. No alias-resolution refinement needed.
  - *Watch + coverage CLI* — `Cli/args.ts` already parses `--watch` and
    `--coverage`; the reference scripts use them. No CLI change.

### 4. Quality strategy

- **Per-package verification.** After migrating each package, run its
  `scripts/test-<pkg>.sh` (which runs `tsc --noEmit && plgg-test src`)
  and confirm green. Run `scripts/test-watch-<pkg>.sh` once to confirm
  watch parity. For the 6 gated packages, run `npm run coverage` (or the
  coverage script) and confirm the threshold gate fires at the original
  number.
- **Type checks.** `scripts/tsc-plgg.sh` and the per-package
  `scripts/tsc-<pkg>.sh` must pass with zero errors — and critically
  with **zero new `as`/`any`/`ts-ignore`** (grep gate below).
- **Whole-repo gate.** `scripts/check-all.sh` (build in dependency
  order, then every `test-*.sh`) must pass end-to-end as the final
  acceptance.
- **Grep gates (must all return empty):**
  - `grep -rn 'from "vitest"' packages --include="*.ts"` → 0
  - `grep -rln '"vitest"\|@vitest/coverage-v8' packages/*/package.json`
    → 0
  - `grep -rn 'reference types="vitest"\|^  test: {' packages/*/vite.config.ts`
    → 0 (no residual vitest config block)
  - `grep -rn ' as \| as any\|@ts-ignore\|: any' <changed spec files>`
    → no NEW occurrences relative to baseline.
- **Format.** Each rewritten/edited file is Prettier-formatted with the
  package's own `.prettierrc.json` (printWidth 50). Reformatting of
  import lists and `check(...)` calls is expected; diffs are reviewed to
  confirm only intended changes.

### 5. Delivery plan (ordered, independently-shippable units)

Dependency-aware sequence; each unit is a shippable ticket. Order
respects: refinements first (so migrations have the API), then
per-package migrations in dependency order (so `file:` builds resolve),
then cleanup + gate.

1. **U1 — plgg-test refinement (R1).** Add `toBeGreaterThanOrEqual` to
   `Matchers/matchers.ts` + `index.ts`, with its own spec. Ship and
   verify `scripts/test-plgg-test.sh` green. (R2 needs no code; the
   config files land with each package in U2.)
2. **U2 — per-package migrations**, one ticket per package, in
   dependency-friendly order (leaf/low-dep first):
   `example` → `plgg-http` → `plgg-view` → `plgg-router` →
   `plgg-foundry` → `plgg-kit` → `plgg-fetch` → `plgg-sql` →
   `plgg-server`. Each ticket: rewrite the package's specs (Section 2
   steps 1–4), swap scripts + devDeps (steps 5–6), remove the
   vite.config vitest block (1e), add `plgg-test.config.json` if gated
   (step 7), verify `scripts/test-<pkg>.sh` + coverage. `plgg-server`
   (14 files) and `plgg-view` (11 files) are the largest; they can be
   sub-split per source subtree (`Http`/`Routing`/`Ssg`/`View` etc.) if
   a single ticket is too large, but each must leave the package
   green.
3. **U3 — root cleanup + CI/scripts + final grep gate.** Clean the
   already-migrated **`plgg`** package's leftover vitest devDeps and
   vite.config block (1d/1e applied to plgg). Confirm no shell-script or
   CI change is needed (1f/1g). Run all grep gates (Section 4) and
   `scripts/check-all.sh` as the trip's final acceptance.

Each unit leaves the repo green and vitest-free *for that package*, so
units ship independently.

### 6. Risk assessment

- **Coverage regression (HIGH if R2 skipped).** 6 packages have real
  thresholds. If their `plgg-test.config.json` is omitted they silently
  become ungated — green but unguarded. Mitigation: R2 config files are
  a hard checklist item per gated package, verified by running coverage
  and observing the gate fire at the original number.
- **Threshold drift (MEDIUM).** plgg-test uses V8 block-branch counting,
  finer-grained than vitest's istanbul-normalized numbers (documented in
  plgg-test's own config comment: branches read ~86 vs the istanbul
  number). A package pinned at 91 under vitest may report lower branch
  coverage under plgg-test. Mitigation: if a migrated package's real
  number falls below its historical threshold, surface it as a
  ship-or-defer decision (lower the threshold with a documented comment,
  as plgg-test did for itself at 85) — do NOT silently exclude files to
  hit a number.
- **Async/`.resolves` semantic drift (LOW).** `.resolves.toBe(y)` →
  `check(await p, toBe(y))` is equivalent only when `p` resolves;
  vitest's `.resolves` also fails if `p` rejects. Since `.rejects` is
  used 0 times and these are Result-returning pipelines (rejection is
  not the tested path), the `await` form is faithful. Mitigation: review
  each of the 24 sites to confirm none relied on `.resolves` as a
  "did-not-reject" assertion; if any did, use an explicit try/await.
- **Alias-resolution failure (LOW).** All 9 packages share the same
  tsconfig `paths` shape already handled by `deriveAliases`; verified.
  Residual risk only if a package's tsconfig is non-standard — mitigated
  by the per-package `test-<pkg>.sh` run catching a resolution failure
  immediately.
- **Prettier printWidth:50 reformatting (LOW/noise).** Rewritten imports
  and `check(...)` calls reflow heavily at width 50, inflating diffs.
  Mitigation: format each file immediately after rewrite; review diffs
  for intent; never hand-pack onto fewer lines (CLAUDE.md rule).
- **No-escape-hatch violation via copied reference (MEDIUM).** The plgg
  reference specs contain `as`/`any` casts; copying their fetch-mock
  pattern verbatim would import a rule violation. Mitigation: use the
  `vi.stubGlobal` typed seam; the grep gate for new `as`/`any` blocks
  merge.

### 7. Policies

This build answers to the following engineering policies (one per line,
with why):

- `workaholic:implementation` / `policies/directory-structure.md` —
  MANDATORY. Spec files stay co-located beside their source
  (`*.spec.ts`); per-package config (`plgg-test.config.json`,
  `vite.config.ts`) stays at each package root. The migration must not
  relocate tests or introduce a centralized test directory.
- `workaholic:implementation` / `policies/coding-standards.md` —
  MANDATORY. Enforces the project's hard rule (no `as`/`any`/
  `ts-ignore`), Prettier printWidth:50 per-package, and the house
  expression style — the rewrite must conform, and must not propagate
  the reference package's pre-existing casts.
- `workaholic:implementation` / `policies/test.md` — the testing-
  strategy policy. This trip *is* a test-tooling change; the migration
  must preserve test coverage and the "types-can't-express" assertions
  (Result/Option narrowing) one-for-one, and keep coverage gates
  intact (R2).
- `workaholic:implementation` / `policies/type-driven-design.md` — the
  narrowing rewrite replaces throw-narrowing (`assert`) with data-flow
  narrowing (`okThen`/`shouldBeOk`), keeping Result/Option modeled as
  values; type-driven design is the reason the new idiom is preferred
  over an `assert` shim.
- `workaholic:implementation` / `policies/functional-programming.md` —
  the data-last `check(actual, matcher)` / `pipe`-style assertion form
  is the functional analogue of the fluent `expect` chain; the rewrite
  must follow it (Option not null, Result not throw, expression-style).
- `workaholic:implementation` / `policies/command-scripts.md` — the
  per-package `npm` scripts and `scripts/*.sh` wrappers are the command
  surface; swapping `vitest` → `plgg-test src` must keep the
  `test`/`test:watch`/`coverage` command contract stable so
  `check-all.sh` and CI keep working unchanged.
- `workaholic:operation` / `policies/ci-cd.md` — CI runs the test
  scripts in the deploy/dependency loop; the swap must keep CI green and
  the build-in-dependency-order invariant (`check-all.sh` builds dists
  before testing `file:`-linked packages) intact, with no CI YAML change
  required (verified: scripts are runner-agnostic).
- `workaholic:implementation` / `policies/vendor-neutrality.md` —
  removing the vitest dependency in favor of the in-repo `plgg-test`
  reduces external-vendor surface, consistent with vendor-neutrality;
  the refinement (R1) keeps the in-house tool capable rather than
  reaching back to vitest.

## Review Notes

(pending — Architect and Planner review)

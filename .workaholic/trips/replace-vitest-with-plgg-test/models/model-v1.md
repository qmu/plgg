# Model v1

- **Author**: Architect
- **Status**: draft
- **Phase/Step**: planning / artifact-generation
- **Date**: 2026-06-24

## Content

This model maps the structural coherence of replacing vitest with
`plgg-test` across the monorepo. Every claim below was verified by
reading the real files; the lead's survey is corrected where the
codebase disagrees.

### 1. System coherence mapping — the test layer

The monorepo has **12 packages** under `packages/`: `plgg`,
`plgg-test`, plus 10 leaf packages. Of those leaves, **9 still run on
vitest** (`example`, `plgg-fetch`, `plgg-foundry`, `plgg-http`,
`plgg-kit`, `plgg-router`, `plgg-server`, `plgg-sql`, `plgg-view`) and
one — `guide` — has **no `src/` test layer at all** (it is the docs
site; excluded from `check-all.sh`). The 9 vitest packages carry
**58 `*.spec.ts` files** importing `vitest`. `plgg` is already migrated
(74 plgg-test-style specs); `plgg-test` is self-hosted (15 specs run by
its own runner).

Verified spec-file counts per package:

| Package | spec files | runner |
| --- | --- | --- |
| example | 1 | vitest |
| plgg-fetch | 4 | vitest |
| plgg-foundry | 6 | vitest |
| plgg-http | 5 | vitest |
| plgg-kit | 5 | vitest |
| plgg-router | 8 | vitest |
| plgg-server | 14 | vitest |
| plgg-sql | 4 | vitest |
| plgg-view | 11 | vitest |
| **vitest subtotal** | **58** | — |
| plgg | 74 | plgg-test (done) |
| plgg-test | 15 | plgg-test (self) |

**Two test-invocation idioms in play.** The boundary between them is
each package's `package.json` `test` script:

- *vitest idiom* (all 9): `"test": "tsc --noEmit && vitest --run"`,
  `"test:watch": "vitest"`. Each carries `vitest: ^4.1.5` (and, where
  coverage is wired, `@vitest/coverage-v8`) as a devDependency, plus a
  `vite.config.ts` that does double duty: the `build` block produces
  the dist, and a `test.coverage` block holds the v8 provider +
  `thresholds: { statements/branches/functions/lines: 91 }` and a
  `resolve.alias` mapping the package name to `./src`.
- *plgg-test idiom* (`plgg`, `plgg-test`):
  `"test": "tsc --noEmit && plgg-test src"` (the `plgg` package; the
  `plgg-test` package itself spells it `node ./bin/plgg-test.mjs src`
  because it cannot depend on its own published `bin`),
  `"test:watch": "… --watch"`, `"coverage": "… --coverage"`.
  `plgg` declares `"plgg-test": "file:../plgg-test"` as a devDependency.

**Orchestration.** `scripts/check-all.sh` builds all dists in
dependency order (`scripts/build.sh`) then runs **eleven** per-package
`scripts/test-<pkg>.sh` scripts in a fixed order (plgg, plgg-test,
plgg-kit, plgg-foundry, plgg-http, plgg-view, plgg-router, plgg-server,
plgg-fetch, plgg-sql, example). Each `test-<pkg>.sh` is a thin wrapper:
`cd packages/<pkg> && npm run test`. So the orchestration layer is
**runner-agnostic** — it only calls `npm run test`; swapping the runner
is entirely a `package.json`-script concern, and the `test-<pkg>.sh`
files need **no edits** (this is a meaningful de-risk vs. the lead's
"(c) scripts/test-*.sh updates" expectation; see Component taxonomy).
There is a parallel set of `tsc-<pkg>.sh`, `test-watch-<pkg>.sh`, and
`tsc-watch-<pkg>.sh` wrappers, also runner-agnostic.

**Important nuance — `plgg`'s `vite.config.ts` still exists.** The
already-migrated `plgg` package kept its `vite.config.ts` *with the
`test.coverage` block intact*, even though vitest no longer runs it,
because the same file still drives `vite build`. But `plgg`'s
`package.json` **still lists `vitest` and `@vitest/coverage-v8` in
devDependencies**. This is the precedent the migration should follow OR
deliberately improve on: the migrated reference left dead vitest
devDeps behind. (Direction/Design should decide whether v1 also strips
them from `plgg` for full "no more vitest", or matches the existing
half-migrated state. Flagging, not deciding.)

### 2. Domain model — vitest → plgg-test translation table

`plgg-test`'s public façade (`src/index.ts`) is **data-last and
expression-style**: a test body RETURNS a branded `Assertion` (an
`Ok<Pass<T>>`/`Err<Fail>` plgg `Result`), and the runner reads the
return value. There is no fluent `expect().toBe()` chain and no
throw-on-mismatch. The translation is therefore a *paradigm* shift, not
a rename.

| vitest | plgg-test | parity |
| --- | --- | --- |
| `import { test, expect } from "vitest"` | `import { test, check, toBe, … } from "plgg-test"` | exact |
| `expect(x).toBe(y)` | `check(x, toBe(y))` | exact (`Object.is`) |
| `expect(x).toEqual(y)` | `check(x, toEqual(y))` | exact (`deepEqual`) |
| `expect(s).toContain(sub)` / `expect(arr).toContain(v)` | `check(s, toContain(sub))` | exact |
| `expect(x).toHaveLength(n)` | `check(x, toHaveLength(n))` | exact |
| `expect(n).toBeGreaterThan(m)` | `check(n, toBeGreaterThan(m))` | exact |
| `expect(x).toBeInstanceOf(C)` | `check(x, toBeInstanceOf(C))` | exact |
| `expect(x).toBeUndefined()` / `toBeNull()` | `check(x, toBeUndefined())` / `toBeNull()` | exact |
| `expect(x).not.toBe(y)` | `check(x, not(toBe(y)))` | exact (`not` combinator) |
| `await expect(p).resolves.toBe(y)` | `check(await p, toBe(y))` | exact, **but** see §3 |
| `await expect(p).rejects.toThrow()` | `await p` in try/catch → `check(caught, …)` | **gap → pattern** (no `.rejects`/`.toThrow`) |
| `expect(() => f()).toThrow()` | try/catch → `check(threw, toBe(true))` | **gap → pattern** (no `toThrow` matcher) |
| `assert(isOk(r)); r.content` (narrowing) | keep `isOk` guard + `if`, or `check(r, okThen(toBe(y)))` / `shouldBeOk` | exact (data-flow narrowing) |
| `expect(spy).not.toHaveBeenCalled()` | `check(spy.mock.calls.length === 0, toBe(true))` | **gap → pattern** (no spy matchers) |
| `vi.fn`, `vi.stubGlobal`, `vi.unstubAllGlobals`, `vi.stubEnv`, `vi.unstubAllEnvs`, `vi.spyOn` | identical names on `plgg-test`'s `vi` | exact (verified in `Mock/vi.ts`) |
| `vi.mock("plgg", …)` (ESM module mock) | **NOT provided** (Plan Amendment 2) | **gap → refactor to DI** |
| `test.skip(name, fn)` | `test.skip(name, fn)` | exact (Registry supports it) |
| `test.skip(name, fn, 20000)` (timeout 3rd arg) | `test.skip(name, fn)` — **drop the timeout arg** | **signature gap** |
| `afterEach(fn)` / `beforeEach(fn)` | same | exact |
| `describe` / `it` / `suite` | same (`it`=`test`, `describe`=`suite`) | exact |

Measured vitest-feature frequency across the 58 files (substring
counts, wrap-tolerant): `toBe` 543, `toEqual` 170, `toContain` 79,
`toHaveLength` 20, `.not` 22, `.resolves` 29, `.rejects` 11, `toThrow`
3, `toBeUndefined` 4, `toBeInstanceOf` 2, `toBeGreaterThan`/`toBeNull`
1 each, `vi.*` 8 call sites. So **~99% of all assertions are the six
exactly-parity matchers** + `.not`; the long tail (`.rejects`,
`toThrow`, `vi.mock`, timeout-arg) is where the work and the risk
concentrate.

### 3. Translation fidelity analysis — where semantics can silently drift

1. **`.resolves` / async assertions (29 sites).** vitest's
   `await expect(p).resolves.toBe(y)` *fails the test if `p` rejects*.
   The naïve rewrite `check(await p, toBe(y))` instead lets a rejection
   **throw out of the test body**. plgg-test's runner must catch a
   thrown body and fail it (rather than crash the file) for behavioral
   parity — this needs confirmation against `Core/Runner.ts` before the
   rewrite is trusted. Where the rewrite is `check(await p, toBe(y))`
   the *happy path* is exact; the *rejection* path's reporting fidelity
   depends on the runner's throw-handling. **This is the highest
   semantic-fidelity risk in the bulk rewrite.**

2. **`.rejects` (11 sites) and `toThrow` (3 sites).** No `rejects`
   combinator and no `toThrow` matcher exist
   (`grep` of `Matchers/` confirms). Each site must become an explicit
   try/catch that captures whether/what threw, then a `check` over the
   captured value. This is a *manual, per-site* rewrite where the
   author must preserve the *exact* thing asserted (did it throw at
   all? with what message? — `seam.spec.ts:69` asserts only *that* it
   throws; others assert the rejection's tag). A mechanical pass will
   get these wrong; they need human-grade attention. **Alternatively, a
   `toThrow` matcher + an async `rejects` helper is a candidate
   plgg-test refinement** that would keep these 14 sites near-mechanical
   and lower the fidelity risk — Design should weigh "refine the runner
   vs. hand-rewrite 14 sites."

3. **Negation (`.not`, 22 sites).** `not(toBe(y))` is exact for value
   matchers. The one subtlety: `expect(spy).not.toHaveBeenCalled()`
   (request.spec.ts:116) is **not** a value matcher — there is no
   `toHaveBeenCalled` matcher at all. The established migrated pattern
   (verified in `plgg/.../debug.spec.ts` and `plgg-test/Mock/vi.spec.ts`)
   is `check(spy.mock.calls.length === 0, toBe(true))` and
   `check(spy.mock.calls.some((c) => deepEqual(c, [...])), toBe(true))`.
   So negated/positive call assertions translate to a boolean `check`,
   not a matcher — fidelity is fine but the rewrite shape differs from
   every other matcher.

4. **Deep-equality edges (`toEqual`, 170 sites).** plgg-test's
   `toEqual` uses its own `deepEqual` (`Expect/equals.ts`), not
   vitest's. For plain data and arrays the two agree. **Risk surfaces**
   on: class instances, nested `Option`/`Result` (plgg `Box`-tagged
   values), `Map`/`Set`, and `undefined`-vs-absent property distinctions
   (vitest's `toEqual` ignores `undefined` props; vitest's
   `toStrictEqual` does not). The corpus uses `toEqual` heavily on plgg
   domain values (Results, Options, Datum). Before trusting the bulk
   rewrite, `Expect/equals.spec.ts` must be read to confirm `deepEqual`
   matches vitest `toEqual` on these exact shapes; any divergence is a
   **silent false-green/false-red**. No `toStrictEqual`,
   `toMatchObject`, `toHaveProperty`, `toBeCloseTo`, `toMatch`,
   `toBeTruthy/Falsy` appear in the corpus (all measured at 0), so the
   equality surface is just `toBe`/`toEqual`/`toContain` — bounded, but
   `toEqual` semantics must be pinned.

5. **`vi.mock` (1 site, generateObject.spec.ts).** This mocks the
   `plgg` module's `postJson` seam via vitest's hoisted ESM module
   registry — a capability plgg-test deliberately does **not** provide.
   Fidelity here is not a translation but a **test redesign**: the spec
   must switch to dependency injection (pass the seam in) so the same
   three vendor-envelope decodes run offline. This is the single
   highest-effort file and the only one whose *test design* changes.

### 4. Boundary integrity assessment — module resolution (highest structural risk)

This is the load-bearing structural question, and it resolves
**favorably** after reading the resolver.

The plgg-test runner replaces vitest's `resolve.alias` with a native
Node loader hook (`src/Resolve/hook.ts`) fed by `PLGG_TEST_ALIASES`,
which `bin/plgg-test.mjs` derives **from the target package's own
`tsconfig.json` `paths`** via `src/Resolve/aliases.mjs`. The mechanism:

- The launcher reads `<cwd>/tsconfig.json`, takes
  `compilerOptions.paths`, strips the trailing `*` from each key to a
  bare prefix, and resolves the `./src/*` target to an absolute src
  root — emitting `prefix=/abs/src` lines.
- The hook rewrites a **self-package** specifier (`<prefix>` or
  `<prefix>/Sub/Path`) to the on-disk `.ts` (trying `<path>.ts` then
  `<path>/index.ts`), and **deliberately does not** rewrite
  cross-package bare specifiers (`"plgg"`, `"plgg-http"`) — those fall
  through to normal `node_modules`/`file:` resolution against built
  dist.

**The critical compatibility check — alias key shape.** The two
migrated packages bracket both conventions: `plgg/tsconfig.json` uses
`"plgg/*": ["./src/*"]` (slash) while `plgg-kit/tsconfig.json` uses
`"plgg-kit*": ["./src/*"]` (**no slash**). `stripStar()` in
`aliases.mjs` handles both: it slices the trailing `*` then strips a
trailing `/` — so `"plgg/*"` → `plgg` and `"plgg-kit*"` → `plgg-kit`.
The hook then matches `specifier === prefix || specifier.startsWith(prefix + "/")`.
**Verified all 9 vitest packages' tsconfigs follow the same
`"<name>*": ["./src/*"]` or `"<name>/*": ["./src/*"]` convention** (and
`plgg/*` is the exact shape already proven working). Therefore each
package's self-alias **will resolve correctly under the plgg-test
runner** with no per-package resolver work. The structural risk the
lead flagged as highest is **largely retired** by the existing,
convention-following tsconfigs.

Two residual boundary checks remain:

- **`/index` import style.** Vitest specs import self-package symbols as
  `"plgg-fetch/index"`, `"plgg-http/index"` (explicit `/index`); the
  hook resolves `<srcRoot>/index` → `<srcRoot>/index.ts`, so these
  resolve. Bare `"plgg-fetch"` (no `/index`) also resolves via the
  `index.ts` fallback. Both shapes are covered.
- **Cross-package bare specifiers against built dist.** Specs import
  `"plgg"`, `"plgg-http"`, `"plgg-server"` etc. as bare cross-package
  deps; these fall through to `file:` resolution against each dep's
  **built `dist/`**. This is why `check-all.sh` runs `build.sh` first.
  The migration **must preserve that build-before-test ordering** — it
  already does, and it is runner-independent. No change needed, but it
  is a precondition that must not be broken.

### 5. Component taxonomy — classification of the work

- **(a) Mechanical per-file rewrites** — the bulk. ~54 of 58 files are
  pure `expect(x).matcher(y)` → `check(x, matcher(y))` + import-line
  swap, with `.not` → `not(...)`, `.resolves` → `await` + `check`, and
  `assert(isOk)`-narrowing kept as a guard or moved to
  `okThen`/`shouldBeOk`. Per-package these are independent and
  parallelizable. *Caveat:* "mechanical" still requires the §3-#4
  `toEqual` semantics to be pinned first.
- **(b) `package.json` swaps** — 9 packages: set `test`/`test:watch`/
  add `coverage`/`coverage:watch` to the plgg-test idiom; add
  `"plgg-test": "file:../plgg-test"` to devDependencies; **remove
  `vitest` and `@vitest/coverage-v8`**. (Decide whether to also strip
  the lingering `vitest` devDeps from the already-migrated `plgg`
  package for true "no more vitest".)
- **(c) `scripts/test-<pkg>.sh` updates** — **NONE.** These wrappers
  only call `npm run test`; they are runner-agnostic. (Corrects the
  lead's expectation that these need editing. The `test-watch-*.sh` and
  `tsc-*.sh` wrappers are likewise untouched.)
- **(d) plgg-test source refinements needed to close gaps** — three
  candidates, in priority order:
  1. **Hard requirement: the timeout-arg signature.** 4 plgg-kit
     `.spec.ts` files call `test.skip(name, async fn, 20000)` with a
     third timeout argument. plgg-test's `test`/`test.skip` signature is
     `(name, fn) => void` — a third arg is a **compile error** under
     `strict` + `tsc --noEmit` (which runs before every test). Either
     the rewrite **drops the timeout arg** (cleanest, since these are
     `.skip`ped live-integration tests where a timeout is moot) **or**
     plgg-test widens the signature to accept-and-ignore a trailing
     number. Recommend dropping the arg in the rewrite; no source change.
  2. **Optional but de-risking: a `toThrow` matcher + async `rejects`
     helper** to keep the 14 `.rejects`/`toThrow` sites near-mechanical
     instead of 14 hand-written try/catch blocks (§3-#2).
  3. **`vi.mock` is explicitly out of scope** (Plan Amendment 2); the
     one consumer is redesigned to DI instead (§3-#5).
- **(e) Root-level vitest config/dependency removal** — there is **no
  root `vitest.config`/`vitest.workspace` and no root `package.json`
  vitest devDep** (verified: root `package.json` has neither scripts nor
  vitest deps relevant here). Each `vite.config.ts` is **per-package and
  still required for `vite build`** — its `test.coverage` block becomes
  dead config but the file cannot be deleted. Cleanest end-state:
  delete the now-unused `test:` block (and the `/// <reference
  types="vitest" />` triple-slash) from each of the 9
  `vite.config.ts`, keeping only `build`/`resolve`/`plugins`. This is
  cosmetic-but-correct cleanup, not a functional requirement.

### Summary of structural verdict

The migration is **structurally sound and mostly mechanical**. The
resolver boundary — the a priori highest risk — is retired by the
existing convention-following tsconfigs and the already-proven `plgg`
precedent. The orchestration layer needs zero edits. The real,
concentrated risk is a small long tail: (1) pinning `toEqual`/`deepEqual`
parity on plgg domain values, (2) the 14 `.rejects`/`toThrow` sites
that must be hand-rewritten or backed by a new matcher, (3) the single
`vi.mock` DI redesign, and (4) the timeout-arg signature mismatch in 4
skipped specs. Effort is dominated by (a) the ~54 mechanical files; risk
is dominated by (d2)/(d3) and the §3 fidelity edges.

## Review Notes

- Open decisions surfaced for Direction/Design, deliberately not
  resolved here: (i) whether v1 also strips lingering `vitest` devDeps
  from the already-migrated `plgg` package; (ii) whether to add a
  `toThrow`/`rejects` refinement to plgg-test vs. hand-rewrite 14 sites;
  (iii) whether to delete dead `test:` blocks from the 9
  `vite.config.ts`.
- Pre-implementation verification still owed (cheap, high-value):
  read `Core/Runner.ts` to confirm a thrown test body is caught and
  reported as a failure (underpins the `.resolves` rewrite, §3-#1); read
  `Expect/equals.spec.ts` to confirm `deepEqual` matches vitest
  `toEqual` on class instances and nested Box-tagged Option/Result
  (§3-#4). Both should be Constructor's first acts.
- Counts in this model are substring/grep measurements over the 58
  files; exact per-matcher line attributions will be re-derived per file
  during the mechanical rewrite.

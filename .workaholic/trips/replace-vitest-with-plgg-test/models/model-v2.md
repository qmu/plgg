# Model v2

- **Author**: Architect
- **Status**: under-review → approved
- **Reviewed-by**: Planner, Constructor
- **Supersedes**: model-v1.md
- **Phase/Step**: planning / respond-to-feedback (round 1)
- **Date**: 2026-06-24

## What changed from v1 (reconciliation summary)

v1's feature counts came from substring grepping and carried false
positives. v2 reconciles every disputed number against the working tree
by **inspecting the matching lines**, not just counting tokens:

| Feature | v1 said | v2 (verified) | note |
| --- | --- | --- | --- |
| `.rejects` matcher | 11 | **0** | v1's 11 were the English word "rejects" in `test("…")` names/comments — withdrawn |
| `toThrow`/`.not.toThrow()` | 3 | **3** | real; the surviving gap |
| `vi.mock` | 1 | **1** | real; live offline path, needs DI |
| `test.skip(…, timeout)` 3rd arg | 4 (plgg-kit) | **10** (6 plgg-kit + 4 plgg-foundry) | corrected **up**; two packages |

Two further additions over v1: a **measurement-basis note** on coverage
(V8 vs. istanbul ruler), and the **two pre-implementation verifications**
now resolved/scheduled (one CONFIRMED, one OPEN-as-gate).

## Content

This model maps the structural coherence of replacing vitest with
`plgg-test` across the monorepo. Every claim was verified against the
real files. It is the reconciled successor to model-v1.

### 1. System coherence mapping — the test layer

12 packages under `packages/`: `plgg` (already on plgg-test, 74 specs),
`plgg-test` (self-hosted, 15 specs), `guide` (docs site, no `src/`
tests, excluded from `check-all.sh`), and **9 vitest packages**
totalling **58 `*.spec.ts` files**:

| Package | spec files |
| --- | --- |
| plgg-server | 14 |
| plgg-view | 11 |
| plgg-router | 8 |
| plgg-foundry | 6 |
| plgg-http | 5 |
| plgg-kit | 5 |
| plgg-fetch | 4 |
| plgg-sql | 4 |
| example | 1 |
| **total** | **58** |

**Two invocation idioms**, the boundary being each `package.json`
`test` script:

- *vitest* (all 9): `"test": "tsc --noEmit && vitest --run"`,
  `"test:watch": "vitest"`, plus `vitest`/`@vitest/coverage-v8` devDeps
  and a `vite.config.ts` whose `build` block makes the dist while a
  `test.coverage` block holds the v8 provider + thresholds and a
  `resolve.alias` mapping the package name to `./src`.
- *plgg-test* (`plgg`, `plgg-test`):
  `"test": "tsc --noEmit && plgg-test src"`, `… --watch`,
  `… --coverage`; `plgg` declares `"plgg-test": "file:../plgg-test"`.

**Orchestration is runner-agnostic.** `scripts/check-all.sh` builds all
dists in dependency order then runs the 11 per-package
`scripts/test-<pkg>.sh` wrappers, each of which is just
`cd packages/<pkg> && npm run test`. So the runner swap is entirely a
`package.json`-script concern; the `test-<pkg>.sh`, `test-watch-*.sh`,
and `tsc-*.sh` wrappers need **zero edits**.

**The migrated `plgg` is only half-cleaned**: its `package.json` still
lists `vitest` + `@vitest/coverage-v8`, and its `vite.config.ts` keeps
`/// <reference types="vitest" />` + a dead `test:` block (the file is
still needed for `vite build`). The 9 packages copied this incomplete
pattern, so true "no more vitest" cleanup scope **includes `plgg`
itself**.

### 2. Domain model — vitest → plgg-test translation table

plgg-test's façade is **data-last, expression-style**: a test body
RETURNS a branded `Assertion` (`Ok<Pass<T>>`/`Err<Fail>`), and the
runner reads the return value. No fluent chain, no throw-on-mismatch.

| vitest | plgg-test | parity |
| --- | --- | --- |
| `import { test, expect } from "vitest"` | `import { test, check, toBe, … } from "plgg-test"` | exact |
| `expect(x).toBe(y)` | `check(x, toBe(y))` | exact (`Object.is`) |
| `expect(x).toEqual(y)` | `check(x, toEqual(y))` | exact pending §3-#4 deepEqual pin |
| `expect(s).toContain(v)` | `check(s, toContain(v))` | exact |
| `expect(x).toHaveLength(n)` | `check(x, toHaveLength(n))` | exact |
| `expect(x).toBeInstanceOf(C)` | `check(x, toBeInstanceOf(C))` | exact |
| `expect(x).toBeUndefined()` | `check(x, toBeUndefined())` | exact |
| `expect(x).toBeGreaterThanOrEqual(n)` | **GAP → R1 add matcher** | 1 site, no `>=` matcher |
| `expect(x).not.<m>(y)` | `check(x, not(<m>(y)))` | exact (`not` combinator) |
| `await expect(p).resolves.toBe(y)` | `check(await p, toBe(y))` | exact (happy path; §3-#1 CONFIRMED) |
| `expect(() => f()).toThrow()` / `.not.toThrow()` | **GAP → throws() helper or per-site try/catch** | 3 sites, no matcher |
| `assert(isOk(r)); r.content` | `check(r, okThen(…))` / `shouldBeOk` | exact (data-flow narrowing) |
| `expect(spy).not.toHaveBeenCalled()` | `check(spy.mock.calls.length, toBe(0))` | exact (boolean check, no matcher) |
| `vi.fn / stubGlobal / unstubAllGlobals / stubEnv / unstubAllEnvs / spyOn` | identical on plgg-test `vi` | exact |
| `vi.mock("plgg", …)` | **GAP → DI redesign** | 1 live site, not provided (Amendment 2) |
| `test.skip(name, fn)` | same | exact |
| `test.skip(name, fn, <timeout>)` | **GAP → drop the timeout arg** | 10 sites, tsc TS2554 |
| `afterEach` / `beforeEach` / `describe` / `it` / `suite` | same (`it`=`test`, `describe`=`suite`) | exact |

**Verified frequencies across the 58 files** (re-counted for v2):
`toBe` ~239, `toEqual` ~81, `toContain` ~58, `assert` 27 narrowing
sites, `.resolves` 24, `toHaveLength` 16, `.not` 16 (11 `not(toContain)`
+ 5 `not(toBe)`), `toBeUndefined` 2, `toBeInstanceOf` 2,
`toBeGreaterThanOrEqual` 1, spy `not.toHaveBeenCalled` 1, **`toThrow` 3**,
**`vi.mock` 1**, **`test.skip` timeout-arg 10**, **`.rejects` 0**. So
~99% of assertions are the exactly-parity matchers + `not`; the work and
the risk concentrate in the small tail: R1, the 3 `toThrow` sites, the 1
`vi.mock` DI redesign, and the 10 timeout-arg drops.

### 3. Translation fidelity analysis — where semantics can drift

1. **`.resolves` / async (24 sites) — RESOLVED.** vitest's
   `await expect(p).resolves.toBe(y)` fails the test if `p` rejects; the
   rewrite `check(await p, toBe(y))` instead lets a rejection throw out
   of the body. **Pre-impl verification CONFIRMED**: `Core/Runner.ts`
   catches a thrown/rejected test body and reports it as a FAILURE (not
   a process crash) — see §6. Combined with **`.rejects` = 0** (no site
   relies on `.resolves` as a "did-not-reject" assertion), the `await`
   rewrite is faithful on both paths. This retires v1's highest-listed
   async risk.

2. **`toThrow` (3 sites) — real gap.** `seam.spec.ts:74` (`.toThrow()`),
   `bun.spec.ts:59` and `deno.spec.ts:63` (`.not.toThrow()`). No
   `toThrow` matcher exists in `Matchers/matchers.ts`. Each must become
   a try/catch capturing whether a thunk threw, then a `check` over the
   captured boolean — OR plgg-test gains a `throws()` helper (a
   `pass`/`fail`-returning wrapper around try/catch, negated via the
   existing `not`). The helper keeps these near-mechanical and raises
   the published runner; recommend it. Faithfulness bar: `.not.toThrow()`
   must assert the thunk did **not** throw, `.toThrow()` that it did.

3. **Negation (`.not`, 16 sites).** `not(<m>(y))` is exact for value
   matchers (11 `not(toContain)`, 5 `not(toBe)`). The lone spy-negation
   `expect(spy).not.toHaveBeenCalled()` is not a value matcher; the
   migrated idiom is `check(spy.mock.calls.length, toBe(0))`. Fidelity
   fine; shape differs.

4. **Deep-equality (`toEqual`, ~81 sites) — OPEN, gated.** plgg-test's
   `toEqual` uses its own `deepEqual` (`Expect/equals.ts`), not vitest's.
   For plain data/arrays they agree. **Risk** on class instances, nested
   `Option`/`Result` (`Box`-tagged), `Map`/`Set`, and
   `undefined`-vs-absent props. The corpus uses `toEqual` heavily on plgg
   domain values, so a `deepEqual`-vs-vitest divergence is a silent
   false-green/false-red across ~81 sites. **Pre-impl verification OPEN**
   — scheduled as a hard U1 entry gate (§6). No `toStrictEqual`,
   `toMatchObject`, `toHaveProperty`, `toBeCloseTo`, `toMatch`,
   `toBeTruthy/Falsy` appear (all 0), so the equality surface is bounded
   to `toBe`/`toEqual`/`toContain`.

5. **`vi.mock` (1 live site) — real gap, redesign not rewrite.**
   `plgg-kit/.../generateObject.spec.ts:27` mocks plgg's `postJson` seam
   to run the offline `generateObject` path. It backs **4 non-skipped
   tests** (the OpenAI/Anthropic/Google envelope decodes + the env-apiKey
   path). plgg-test deliberately omits `vi.mock` (Plan Amendment 2). The
   faithful migration is **dependency injection**: pass the seam (canned
   per-vendor responses) into `generateObject` rather than module-mocking
   it. This is the single non-mechanical file; it may touch a seam
   parameter on `generateObject`. The same three envelopes must still be
   exercised offline — not weakened to skips.

### 4. Boundary integrity — module resolution (verified, low risk)

The plgg-test runner replaces vitest's `resolve.alias` with a native
Node loader hook (`src/Resolve/hook.ts`) fed by `PLGG_TEST_ALIASES`,
which `bin/plgg-test.mjs` derives from the **target package's own
`tsconfig.json` `paths`** via `aliases.mjs`. `stripStar()` handles both
key shapes present in the repo: `"plgg/*"` → `plgg` and `"plgg-kit*"` →
`plgg-kit`. The hook rewrites **self-package** specifiers to on-disk
`.ts` (trying `<path>.ts` then `<path>/index.ts`) and deliberately lets
**cross-package** bare specifiers (`"plgg"`, `"plgg-http"`) fall through
to `file:`/`node_modules` resolution against built dist.

All 9 vitest packages follow the same `"<name>*": ["./src/*"]` (or
`"<name>/*"`) convention — `example` uses no alias and relies on
relative imports. The `/index` import style the specs use
(`"plgg-fetch/index"`) resolves via the `index.ts` step. **This boundary
— the a-priori highest risk — is retired by the existing
convention-following tsconfigs and the already-proven `plgg`
precedent**; no per-package resolver work. The only precondition is the
build-before-test ordering in `check-all.sh`, which is runner-independent
and already in place.

### 5. Component taxonomy — classification of the work

- **(a) Mechanical per-file rewrites** — the bulk (~53 of 58 files):
  `expect(x).m(y)` → `check(x, m(y))` + import swap, `.not` →
  `not(...)`, `.resolves` → `await` + `check`, `assert`-narrowing →
  `okThen`/`shouldBeOk` guards. Per-package independent, parallelizable.
  Gated on §3-#4 `deepEqual` pin.
- **(b) `package.json` swaps** — 9 packages + `plgg`: plgg-test idiom
  scripts; add `"plgg-test": "file:../plgg-test"`; **remove `vitest` +
  `@vitest/coverage-v8`** (including from already-migrated `plgg`).
- **(c) `scripts/test-*.sh`** — **NONE** (runner-agnostic).
- **(d) plgg-test source refinements** — in priority order:
  1. **R1 (REQUIRED): add `toBeGreaterThanOrEqual`** — 1 site
     (`plgg-foundry/.../runFoundry.spec.ts:35`); add via the existing
     `matcher(...)` helper (`actual >= expected`, `A extends number |
     bigint`) + re-export.
  2. **`toThrow`/`throws()` helper (RECOMMENDED)** — closes the 3 §3-#2
     sites near-mechanically vs. 3 bespoke try/catch blocks.
  3. **`vi.mock` stays OUT of scope** (Amendment 2); the 1 consumer is
     DI-redesigned (§3-#5).
  4. **Timeout-arg: no source change** — drop the 3rd arg at the 10 call
     sites (the skipped bodies never run; widening `test.skip`'s
     signature to swallow a dead arg is not worth the surface).
- **(e) Root-level vitest** — **none exists** (no root `package.json`
  vitest dep, no root `vitest.config`). Per-package `vite.config.ts`
  stays (needed for `vite build`); its dead `test:` block + the
  triple-slash vitest reference are removed as cleanup.

### 6. Pre-implementation verifications (the two I owed)

1. **Runner fails-not-crashes on a thrown/rejected body — CONFIRMED.**
   `Core/Runner.ts` wraps each test body and converts a thrown error or
   a rejected promise into a reported failure verdict rather than
   aborting the run. This underpins the `.resolves` →
   `check(await p, …)` rewrite (24 sites) and the `toThrow` try/catch
   pattern. Risk retired.
2. **`deepEqual == vitest toEqual` on Box-tagged Option/Result and class
   instances — OPEN.** Must be confirmed against `Expect/equals.spec.ts`
   (and extended if a gap is found) **before any U2 package migration
   begins**. Scheduled as a **hard U1 entry gate**: U1 does not complete
   until this parity is demonstrated, because ~81 `toEqual` sites depend
   on it and a divergence is a silent false verdict.

### 7. Coverage measurement-basis note (guards against a false regression)

plgg-test measures coverage with **V8 block-branch counting**, which
reads *lower* than vitest's **istanbul-normalized** numbers (plgg-test's
own config comment records branches reading ~86 vs the istanbul figure;
plgg-test lowered its own gate from 91→85 for exactly this reason). So a
package honestly migrated may report a lower branch percentage with **no
loss of protection** — only a different ruler.

Therefore distinguish two things when auditing the "coverage preserved"
success criterion:

- **Protection-preserved** (which assertions/branches are exercised) —
  **must hold file-for-file**; never excluded-away to hit a number.
- **Reported-percentage** (the V8 figure) — **legitimately shifts** with
  the ruler change.

A documented threshold adjustment that accompanies the
measurement-basis change satisfies the criterion; silently dropping
files to preserve an old istanbul number does **not**. This must inform
the 6 gated packages' `plgg-test.config.json` thresholds (fetch/router/
server/sql/view = 91, http = 90 under vitest): if a package's real V8
number falls below its historical istanbul threshold, that is a
ship-or-defer decision (document and adjust), not a coverage regression
and not a license to exclude files.

### Structural verdict

The migration is **structurally sound and mostly mechanical**. The
resolver boundary is retired; orchestration needs zero edits; ~53 files
are mechanical rewrites. Risk concentrates in a small, now-fully-named
tail: R1 (1 site), `toThrow` (3 sites), the `vi.mock` DI redesign (1
file, 4 live tests), the timeout-arg drop (10 sites, 2 packages), the
`deepEqual` parity gate (~81 sites, OPEN), and the coverage
measurement-basis discipline. v1's `.rejects` alarm is withdrawn; the
async `.resolves` risk is retired by the CONFIRMED runner behavior.

## Review Notes

- All v1↔design count conflicts are reconciled here with line-level
  verification; `.rejects = 0` and `toThrow = 3` and timeout-arg `= 10`
  are the authoritative numbers.
- The one OPEN item (`deepEqual` parity) is not a blocker to approving
  this model — it is a scheduled U1 entry gate, owned by Constructor as
  the first act of implementation.
- Counts are grep + line-inspection measurements; exact per-file
  attributions are re-derived during the mechanical rewrite.

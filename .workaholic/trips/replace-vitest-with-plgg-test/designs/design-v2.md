# Design v2

- **Author**: Constructor
- **Status**: approved
- **Reviewed-by**: Planner, Architect

> Supersedes design-v1. Folds in the round-1 reviews (Planner C-1/C-2/C-3,
> Architect toThrow/vi.mock/skip-timeout/two-gates) after the whole team
> re-grepped and converged on one reconciled set of facts. All counts
> below are verified against the real tree; where design-v1 or model-v1
> disagreed, the verified number is used and the discrepancy noted.

## Content

### 0. What changed from v1

design-v1 scoped only R1 (`toBeGreaterThanOrEqual`) + R2 (coverage
configs) as the refinement surface and under-weighted the long tail.
The reconciled refinement plan is now **R1–R6** plus two named pre-impl
gates. The corrections, all verified by direct grep / source read:

| Item | v1 said | model-v1 said | **verified truth (v2)** |
| --- | --- | --- | --- |
| `.rejects` sites | 0 | 11 | **0** — drop entirely (R6) |
| `toThrow` sites | 0 (missed) | 3 | **3** — hand-rewrite (R3) |
| `vi.mock` sites | 0 (missed) | 1 | **1** — DI redesign (R5) |
| skip + timeout arg | 0 (missed) | 4 (kit only) | **10** (6 kit + 4 foundry) — drop arg (R4) |
| `toBeGreaterThanOrEqual` | 1 (R1) | — | **1** — add matcher (R1) |
| Runner fails-not-crashes | not checked | open risk | **CONFIRMED** (gate discharged) |
| `deepEqual`≡`toEqual` parity | not checked | open risk | **OPEN** — hard U1 entry gate |

### 1. Scope and inventory (unchanged from v1, re-confirmed)

9 vitest packages, **58** `*.spec.ts` files importing `vitest`:

| Package | spec files | original vitest threshold |
| --- | --- | --- |
| `plgg-server` | 14 | 91 (gated) |
| `plgg-view` | 11 | 91 (gated) |
| `plgg-router` | 8 | 91 (gated) |
| `plgg-foundry` | 6 | none (ungated) |
| `plgg-http` | 5 | 90 (gated) |
| `plgg-kit` | 5 | none (ungated) |
| `plgg-fetch` | 4 | 91 (gated) |
| `plgg-sql` | 4 | 91 (gated) |
| `example` | 1 | none (ungated) |

Imported vitest surface is small and closed: `test` (55), `expect`
(53), `assert` (10), `afterEach` (1), `vi` (in the mock/stub specs).
No root `package.json` or root `vitest.config` exists — vitest lives
only per-package. Shell wrappers (`scripts/test-<pkg>.sh`,
`test-watch-*.sh`, `tsc-*.sh`, `check-all.sh`) indirect through
`npm run …` and need **no edits** (verified). The already-migrated
`plgg` package still carries dead vitest devDeps + a dead vite.config
`test:` block + `/// <reference types="vitest" />` — in scope for
cleanup (U3).

### 2. Migration recipe (the per-spec mechanical core)

Match the migrated `plgg` package idiom exactly (reference specs:
`plgg/src/Atomics/CamelCase.spec.ts`, `…/Functionals/postJson.spec.ts`,
`…/Functionals/tap.spec.ts`).

1. **Import rewrite.** `import { … } from "vitest"` → one
   `import { … } from "plgg-test"` whose named set is the union of
   plgg-test functions the body uses; `expect`/`assert` drop out.
2. **Assertion rewrite (data-last, MUST be returned — see §3 gate):**
   - `expect(x).toBe(y)` → `return check(x, toBe(y))`
   - `expect(x).toEqual(y)` → `return check(x, toEqual(y))`
   - `expect(x).toContain(y)` → `return check(x, toContain(y))`
   - `expect(x).toHaveLength(n)` → `return check(x, toHaveLength(n))`
   - `expect(x).toBeUndefined()` / `toBeNull()` / `toBeInstanceOf(C)` →
     `return check(x, toBeUndefined())` etc.
   - `.not.` → wrap inner matcher: `return check(x, not(toBe(y)))`
   - `await expect(p).resolves.toBe(y)` → `return check(await p, toBe(y))`
   - `expect(spy).not.toHaveBeenCalled()` →
     `return check(spy.mock.calls.length, toBe(0))`
   - Multiple checks in one body → `return all([check(...), check(...)])`.
3. **Narrowing rewrite (`assert(...)`, 27 sites).** Replace
   throw-narrowing with data-flow narrowing:
   `assert(isOk(r)); <use r.content>` →
   `return check(r, okThen((v) => <check on v>))` (or
   `okThen((v) => all([...]))` for several); symmetric `errThen`
   (defaults its error channel to `InvalidError`), `someThen`,
   `shouldBeOk`/`shouldBeErr`/`shouldBeSome`/`shouldBeNone`.
4. **Hooks.** `afterEach`/`beforeEach` move into the plgg-test import;
   `vi.stubGlobal`/`unstubAllGlobals`/`fn` bodies are unchanged (same
   names on plgg-test's `vi`).
5. **package.json** per package: swap scripts to the plgg idiom
   (`test`: `tsc --noEmit && plgg-test src`; `test:watch`:
   `plgg-test src --watch`; `coverage`:
   `tsc --noEmit && plgg-test src --coverage`; `coverage:watch`:
   `plgg-test src --coverage --watch`); add
   `"plgg-test": "file:../plgg-test"`; **remove** `vitest` +
   `@vitest/coverage-v8`.
6. **vite.config.ts** per package: delete the `test:` block and the
   `/// <reference types="vitest" />` line; keep `build`/`resolve`/
   `plugins`.

**No `as` / `any` / `ts-ignore`.** The migrated `plgg` reference specs
contain `as unknown as typeof fetch` / `as any` — these are pre-existing
violations and MUST NOT be copied. Where a spec mocks a global, use the
typed `vi.stubGlobal("fetch", vi.fn(impl))` seam (already cast-free in
`plgg-fetch/request.spec.ts`).

### 3. Refinement plan (R1–R6) and pre-impl gates

#### R1 — add `toBeGreaterThanOrEqual` matcher (the ONLY plgg-test source change)
One site: `plgg-foundry/.../runFoundry.spec.ts:35`
(`expect(todos.size).toBeGreaterThanOrEqual(1)`). Add a sibling matcher
in `packages/plgg-test/src/Matchers/matchers.ts` (the existing
`matcher(...)` helper, predicate `actual >= expected`, typed
`A extends number | bigint`), re-export from `index.ts`, with its own
spec. Minimal faithful addition; `toBeGreaterThan` already exists, `>=`
does not.

#### R2 — per-package coverage configs (config only, no code change)
The 6 gated packages each get a `plgg-test.config.json`:
`{ "coverage": { "threshold": <n> } }` with the original number —
fetch/router/server/sql/view = **91**, http = **90**. The 3 ungated
(example/foundry/kit) get **no** config file; `Coverage/config.ts`
treats a missing file as ungated (reported, never fails), reproducing
their `all:true`/no-threshold vitest behavior exactly.

#### R3 — hand-rewrite the 3 `toThrow` sites (NO new matcher)
Sites: `plgg-fetch/.../seam.spec.ts:74` (`.toThrow()`),
`plgg-server/src/bun.spec.ts:59` and `…/deno.spec.ts:63`
(`.not.toThrow()`). Pattern — capture whether it threw and **RETURN**
the assertion:

```ts
// .toThrow()
test("toFetchRequest throws on a malformed URL", () => {
  const threw = ((): boolean => {
    try { toFetchRequest(baseRequest({ path: "not a url" })); return false; }
    catch { return true; }
  })();
  return check(threw, toBe(true));
});

// .not.toThrow()
test("bun adapter omits onListen when not provided", () => {
  const threw = ((): boolean => {
    try { createAdapter(impl)({ port: 0 })(handler); return false; }
    catch { return true; }
  })();
  return check(threw, toBe(false));
});
```

3 sites only — a `toThrow` matcher is not justified. (A tiny local
`didThrow(() => …): boolean` helper is acceptable for symmetry; still no
plgg-test API change.)

#### R4 — drop the 3rd timeout arg on the 10 `test.skip` sites
Sites (all `test.skip`, all live-network integration tests, so the
timeout is inert): plgg-kit ×6 (`generateObject.spec.ts` ×3 @ 20000;
`Anthropic`/`OpenAI`/`Google.spec.ts` @ 20000) and plgg-foundry ×4
(`blueprint`/`runFoundry` @ 30000; `ProfileFoundry`/`TodoFoundry` @
60000). plgg-test's `test.skip` is strictly `(name, fn) => void`
(`Core/Registry.ts:117`), so a 3rd arg is a **TS2554** that `tsc --noEmit`
raises *before* plgg-test even runs. Drop the trailing
`, NNNNN`. No plgg-test signature change.

#### R5 — `vi.mock("plgg", …)` → typed DI redesign
One file: `plgg-kit/.../generateObject.spec.ts:27` hoisted-mocks the
`plgg` module's `postJson` seam (4 live `test.skip` provider tests plus
the offline `generateObject` path). plgg-test deliberately provides no
module-mock registry. Redesign to inject the seam as a typed parameter
so the offline vendor-envelope decodes run without the network — **no
`as`, no `any`, no `ts-ignore`**. **Gate**: first confirm production
`generateObject` exposes (or can cheaply expose) an injectable seam; if
it cannot, that is a small production change to surface, not a cast to
hide behind.

#### R6 — drop the `.rejects` refinement
Real count = **0**. Nothing to support; no `rejects`/`toThrow`
combinator is added.

#### Pre-impl gates

- **Gate A (DISCHARGED): Runner fails-not-crashes.** `Core/Runner.ts:202-268`
  runs the body in try/catch inside an unhandled-rejection window; a
  throw or rejected promise folds to a fail. So `return check(await p,
  toBe(y))` is faithful on both happy and rejection paths. Recorded as
  done. The runner *also* fails any body that does not RETURN a branded
  Assertion (anti-false-green guard) — this is why §2 mandates
  `return`.
- **Gate B (OPEN — hard U1 entry gate): `deepEqual` ≡ vitest `toEqual`.**
  81 `toEqual` sites assert over plgg domain values (Box-tagged
  Option/Result, Datum, arrays). plgg-test's `toEqual` uses its own
  `Expect/equals.ts` `deepEqual`, not vitest's. Before any bulk
  per-package rewrite, read `Expect/equals.spec.ts` and add a targeted
  parity spec confirming `deepEqual` agrees with vitest `toEqual` on:
  class instances, nested Box-tagged Option/Result, `Map`/`Set`, and
  `undefined`-vs-absent property distinction. Any divergence is a silent
  false-green/false-red and must be resolved (matcher fix or documented
  rewrite) before U2 begins. This is the single genuinely open fidelity
  risk.

### 4. Coverage parity rule (Planner C-2)

- Each of the 6 gated packages keeps a `plgg-test.config.json` at its
  **original** threshold; the 3 ungated stay configless.
- A gate may be lowered **only** to the *measured* plgg-test (V8) number
  for that package, **only** with a one-line rationale citing the
  istanbul-vs-V8 branch-counting difference (plgg-test gated itself at
  85 for exactly this reason), and **never** by excluding source files
  to hit a number.
- Every lowered gate is an explicit **ship-or-defer line item** recorded
  in that package's ticket and the event log — not a silent edit.

### 5. Per-package definition-of-done (Planner C-3)

A package is "green" and shippable only after ALL of:
1. `scripts/test-<pkg>.sh` passes (`tsc --noEmit && plgg-test src`).
2. `scripts/test-watch-<pkg>.sh` confirmed to start and re-run on change
   (watch-mode parity).
3. If gated: `npm run coverage` run and the threshold gate observed
   firing at the configured number (coverage parity), with any
   below-threshold result handled per §4.
4. Grep gate for that package: zero `from "vitest"`, zero new
   `as`/`any`/`@ts-ignore`, every rewritten body RETURNs its assertion.

A passing single `test` run alone is NOT done.

### 6. Quality strategy

- Type checks via `scripts/tsc-<pkg>.sh` / `scripts/tsc-plgg.sh`, zero
  errors, zero new escape hatches.
- Whole-repo acceptance via `scripts/check-all.sh` (build in dependency
  order, then every `test-*.sh`).
- Grep gates (all must be empty at U3 close):
  - `grep -rn 'from "vitest"' packages --include="*.ts"` → 0
  - `grep -rln '"vitest"\|@vitest/coverage-v8' packages/*/package.json` → 0
  - `grep -rn 'reference types="vitest"' packages/*/vite.config.ts` → 0
  - no residual `test:` block in any `vite.config.ts`
  - no NEW `as`/`any`/`@ts-ignore` in changed spec files vs baseline
- Format each edited file with the package's `.prettierrc.json`
  (printWidth 50); never hand-pack.

### 7. Delivery plan (ordered, dependency-aware; ticketed at the next gate)

- **U1 — plgg-test refinement + gates.** R1 (`toBeGreaterThanOrEqual` +
  spec) and **Gate B** (the `deepEqual`≡`toEqual` parity verification +
  parity spec). Gate A recorded as already discharged. Ship and verify
  `scripts/test-plgg-test.sh` green. Nothing in U2 starts until Gate B
  passes.
- **U2 — per-package migrations**, one ticket per package, leaf-first:
  `example` → `plgg-http` → `plgg-view` → `plgg-router` →
  `plgg-foundry` → `plgg-kit` → `plgg-fetch` → `plgg-sql` →
  `plgg-server`. Each ticket does §2 (rewrite + package.json +
  vite.config), adds `plgg-test.config.json` if gated (R2), and meets
  the §5 definition-of-done. The package-local long-tail items live in
  their owning tickets:
  - **R3** (toThrow ×3): in the `plgg-fetch` ticket (seam.spec) and the
    `plgg-server` ticket (bun/deno.spec).
  - **R4** (skip-timeout ×10): in the `plgg-kit` ticket (×6) and the
    `plgg-foundry` ticket (×4).
  - **R5** (vi.mock DI): in the `plgg-kit` ticket (generateObject.spec).
  `plgg-server` (14) and `plgg-view` (11) may sub-split by source
  subtree if a single ticket is too large; each sub-unit leaves the
  package green.
- **U3 — plgg cleanup + final grep gate.** Strip lingering `vitest` +
  `@vitest/coverage-v8` devDeps, the dead `test:` block, and the
  `/// <reference types="vitest" />` line from the already-migrated
  `plgg` package. Run all §6 grep gates and `scripts/check-all.sh` as
  the trip's final acceptance (zero `from "vitest"`, zero new
  `as`/`any`).

Each unit leaves the repo green and vitest-free for its scope, so units
ship independently.

### 8. Risk assessment (updated)

- **`deepEqual`/`toEqual` divergence (HIGH, OPEN).** Mitigated by Gate B
  as a blocking U1 entry gate before any bulk rewrite.
- **Coverage drift under V8 counting (MEDIUM).** Mitigated by §4: lower
  only to the measured number, with rationale, as a ship-or-defer line
  item; never exclude files.
- **Anti-false-green RETURN omission (MEDIUM).** The runner fails a
  non-returning body; §2/§5 mandate `return`, and the §5 grep gate
  catches bare-statement `check(`/`all(` in rewritten bodies.
- **R5 DI redesign needs a real injectable seam (MEDIUM).** Mitigated by
  the R5 gate: confirm/expose the seam without a cast before committing
  the kit ticket.
- **`.resolves` rejection-path reporting (LOW).** Retired by Gate A
  (runner catches). `.rejects` count is 0, so no try/catch sprawl.
- **Alias resolution (LOW).** All 9 tsconfigs follow the
  `deriveAliases`-handled convention (Architect §4, independently
  confirmed) — retired.
- **Prettier printWidth:50 reflow noise (LOW).** Format-on-rewrite;
  review diffs for intent.

### 9. Policies

This build answers to the following engineering policies (drives the
ticket decomposition):

- `workaholic:implementation` / `policies/directory-structure.md` —
  MANDATORY. Specs stay co-located beside source (`*.spec.ts`);
  per-package config (`plgg-test.config.json`, `vite.config.ts`) stays
  at each package root. No central test directory; no test relocation.
- `workaholic:implementation` / `policies/coding-standards.md` —
  MANDATORY. The hard no-`as`/`any`/`ts-ignore` rule, Prettier
  printWidth:50 per package, house expression style; the rewrite must
  not propagate the reference package's pre-existing casts (R5 in
  particular).
- `workaholic:implementation` / `policies/test.md` — the testing-
  strategy policy. This trip is a test-tooling change; coverage and the
  "types-can't-express" assertions (Result/Option narrowing, throw
  assertions) must be preserved one-for-one, and coverage gates kept
  intact (R2, §4).
- `workaholic:implementation` / `policies/type-driven-design.md` — the
  narrowing rewrite (R-recipe step 3) replaces throw-narrowing with
  data-flow narrowing, keeping Result/Option modeled as values; this is
  why no `assert` shim is added.
- `workaholic:implementation` / `policies/functional-programming.md` —
  the data-last `check(actual, matcher)` form, `return`-style bodies,
  Option-not-null, Result-not-throw; the rewrite must follow it.
- `workaholic:implementation` / `policies/command-scripts.md` — the
  per-package npm scripts + `scripts/*.sh` wrappers are the command
  surface; the runner swap keeps the `test`/`test:watch`/`coverage`
  contract stable so wrappers and `check-all.sh` keep working unchanged.
- `workaholic:operation` / `policies/ci-cd.md` — CI runs the test
  scripts in the deploy/dependency loop; the swap must keep CI green and
  the build-before-test ordering intact, with no CI YAML change required
  (verified runner-agnostic).
- `workaholic:implementation` / `policies/vendor-neutrality.md` —
  removing vitest in favor of the in-repo `plgg-test` reduces
  external-vendor surface; R1 keeps the in-house tool capable rather
  than bending tests around a gap.

## Review Notes

- Round-1 reviews (Planner: Request revision — C-1/C-2/C-3; Architect:
  Request revision — toThrow/vi.mock/skip-timeout/two-gates) are all
  accepted and folded in; see `reviews/response-constructor-to-planner.md`
  and `reviews/response-constructor-to-architect.md`. No open
  disagreement remains.
- The only genuinely OPEN technical risk carried into build is Gate B
  (`deepEqual`≡`toEqual` parity), scheduled as a blocking U1 entry gate.
- Ticket decomposition is deliberately deferred to the next gate; §7's
  units (U1/U2/U3) and the per-ticket placement of R3/R4/R5 are the
  intended decomposition seams.

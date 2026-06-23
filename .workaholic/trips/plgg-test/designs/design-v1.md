# Design v1

Author: Constructor
Status: draft
Reviewed-by: none

## Content

### 0. Grounding facts (verified against the repo)

- **Runtime is already TS-native.** Local Node is `v24.13.1`; CI
  (`.github/workflows/run-tests.yml`) pins `22.x`. Node 22.6+ strips
  TS types natively (stable on 23.6+/24), so `node foo.spec.ts` runs
  without tsx/ts-node/esbuild. Verified locally: `node probe.ts`
  executed a typed file directly.
- **No tsx/ts-node anywhere.** vitest is the only thing executing TS
  for tests today (via vite/esbuild). There is no lighter incumbent to
  reuse — native Node is the lighter path.
- **`module.register` + native `--experimental-strip-types` exist** on
  the installed Node (verified). This is the seam we need for
  specifier resolution and for V8 coverage of `.ts` sources.
- **The corpus is a closed, knowable set.** 74 specs in `plgg` alone;
  the matcher/API surface below is enumerated from the *actual* specs
  across all packages, not from vitest's catalog.

### 1. Scope & inventory — the exact public surface

#### 1.1 Imports vs globals

Existing specs **import** their test API:
`import { test, expect, assert } from "vitest";` (and a few with
`describe, it`, `vi`, `afterEach`). So plgg-test provides **named
exports**, not globals. Migration = change the import source string
only (see §4). No global injection, no `tsconfig` `types` entry.

#### 1.2 Structural API (enumerated from real specs)

- `test(name: string, fn: TestFn)` — used 744×. Primary entry.
- `it` — alias of `test` (88× across 5 files).
- `describe(name, fn)` — used in 5 files; nests a group, prefixes
  child names in the reporter.
- `beforeEach` / `afterEach` — used in 4 files (`afterEach` is the
  common one, e.g. `vi.unstubAllGlobals()`); scoped to the enclosing
  `describe` (or file root). `beforeAll`/`afterAll` are **not** used →
  out of scope for v1 (add only if a spec needs them).
- `TestFn = () => void | Promise<void>`. 252 specs are `async`; the
  runner must `await` the returned value and treat a rejected promise
  as a failure (the false-negative/positive seam — §5).
- Skip path: direction requires a skip path. Provide `test.skip` /
  `it.skip` / `describe.skip` (no-op registration, reported as
  skipped). `.only` is **not** used by the corpus → out of scope.

#### 1.3 `expect` matchers (enumerated, with exact counts)

Implement exactly these — the closed set the corpus uses:

| Matcher | Count | Notes |
|---|---|---|
| `.toBe` | 1442 | `Object.is` |
| `.toEqual` | 348 | deep structural equality |
| `.toContain` | 103 | string substring **and** array membership |
| `.resolves.<m>` | 24 | `resolves.toBe`(19)/`toEqual`(3)/`toBeUndefined`(2) — awaits then applies inner matcher |
| `.not.<m>` | 24 | negation wrapper over every matcher |
| `.toHaveLength` | 21 | `.length` equality |
| `.toHaveProperty` | 8 | key path presence (+ optional value) |
| `.toBeInstanceOf` | 7 | `instanceof` |
| `.toThrow` | 6 | calls the fn, asserts it threw (optional message/substring) |
| `.toBeUndefined` | 4 | |
| `.toBeGreaterThan` | 3 | |
| `.toBeDefined` | 3 | |
| `.toBeNull` | 1 | |
| `.toBeGreaterThanOrEqual` | 1 | |

`.rejects` is **not** used by the corpus (only `.resolves`) — but it
is the mirror of `.resolves` and trivially cheap; include it for
symmetry/safety. Everything else vitest offers is **out of scope**.

#### 1.4 `assert` — the load-bearing narrowing primitive

`assert(cond)` is used **448×** as a *type-narrowing* assertion
(`assert(isOk(result)); result.content...`). Because the codebase
forbids `as`/`any`, `assert` MUST be a TypeScript assertion function:

```ts
export function assert(
  cond: unknown,
  msg?: string,
): asserts cond { /* throw on falsy */ }
```

Plus `assert.fail(msg)` (used 4×). This is non-negotiable: if the
signature is not `asserts cond`, the 448 call sites stop type-checking
under `tsc --noEmit` (which `npm test` runs first).

#### 1.5 `vi` — mocking (the hardest, smallest-blast-radius decision)

Used in only 2 files:
- `plgg-fetch/.../request.spec.ts`: `vi.fn`, `vi.stubGlobal`,
  `vi.unstubAllGlobals`.
- `plgg-kit/.../generateObject.spec.ts`: `vi.fn`, `vi.mock`,
  `vi.stubEnv`, `vi.unstubAllEnvs`, plus the above.

Decision for v1:
- **`vi.fn(impl?)`** — a call-recording spy supporting
  `.toHaveBeenCalled / toHaveBeenCalledWith / toHaveBeenCalledTimes`
  (those matchers exist only because of `vi.fn`). Cheap, in scope.
- **`vi.stubGlobal/unstubAllGlobals`, `vi.stubEnv/unstubAllEnvs`** —
  save/restore globalThis keys and `process.env` keys. Cheap, in
  scope.
- **`vi.mock(specifier, factory)`** — **module mocking is the one
  genuinely hard feature**; with ESM it requires loader-hook
  interception of the module graph. Rather than build a fragile
  module-mock engine, v1 narrows the seam: `generateObject` mocks
  `plgg.postJson` (a single network function). The recommended
  migration is to make that the **injectable dependency** it morally
  is (pass `postJson` in, default to the real one) and delete the
  `vi.mock`. If the team rejects refactoring that one spec, the
  fallback is a minimal loader-hook mock registry keyed by resolved
  specifier — but that is flagged as the top scope risk (§5) and
  should be a named follow-up, not silently attempted in "minimum."

#### 1.6 Discovery, reporter, exit code

- **Discovery:** recursively glob the package's `src/**/*.spec.ts`
  (also `*.test.ts` per the existing coverage `exclude` list) using
  `node:fs` — no glob dependency. Roots default to `src` under cwd;
  overridable by CLI args.
- **Execution model:** import each spec file (its top-level
  `test(...)` calls register into a module-level registry), then run
  the collected tree sequentially (sequential avoids shared-global
  races — `stubGlobal` mutates `globalThis.fetch`). Each test runs in
  a try/catch; an `AssertionError` (or any throw / rejected promise)
  marks it failed and records the message + stack.
- **Reporter:** human-readable — per-file `✓ name` / `✗ name` lines,
  failure details (expected/received diff for `toBe`/`toEqual`), and a
  summary `N passed, M failed, K skipped`. Plain text, no color
  dependency (optional ANSI gated on `process.stdout.isTTY`).
- **Exit code (most safety-critical):** `process.exitCode = 1` on any
  failure or on zero discovered tests-that-were-expected; `0` only on
  all-pass. This is the agent-facing contract (§ direction persona 2).

#### 1.7 `--watch`

`node:fs.watch` (recursive) on `src`. On change: **debounce** ~100 ms
(coalesce editor multi-writes), then re-run. v1 re-runs the **whole
suite** (simple, correct) rather than impacted-only (an optimization,
out of scope). Watch never exits non-zero to kill the loop; it prints
the verdict and waits. `recursive: true` for `fs.watch` is supported
on Linux in Node 20+ (verified runtime is v24).

#### 1.8 Coverage

Zero third-party. Use **`NODE_V8_COVERAGE=<dir>`**: spawn the run with
that env var so V8 writes raw coverage JSON; after the run, read the
JSON, filter to the package's `src` files, map byte-ranges to
lines/branches/functions, and compute the four percentages. Apply the
existing **>90% gate** (current config uses 91 thresholds across
statements/branches/functions/lines) and the same `exclude` globs
(`index.ts`, `Abstracts/**`, a few Grammaticals, `*.spec.ts`). Exit
non-zero if under threshold.

Honesty per direction §6.5: V8's raw output gives line + function +
branch (block) coverage natively; **statement-level** granularity is
the one that needs care (V8 is block/range-based, not
statement-AST-based). v1 plan: derive statements from V8 ranges
(block coverage is a sound proxy and is what `@vitest/coverage-v8`
itself builds on). If full statement-AST parity proves costly, the
documented correction path is "lines+branches+functions gated in v1,
statements as a named follow-up" — never an ambiguous silent gap.
Recommended: deliver all four via V8 ranges; treat exact vitest
numeric parity as best-effort, the >90% gate as the real contract.

#### 1.9 Explicitly OUT of scope for "minimum but real"

`.only`, `beforeAll`/`afterAll`, snapshot testing, fake timers,
parameterized `test.each`, custom matchers/`expect.extend`,
concurrency, watch impacted-only, HTML/lcov coverage reporters
(text-summary + threshold gate only), and a full ESM module-mock
engine (see §1.5 fallback).

### 2. Implementation approach

#### 2.1 Specifier resolution (the central execution problem)

Specs import `"plgg/index"`, `"plgg/Functionals/bind"` (self-package
alias → `./src`), `"plgg"` (cross-package → `file:../plgg` dist), and
`"plgg-kit/index"` etc. vite resolves these today via `resolve.alias`.
Native Node will not resolve a bare `"plgg"` to `./src`.

Solution: a small **ESM resolver hook** registered via
`module.register` (a `--import ./register.ts` shim). The hook reads the
package's `tsconfig.json` `paths` (`"plgg*": ["./src/*"]`) and rewrites
self-package specifiers to `file://.../src/...`, appending `.ts` /
`/index.ts` as needed. Cross-package bare specifiers (`"plgg"` from a
consumer) fall through to normal `node_modules`/`file:` resolution
against built `dist` (build order already handled by
`scripts/build.sh`). This hook + `--experimental-strip-types` is the
entire TS execution story — no bundler.

#### 2.2 File layout (`packages/plgg-test/`, mirrors house pattern)

```
packages/plgg-test/
  package.json          # name plgg-test, bin: ./dist/cli, scripts mirror siblings
  tsconfig.json         # cloned from plgg (NodeNext, strict, paths)
  .prettierrc.json      # printWidth 50 (cloned)
  vite.config.ts        # build to dist (es+cjs+dts), same as siblings
  src/
    index.ts            # re-exports the public API (test/it/describe/expect/assert/vi/hooks)
    Core/
      Registry.ts       # describe/it/test/hooks registration tree
      Runner.ts         # tree walk, async-aware, result collection (Result)
      Reporter.ts       # human output + exit code
    Expect/
      expect.ts         # matcher dispatch (+ .not/.resolves/.rejects)
      matchers/...      # one file per matcher family
      equals.ts         # deep-equal for toEqual/toContainEqual
    Assert/assert.ts    # asserts-cond function + .fail
    Mock/vi.ts          # fn / stubGlobal / stubEnv / unstub*
    Discovery/find.ts   # fs walk for *.spec.ts
    Watch/watch.ts      # fs.watch + debounce loop
    Coverage/v8.ts      # NODE_V8_COVERAGE parse + threshold gate
    Resolve/register.ts # module.register resolver hook
    Cli/cli.ts          # arg parse: [roots] --watch --coverage
    *.spec.ts           # plgg-test's own self-tests (§3)
```

House style throughout: `Option`/`Result` not null/throw, exhaustive
`match`, data-last pipelines (`pipe`/`proc`), no `as`/`any`/`ts-ignore`
(the `plgg-coding-style` skill). Internally plgg-test **depends on
`plgg`** (`file:../plgg`) to use its own Option/Result/match. The
public boundary (`expect`/`assert`) throws an `AssertionError` because
that is the test-framework contract; Result is used internally for
runner orchestration.

#### 2.3 CLI entry & integration with `scripts/`

The CLI is `node --experimental-strip-types --import .../register.ts
src/Cli/cli.ts [roots] [--watch] [--coverage]`, exposed as the
package's `bin` and as an npm script. Per-package `package.json`
scripts (`test`, `test:watch`, `coverage`) change from `vitest` to the
plgg-test CLI; `tsc --noEmit` stays as the pre-test gate.

Per the **command-scripts policy**, do **not** add new bespoke
`scripts/*.sh`. The repo already has the canonical per-package runner
family (`scripts/test-<pkg>.sh`, `-watch-`, `coverage-plgg.sh`) that
all just shell into `npm run …`. plgg-test changes what those npm
scripts *invoke*; the shell wrappers stay byte-for-byte. New package
gets its `scripts/test-plgg-test.sh` + watch + tsc following the exact
existing template, and is appended to `scripts/check-all.sh` and
`scripts/build.sh`/`npm-install.sh` lists. CI (`run-tests.yml`) needs
no structural change — `npm test`/`npm run coverage` keep their
meaning.

### 3. Quality strategy

#### 3.1 Bootstrapping (how plgg-test tests itself)

plgg-test ships its own `*.spec.ts` written in its own API and run by
its own CLI — but bootstrapping a test framework with itself risks a
"both broken in the same way" blind spot. Mitigation:

1. A tiny **meta-harness** (`Core/_meta.ts`, ~30 lines, plain
   `throw`/`console`) asserts the *primitives*: a deliberately failing
   `expect` actually throws, a passing one does not, exit code is 1
   when a test fails, async rejection is caught. This proves the
   false-green guard without trusting the thing under test.
2. On top of the verified core, normal `*.spec.ts` cover each matcher,
   the registry/nesting, hooks order, discovery, watch debounce
   (inject a fake clock/event), and the V8 coverage parser (feed it a
   fixture coverage JSON).

#### 3.2 Migration plan (drop-in target)

1. Build plgg-test; wire one package (`plgg`, the largest corpus).
2. Codemod the import source: `from "vitest"` → `from "plgg-test"`
   (mechanical, the only edit for the vast majority of specs).
3. Handle the 2 `vi.mock`-class specs (refactor `postJson` injection
   per §1.5; `stubGlobal`/`stubEnv` work unchanged).
4. **Parity gate (direction §6.2):** run the suite under *both* vitest
   and plgg-test; require identical per-test pass/fail verdicts before
   removing vitest. Trust by demonstration, not assertion.
5. Roll across remaining packages, drop vitest +
   `@vitest/coverage-v8` + `vite`(if unused for build) devDeps, watch
   the Dependabot surface shrink (direction §6.6).

### 4. Delivery plan & risk assessment

Build order: resolver hook + native-TS execution → registry/runner →
expect/assert → reporter+exit code → discovery+CLI → vi (fn/stub) →
self-tests + meta-harness → migrate `plgg` & parity → watch →
coverage → migrate remaining packages → drop vitest.

**Headline risk — false greens (false-positive/negative results).**
The existential risk per direction §5. Specific failure modes:
- *Async swallowing:* an `async` test whose promise isn't awaited
  reports pass while the assertion rejects later. Mitigation: runner
  always `await`s the test fn's return; the meta-harness explicitly
  tests a rejecting async case.
- *Unhandled rejection escaping a test:* attach a per-test
  `unhandledRejection` capture window; fail the owning test.
- Mitigation overall: the meta-harness (§3.1) + the both-runners
  parity gate (§3.2.4).

**Other risks:**
- *Module mocking (`vi.mock`)* — top *scope* risk (§1.5). Plan:
  refactor the one seam; loader-hook mock registry is a named
  follow-up, not in "minimum."
- *Watch reliability* — missed/duplicate events. Mitigation:
  debounce + always full re-run; acceptance criterion = edit triggers
  fresh re-run (direction §6.4).
- *Coverage accuracy* — V8 statement granularity (§1.8). Mitigation:
  block-range proxy + honest follow-up note; the >90% gate is the
  contract, exact vitest numeric parity is best-effort.
- *Node version drift* — strip-types/`fs.watch recursive`/
  `module.register` need Node ≥ 22 (CI) / ≥ 20. Mitigation: document
  the floor in `package.json` `engines`; CI already on 22.x.

### 5. Policies

The build answers to these standard engineering policies (one
`workaholic:<pillar>` / `policies/<slug>.md` per line, with why):

- **`workaholic:implementation` / `implementation/directory-structure`**
  — the new `packages/plgg-test/` must mirror the established
  per-package layout (`src/<Domain>/...`, `index.ts`, tsconfig,
  `.prettierrc.json`, `vite.config.ts`) so it is legible as a family
  member.
- **`workaholic:implementation` / `implementation/coding-standards`**
  — house style is mandatory: Option/Result, exhaustive `match`, the
  strict no-`as`/`any`/`ts-ignore` rule, Prettier `printWidth: 50`.
  Directly forces the `assert` `asserts cond` design (§1.4).
- **`workaholic:implementation` / `implementation/testing`** — this is
  a test framework; trustworthiness (no false greens), the both-runners
  parity gate, and the meta-harness self-verification are governed
  here. The >90% coverage expectation
  ([[feedback_coverage_threshold]]) lives here too.
- **`workaholic:operation` / `operation/command-scripts`
  (command-scripts policy)** — the test/coverage/watch runner scripts
  change; per [[feedback_command_scripts_policy]] we extend the
  canonical per-package runner family and change what npm scripts
  invoke, rather than sprinkling bespoke shell scripts.
- **`workaholic:operation` / `operation/ci`** — the runner is the
  CI green/red gate (`run-tests.yml`); correct non-zero exit codes and
  a stable non-interactive report are the agent/CI contract
  (direction persona 2). Covers how tests run in CI after the swap.
- **`workaholic:operation` / `operation/dependencies`** — the trip's
  raison d'être is shrinking the dependency/Dependabot surface;
  dropping vitest/`@vitest/coverage-v8` and keeping plgg-test at
  zero/near-zero third-party runtime deps is governed here.

(Confirm exact policy slugs against the `implementation`/`operation`
skill indexes during the build; `directory-structure`,
`coding-standards`, testing, and command-scripts are the load-bearing
four, dependencies + CI the operation context.)

## Review Notes

(none yet)

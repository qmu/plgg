# Coding Review — Architect

Reviewer: Architect (Neutral — translation fidelity & boundary integrity)
Subject: Constructor's `packages/plgg-test/` implementation (through
`c23b0ce`) and its integration.
Method: read-only architectural review against
`reviews/architect-review-checklist.md` and the 7 Plan Amendments. No
tests executed (Planner owns E2E).

## Decision

**Approve with observations.**

The implementation is faithful, idiomatic, and inside the dependency
boundary. The two seams I flagged as highest-risk (coverage collection
process; resolver fidelity) are resolved well, and the no-escape-hatch
rule holds across the whole source. One real loss-of-guarantee (the
coverage gate is weaker than the policy it replaces) is permitted by
Amendment 6 *only if recorded honestly* — that recording is currently
missing and is my primary observation.

## What I verified, by checklist seam

### 1. Coverage collection process (Amendment 1) — RESOLVED, well done

My one prior boundary ambiguity is closed and the collection process
is named in code. `bin/plgg-test.mjs` (lines 94–136): on `--coverage`
it re-execs the child with `NODE_V8_COVERAGE=<tmpdir>` **plus** the
`--experimental-strip-types --import register.mjs` flags carried in
`nodeFlags`, then runs a parent post-pass (`Coverage/gate.ts`) that
folds the dumped V8 JSON and applies the gate. `Coverage/v8.ts` (lines
10–28) and `gate.ts` (lines 6–16) both name the process explicitly and
note `node:inspector` is the documented fallback only. This is exactly
what Amendment 1 mandated.

The source-map remapping (`Coverage/v8.ts` + `Coverage/sourcemap.ts`)
is sound and more careful than I expected:
- It re-transpiles each file with the *same* `transpile` shared from
  the load hook (line 7 imports `transpile` from `Resolve/hook`), so
  output-line geometry matches what V8 measured — the right call.
- `coveredOutputLines` (lines 266–301) correctly picks the
  **innermost** enclosing V8 range per line, which avoids the classic
  "count any count>0 overlap → inflate toward 100%" bug. This is the
  subtle thing most hand-rolled V8 folders get wrong; it's right here.

### 2. Resolver hook fidelity — RESOLVED, all three shapes correct

`Resolve/hook.ts` + `aliases.mjs` + `register.mjs` reproduce vite's
`resolve.alias` correctly and *parametrically* (no hard-coded package
names — driven by `PLGG_TEST_ALIASES` derived from the target
package's own tsconfig `paths`, `aliases.mjs` `deriveAliases`):
- self `/index` → `src/index.ts`, self deep path → `<path>.ts` with a
  `/index.ts` directory fallback (`rewrite`, lines 62–85) — covers all
  the live shapes from my §C baseline including
  `plgg-server/node|deno|bun` and directory specifiers like
  `plgg-foundry/Foundry/usecase`.
- cross-package bare `"plgg"` is deliberately NOT rewritten
  (`rewrite` returns "" when no alias prefix matches → `next()` falls
  through, lines 105–118) — the exact behavior my checklist said was
  most likely to regress if the hook over-matched. It doesn't.
- The `aliases.mjs` JSONC parser is correctly char-scanning (not
  regex), specifically because `"./src/*"` contains `/*` that a naive
  block-comment regex would eat (lines 26–81). Good defensive call.

One sound design pivot worth recording (not a defect): Constructor
moved from native `--experimental-strip-types`-as-the-transpiler to a
`load` hook running `ts.transpileModule` (`hook.ts` 138–190), because
plgg's source is not `verbatimModuleSyntax`-clean (mixed type+value
imports like `import { ok, Apply1 }`) and native stripping leaves the
unused type import as a runtime crash. `typescript` is already a devDep
of every package, so this is **inside** the boundary — no new
third-party runtime dep. The boundary (SC6) holds.

### 3. `toEqual` deep-equal (`Expect/equals.ts`) — CORRECT for the corpus

Reviewed against vitest's rules and plgg's shapes:
- `Object.is` for primitives (NaN/-0 correct), array element-wise with
  length check, Date by time, RegExp by source+flags, Map/Set
  structural (lines 56–99). Matches vitest.
- Undefined-prop dropping on *either* side (lines 111–117) — matches
  vitest's `toEqual({a:undefined}) === {}`.
- The function-prop drop (same block) is a genuinely good insight: plgg
  Box values carry closures (`ok(42).isOk`), distinct instances hold
  distinct closures, and dropping functions is what lets
  `toEqual(ok(x), ok(x))` pass — which is also vitest's behavior. This
  is corpus-grounded, not a shortcut.
- Asymmetric-matcher delegation (`eq`, lines 38–54) is correct for
  `toHaveBeenCalledWith(expect.stringContaining(...))`.

Caveat (minor, see observations): this does NOT implement cyclic-
reference protection. The corpus compares acyclic Datum/Dict/Result
shapes, so it's fine today; a cyclic value would infinite-loop rather
than fail. Acceptable for v1; worth a one-line note.

### 4. Assertion boundary throws, not Result (Amendment 5) — CORRECT; ambient fix is legitimate

`Assert/assert.ts`: `expect`/`assert` throw `AssertionError`; matchers
are NOT Result-ified. `assert` is a real `function … : asserts
condition` (lines 21–32) with `assert.fail` via a declaration-merged
`namespace` — the only TS form that preserves the assertion call
signature (a `const` intersection silently drops it, TS2775). The
header comment states the throwing boundary is by design (Amendment 5).

The `ddf0b6f` "ambient types" change (`types/index.d.ts`) is **not** a
hidden escape hatch. It is an `ambient declare module "plgg-test"`
that exists for one real reason: in TS6 an `asserts cond` function
imported *by name* from a generated package `.d.ts` does not narrow at
the consumer call site (the 448 `assert(isOk(x)); x.content` sites
would stop type-checking). An ambient module is treated as part of the
consuming program, so the `asserts` signature is honored. This is the
correct, documented workaround — no `as`/`any`/`ts-ignore` involved.

### 5. Command-scripts policy — COMPLIANT

New `scripts/{test,test-watch,tsc,tsc-watch}-plgg-test.sh` and
`coverage-plgg-test.sh` follow the canonical thin-wrapper template
byte-for-byte (each `cd`s into the package and runs `npm run …`).
`check-all.sh` and `npm-install.sh` gained one line each. plgg's own
`package.json` `test`/`coverage` scripts now invoke `plgg-test src`
(resolved via the `"plgg-test": "file:../plgg-test"` devDep `bin`) with
`tsc --noEmit` kept as the pre-gate. No bespoke per-command scripts
were added. Matches `feedback_command_scripts_policy`.

### 6. No `as` / `any` / `ts-ignore` — CONFIRMED CLEAN

Grepped `src/`, `bin/`, and `types/`: every hit of "as" is the English
word in a comment; no `as`-cast, `: any`, `<any>`, `@ts-ignore`,
`@ts-expect-error`, or `@ts-nocheck` anywhere, including the `.mjs`
resolver files and the ambient `.d.ts`. The `equals.ts` `entriesOf`
helper (lines 33–36) even avoids an `as` by re-entering through
`Object.entries`'s `unknown` view. THE MOST IMPORTANT RULE holds.

## Observations (concerns + concrete proposals)

### O1 (PRIMARY — record the coverage downgrade honestly; Amendment 6)

`Coverage/gate.ts` hardcodes `THRESHOLD = 90` and computes **line
coverage only**. The policy it replaces (`packages/plgg/vite.config.ts`)
gated **statements + branches + functions + lines, each at 91**. So for
the one migrated package (plgg) this is a real loss of guarantee on two
axes:
1. **Bar lowered 91 → 90** (`passesThreshold` is strict `>`, so the
   effective floor moves from >91 to >90).
2. **Branches/functions/statements no longer gated** — branch coverage
   is the strictest catcher of untested paths and is the one most worth
   keeping.

Amendment 6 *permits* a per-package ship-or-defer verdict, so this is
not automatically a blocker — but it requires the downgrade be
**recorded, not silent**, and right now there is no written verdict
saying "plgg ships with line-only coverage gated at >90; branches/
functions/statements deferred." Without that, it is exactly the
"ambiguous silent gap" the direction (SC5) and Amendment 6 forbid.

*Concrete proposal (pick one, in order of preference):*
- (a) Restore parity: gate `lines` at the package's own number (plgg
  = 91, plgg-http = 90, the three ungated packages = none) by reading
  the threshold from config rather than the hardcoded 90; and add
  branch coverage (V8 ranges already give block/branch data — the
  innermost-range logic in `v8.ts` is most of the way there). This
  closes the gap rather than deferring it.
- (b) If branches/statements are genuinely deferred for v1, write the
  explicit per-package verdict into the definition of done / a
  `policies` note: "v1 gates LINE coverage only, at >90; statements/
  branches/functions are a named follow-up," and at minimum lift the
  line threshold to plgg's real 91 so the *line* bar doesn't regress.
- Either way, the hardcoded single `90` must become per-package aware
  before more packages migrate, or plgg-http (90) and the three
  ungated packages will be silently re-gated.

### O2 (MINOR — unhandled-rejection window is narrower than its comment)

`Runner.ts` line 188–189 comments "Also fails the test on an escaped
unhandled rejection during the body window," but `guard` (243–270) only
catches throws/rejections from the **awaited** `fn()`. A fire-and-
forget promise created inside a test that rejects *after* the body
resolves would escape uncaught — a (narrow) false-negative vector. The
dominant corpus form `await expect(p).resolves.toBe(...)` is fully
caught, so impact is low. *Proposal:* either install a per-test
`process.once("unhandledRejection", …)` window to honor the comment, or
soften the comment to match the actual (await-only) guarantee so the
code doesn't claim a guard it doesn't have.

### O3 (MINOR — note the deep-equal acyclic assumption)

`equals.ts` has no cycle guard; a cyclic value infinite-loops instead
of failing. Corpus values are acyclic so it's fine for v1. *Proposal:*
add a one-line caveat to the file header ("assumes acyclic inputs — the
corpus only compares acyclic Datum/Dict/Result shapes") so a future
contributor comparing a cyclic structure isn't surprised by a hang.

## On-plan, not defects (for the Lead's awareness)

- 58 spec files still `import … from "vitest"` and one `vi.mock`
  remains in `plgg-kit/.../generateObject.spec.ts`. This is the
  **staged** migration (Amendment 2/3: prove plgg parity first, 74
  files / 465 verdicts per `8f9d4ed`, then roll the rest). The codemod
  (`bin/codemod-vitest-to-plgg-test.mjs`) and parity gate
  (`bin/parity-gate.mjs`) exist and are wired. Not a gap.
- `vitest` + `@vitest/coverage-v8` are still in `plgg`'s devDeps — also
  correct at this stage: the parity gate needs *both* runners present
  until parity is proven across all packages; removal (SC6) is the last
  migration step.

## Boundary-integrity verdict

The dependency boundary is intact: plgg-test's only runtime dep is
`plgg`; everything effectful rides Node built-ins (`node:fs`,
`node:path`, `node:url`, `node:module`, `node:child_process`,
`node:os`) plus `typescript` (a pre-existing devDep, used only for
transpilation, not shipped). No third-party runtime dependency was
introduced — the trip's raison d'être (SC6) is structurally preserved.
The only thing standing between "approve with observations" and a clean
bill is O1: make the coverage gate's downgrade an explicit, per-package
recorded decision rather than a silent one.

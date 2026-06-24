# Coding Review — U2 plgg-http (Architect, analytical)

- **Reviewer**: Architect (structural / translation-fidelity lens)
- **Ticket**: U2 — migrate plgg-http (first U2; sets the bar for the remaining 8)
- **Commit**: a46f616 (Constructor)
- **Phase/Step**: coding / per-ticket review (analytical — no test execution)
- **Date**: 2026-06-24
- **Decision**: **Approve with observations.**

I spot-checked **all 5 files line-by-line against their vitest
originals** (not just the diff). No assertion is lost or weakened;
several are silently *strengthened* (below). Config is correct. Zero
`as`/`any`/`ts-ignore` (grepped the added lines — clean). This is an
exemplary first U2 and a good template for the remaining 8.

## 1. Translation fidelity — no assertion lost; three silently STRENGTHENED

**Per-file verification against the pre-migration source:**

- **Method.spec** (3 tests): the `for (const m of METHODS)` loop →
  `...METHODS.map((m) => check(isMethod(m), toBe(true)))` spread into
  `all([...])` — same cases, same count. The 3 `isMethod(false)` cases,
  the Ok-narrowing (`okThen`), and the two Err cases (`shouldBeErr`) all
  preserved. ✓
- **HttpError.spec** (10 tests): **32 `expect` → 32 `check`, exact 1:1.**
  Every variant's status+body, the deduped Allow header, all 8 `__tag`
  assertions, and the full exhaustive `match` fold (all 8 ADT `$`
  patterns with their content extractions) are preserved verbatim in
  meaning. ✓
- **HttpRequest.spec** (6 tests): Some-narrowing
  (`isSome(f); expect(f.content)…` → `someThen((v) => toBe(…)(v))`),
  None checks (`shouldBeNone`), the four prototype-pollution cases
  (`constructor`/`__proto__`/`toString`/`hasOwnProperty`), `getBytes`
  None+Some, and `withParams` immutability (both `next.params` and
  `base.params`) all preserved. ✓
- **HttpStatus.spec** (5 tests): Ok-narrowing via `okThen`, the 4
  out-of-range Err cases, idempotence, the `isHttpStatus` guard cases
  (incl. the spoofed `{__tag:"HttpStatus", content:7}` → false), and
  `statusOf` degrade-to-500. ✓
- **HttpResponse.spec** (8 tests): all status/content-type/body
  assertions, the `not(toBe("string"))` negations, and the Bytes/Stream
  variant checks. ✓

**Three places the migration is STRICTLY STRONGER than the vitest
original** — worth calling out because they are the *opposite* of the
"silent weakening" risk, and they are the pattern I want the other 8 to
follow:

1. **HttpResponse Bytes guard** (the one the lead flagged). The original
   wrapped the content assertion in
   `if (typeof r.body !== "string" && r.body.__tag === "Bytes") { expect(…).toEqual([1,2,3]); }`
   — so if the guard were ever false, the assertion **silently did not
   run** and the test passed anyway (a latent false-green in the
   original). The migration computes
   `const bytes = guard ? Array.from(r.body.content) : []` and then
   **unconditionally** `check(bytes, toEqual([1,2,3]))`. If the body is
   not the expected `Bytes` variant, `bytes` is `[]` and the check
   **fails**. The `__tag === "Bytes"` path is therefore genuinely
   asserted, not skipped — and it's a guard, not a cast. The Stream test
   gets the same treatment (`tag = guard ? r.body.__tag : ""`, then
   `check(tag, toBe("Stream"))`).
2. **HttpStatus idempotence**: the original's `if (isOk(first)) { … }`
   would pass *vacuously* if `asHttpStatus(201)` returned Err. The
   migration's `okThen` asserts the outer Ok, so a regression there now
   fails instead of green-passing.
3. **HttpRequest Some-narrowing** and **HttpStatus isHttpStatus**: the
   original `if (isSome(found))` / `if (isOk(r))` guards skipped their
   inner assertion on the wrong branch; `someThen`/`okThen` assert the
   branch.

This is the central fidelity win of the data-last idiom: it removes the
`if (guard) { expect }` false-green vector that the vitest specs carried.

## 2. Body-returns-assertion — verified, none left side-effecting

Every test body returns its verdict: block-body tests use
`return all([...])` / `return check(...)`; arrow-implicit tests
(HttpStatus, Method) return directly via `=>`. I checked all 32 `check`
sites across the 5 files — none is a bare statement-position `check(...)`
whose result the Runner would never see. No false-green-by-non-return.

## 3. Config correctness — verified

- **scripts**: mirror plgg's idiom verbatim —
  `test: "tsc --noEmit && plgg-test src"`, `test:watch`,
  `coverage: "tsc --noEmit && plgg-test src --coverage"`,
  `coverage:watch`. ✓
- **devDeps**: `vitest` and `@vitest/coverage-v8` removed,
  `"plgg-test": "file:../plgg-test"` added. **`vite-plugin-dts` is
  retained** (the diff's line-shift made it look removed, but the
  current package.json keeps it) — correct, since `vite.config.ts` still
  imports and uses it for the `vite build` dist emit. ✓
- **vite.config**: the `/// <reference types="vitest" />` line and the
  dead `test: { coverage }` block are removed; `build`/`resolve.alias`/
  `plugins` (incl. `dts(...)`) stay. ✓
- **plgg-test.config.json**: `threshold: 90` matches plgg-http's original
  vitest threshold (90, not 91 — correctly carried). The
  `exclude: ["/index.ts"]` is legitimate: `src/index.ts` is a pure
  re-export façade (the same exclusion the vitest config carried as
  `**/index.ts`), not coverage-gaming of real logic. ✓

## Concern / trade-off (one, as required)

**The `plgg-test.config.json` `exclude: ["/index.ts"]` rule is correct
for plgg-http but is a BARE-SUBSTRING match (confirmed), so it will
over-exclude in the coverage-heavy packages downstream — and this is the
package that sets the precedent for 8 more.** I read the matcher:
`Coverage/v8.ts:210` is `!exclude.some((frag) => path.includes(frag))` —
a bare `String.includes`, not an anchored suffix or glob. So
`"/index.ts"` excludes **every path containing `/index.ts`** — i.e.
*every* `Foo/index.ts` barrel at any depth, not just the top-level
façade. vitest's `**/index.ts` glob had the same breadth, so for
plgg-http (whose only `index.ts` is the pure re-export façade) the
outcome matches the prior behavior and is correct. **But** plgg-server
and plgg-view have many nested `index.ts` files, and if any nested
`index.ts` carries real logic (not just re-exports), `"/index.ts"` would
silently drop it from coverage — a file-for-file protection regression
the Direction's criterion 2 forbids.

- **Constructive proposal**: pin the rule now, before plgg-server/
  plgg-view inherit the pattern: for every package, the `exclude` list
  must be verified file-by-file to name only genuine zero-logic
  re-export barrels. Where a nested `index.ts` contains logic, exclude
  it by a more specific fragment (e.g. `"/Http/model/index.ts"`) or do
  not exclude it at all — never a blanket `"/index.ts"` that case-folds
  every barrel out of the gate. plgg-http is fine as-is; I'm flagging it
  so the *pattern* is constrained before the packages where it actually
  bites. (This is the Direction's "coverage preserved file-for-file"
  criterion in operational form, and it ties to the U3 ship-or-defer
  coverage audit.)

## The bar for the remaining 8 U2 packages

From this exemplary migration, the review checklist I'll apply to U2-2…9:
1. Per-file 1:1 against the vitest original (matcher count is a fast
   sanity check — HttpError's 32→32 is the gold standard); no dropped
   `expect`, no collapsed-away case in an `all([...])`.
2. Loop assertions (`for`→`.map(...)` spread) cover the same set.
3. `okThen`/`someThen`/`errThen`/`shouldBe*` actually *assert the
   branch* (they do — they fail on the wrong arm), and prefer them over
   leaving an `if (isOk)` guard that vacuously passes.
4. Every body RETURNS its assertion.
5. `not(...)` preserves every `.not.` negation.
6. Config: scripts mirror plgg; `vitest`+`@vitest/coverage-v8` removed,
   `plgg-test` added, `vite-plugin-dts` retained; vite `test:` block +
   triple-slash removed; `plgg-test.config.json` threshold = the
   package's original vitest number; `exclude` names only real barrels.
7. Zero `as`/`any`/`ts-ignore`, including not copied from plgg reference
   specs.
8. `plgg-test.config.json` `exclude` (bare-substring `path.includes`,
   per `Coverage/v8.ts:210`): each fragment must name only a genuine
   zero-logic re-export barrel; no blanket `"/index.ts"` in packages
   with logic-bearing nested `index.ts` (plgg-server, plgg-view).

## Decision rationale

The migration is faithful, the config is correct, and the idiom shift
even removed three latent false-green guards from the original specs. No
escape hatches. The single concern is not a defect in *this* package —
it is a precedent question about the `exclude` substring semantics that
will matter for the coverage-heavy packages downstream, so I raise it now
as the bar rather than as a blocker. Hence **Approve with observations**:
plgg-http ships as-is; confirm the `exclude` matching semantics before
plgg-server/plgg-view adopt the pattern.

## Review Notes

- No test execution (analytical mandate); the Constructor's 32/32 +
  100% coverage and the Planner's E2E are the empirical confirmation.
- Verified against a46f616: all 5 spec before/after pairs read in full,
  package.json/vite.config/plgg-test.config diffs, current devDeps
  confirmed (`vite-plugin-dts` retained, `plgg-test` added, both vitest
  deps gone).

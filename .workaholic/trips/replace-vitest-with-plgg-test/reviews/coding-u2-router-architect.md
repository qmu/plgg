# Coding Review — U2 plgg-router (Architect, analytical)

- **Reviewer**: Architect (structural / translation-fidelity lens)
- **Ticket**: U2 — migrate plgg-router (standard recipe, 8 specs / 39 tests, gated 91)
- **Commit**: 14c44d5 (Constructor)
- **Phase/Step**: coding / per-ticket review (analytical — no test execution)
- **Date**: 2026-06-24
- **Decision**: **Approve.**

All 8 points of the bar pass. Per-file fidelity is exact (test counts
preserved 39→39), the one matcher-count delta is a vacuous-guard
strengthening (not a loss), narrowing is genuine, the exclude rule is
verified against pure barrels, config is correct, and there are no
escape hatches. A clean standard-recipe migration.

## 1. Per-file 1:1 fidelity — preserved (one strengthening)

Matcher and test counts per file (expect→check / test→test):

| File | expect→check | test |
| --- | --- | --- |
| Location | 2→2 | 2 |
| Segment | 3→3 | 3 |
| compilePattern | 7→7 | 4 |
| matchSegments | **12→11** | 6 |
| param | 7→7 | 5 |
| parseQuery | 10→10 | 8 |
| queryCodec | 24→24 | 6 |
| serializeQuery | 5→5 | 5 |

Seven of eight are exact 1:1. Test counts are preserved across the board
(39 total). queryCodec (24 assertions) and parseQuery (10) — the
assertion-dense files — are exact, which is the strongest signal nothing
was dropped in an `all([...])` collapse.

## 2. matchSegments −1 — a vacuous-guard collapse that STRENGTHENS (the case the lead flagged)

I read matchSegments in full. The −1 is **not a dropped assertion**; it
is two things, both fidelity-positive:

- **The "root pattern" test** folded a separate
  `expect(isSome(r)).toBe(true)` + `if (isSome(r)) expect(r.content).toEqual({})`
  (2 expects) into one `someThen((caps) => toEqual({})(caps))` (1 check)
  that asserts Some **and** content — accounting for the −1, and it is
  stronger (no skippable `if`).
- **The key case the lead asked about** — `param`, `wildcard`, and
  `malformed` tests originally wrote
  `if (isSome(r)) { expect(r.content).toEqual(…) }` with **no prior
  `isSome` assertion**. Under vitest, if `match(...)` returned `None`,
  the `if` body simply did not run and **the test passed vacuously** —
  a latent false-green. The migration's
  `check(match(...), someThen((caps) => toEqual(…)(caps)))` **mandates**
  the Some branch (`someThen` fails on `None`). So:
  - *happy path*: identical (Some + the exact capture object asserted —
    `{id:"42"}`, `{name:"a b"}`, `{"*":"a/b/c"}`, `{"*":""}`,
    `{v:"%E0%A4%A"}` all preserved verbatim);
  - *None path (a regression)*: vitest would have green-passed; plgg-test
    now **fails**.

This is exactly the "behavior-preserving on happy path / stronger on
None" property requested — confirmed, and it is the central fidelity win
of the data-last idiom over the vitest `if (guard) { expect }` pattern.

## 3. Negation / narrowing — genuine

`isNone(...)` → `shouldBeNone()`, `isSome(...)` → `shouldBeSome()` or
`someThen(...)` — each **asserts** its branch (fails on the wrong arm),
not merely narrows. `someThen` is used wherever the original read the
inner `.content`; `shouldBeSome`/`shouldBeNone` where only the variant
mattered. The `isSome`/`isNone` imports are correctly dropped (narrowing
moved into the combinators). No `.not.` negations exist in this package's
specs, so none to preserve.

## 4. Body-returns-assertion — verified

Every test body returns its verdict — all 39 are arrow-implicit
`() => all([...])` or `() => check(...)` (no block bodies needing an
explicit `return`, and none left as a side-effecting statement-position
`check(...)`). No false-green-by-non-return.

## 5. Exclude-substring bar — VERIFIED file-by-file (pure barrels)

This is the precedent I flagged on http (the `exclude` is a bare
`path.includes` substring, `Coverage/v8.ts:210`). I read all **four**
`index.ts` files the `"/index.ts"` fragment will drop from the 91 gate:

- `src/index.ts` — `export * from "plgg-router/Routing"` (1 line)
- `src/Routing/index.ts` — 2 `export *` lines
- `src/Routing/model/index.ts` — 2 `export *` lines
- `src/Routing/usecase/index.ts` — 6 `export *` lines

**Every one is a pure zero-logic re-export barrel** — no functions, no
branches, nothing the coverage gate would otherwise measure. So
`exclude: ["/index.ts"]` here drops only genuine barrels; **no
logic-bearing file is silently excluded** from the 91 gate. The
Constructor's claim holds. The bar is satisfied for this package.

## 6. Config — correct

- **scripts**: mirror plgg verbatim (`tsc --noEmit && plgg-test src`,
  `--watch`, `--coverage`, `--coverage --watch`). ✓
- **devDeps**: `vitest` + `@vitest/coverage-v8` removed, `plgg-test`
  added. ✓
- **vite.config**: `/// <reference types="vitest" />` and the
  `test: { coverage … thresholds }` block removed; build/resolve/plugins
  retained. ✓
- **plgg-test.config.json**: `threshold: 91` = plgg-router's original
  vitest threshold. ✓

## 7. Zero `as`/`any`/`ts-ignore` — clean

Grepped the added spec lines: none. No casts copied from plgg reference
specs.

## Concern / trade-off (one, as required)

This is a clean approve, so the concern is forward-looking, not a defect
in this package. **`matchSegments` removed a class of vacuous-pass guard
that almost certainly exists in the remaining packages too — the review
of the larger U2 specs (plgg-server 14 files, plgg-view 11) must treat a
`−N` matcher delta as a thing to *read*, not a red flag, but equally must
confirm each `−N` is a vacuous-guard collapse and not an actual drop.**
The matcher-count heuristic is necessary but not sufficient: a genuine
dropped assertion and a vacuous-guard collapse both show as `−1`.

- **Constructive proposal**: for every U2 file with a matcher-count
  delta, read the specific test(s) to classify the delta as
  collapse-strengthening vs. drop — as I did here for matchSegments. I
  will continue to do this per file; flagging it so the pattern is
  explicit for any parallel reviewer. (No action needed on plgg-router.)

## Decision rationale

Every bar point passes: exact per-file fidelity with test counts
preserved, the one delta verified as a strengthening, genuine
branch-asserting narrowing, all bodies return, the exclude fragment
verified against four pure barrels (no coverage regression), correct
config at the original threshold 91, and zero escape hatches. Nothing to
revise. **Approve.**

## Review Notes

- No test execution (analytical mandate); the Constructor's run and the
  Planner's E2E are the empirical confirmation of the 39-test green +
  91 gate.
- Verified against 14c44d5: all 8 spec before/after counts, matchSegments
  read in full, all four `index.ts` barrels read, package.json/
  vite.config/plgg-test.config diffs.

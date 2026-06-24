# Coding Review — U2 plgg-sql (Architect, analytical)

- **Reviewer**: Architect (structural / translation-fidelity lens)
- **Ticket**: U2 — migrate plgg-sql (4 specs / 25 tests, gated 91; 2 adversarial casts kept — Amendment 3)
- **Commit**: 75f1f57 (Constructor)
- **Phase/Step**: coding / per-ticket review (analytical — no test execution)
- **Date**: 2026-06-24
- **Decision**: **Approve.**

All 8 bar points pass. The Amendment-3 cast exception is honored
exactly — and the migration actually *reduced* cast severity. Every
matcher-count delta is a vacuous-guard collapse that strengthens, the
error-shape multi-assertions are preserved, the 8 barrels are pure, and
config is correct. A clean migration of the package with the trickiest
(adversarial) specs.

## 1. The cast ruling (Amendment 3) — honored, and severity REDUCED

I located every genuine cast (filtering out the English word "as" in test
names/comments). The result is better than "unchanged":

- **Exactly 2 casts remain**, both `v as Interpolation` inside the
  `asInterpolation = (v: unknown): Interpolation => v as Interpolation`
  helper, at `Sql.spec.ts:123` and `:140`. **No other `as` cast, no
  `any`, no `ts-ignore`, no `as unknown`** anywhere in the package (the 4
  other "as" tokens in Sql.spec and the 2 in decodeRows are the English
  word in test names — "binds as a placeholder", "gathered as a sibling").
  query/transaction/decodeRows have **zero** genuine casts.
- **They are confined to the two adversarial SQL-injection-defense
  tests** ("a forged Sql-shaped object is rejected" and "placeholder
  count … including a nullish hole"), and they are genuinely irreducible:
  the cast simulates a type-violating value that bypassed the compiler
  (attacker JSON / a null type-hole) reaching an interpolation slot —
  which is the *subject* of the test. `isSql` itself takes `unknown`, so
  the guard needs no cast; the cast is only the injection vector.
- **Severity went DOWN, count unchanged.** The vitest original had 2
  casts too, but both were **double casts through `unknown`**:
  `forged as unknown as Interpolation` and `null as unknown as number`.
  The migration replaced them with two **single** `as Interpolation`
  casts localized in a typed `(v: unknown) => Interpolation` helper, and
  eliminated the `null as unknown as number` value-cast entirely (null now
  flows through the helper's `unknown` param). So the migration honored
  "keep the irreducible 2" while making them the least-bad cast form.
  This is the right call and an improvement, not a regression.
- The injection defense is genuinely asserted: `isSql(forged) → false`,
  the forged SQL is **bound as `?` not spliced** (`text === "SELECT ?"`),
  and `not(toContain("OR 1=1"))` / `not(toContain("DROP TABLE"))`.

## 2. Per-file fidelity — every delta is a strengthening collapse

| File | expect→check | test | delta classification |
| --- | --- | --- | --- |
| Sql | 21→21 | 11 | exact 1:1 |
| query | 10→8 | 4 | −2: 4 `is*`-assert + 4 `if`-guard → 6 `okThen`/`errThen`/`shouldBe*`; 0 leftover `expect` |
| transaction | 9→6 | 3 | −3: each `expect(isOk/isErr)` + `if(...){content}` → one `okThen`/`errThen` |
| decodeRows | 16→12 | 7 | −4: same collapse; error-shapes preserved via `errThen((e) => all([...]))` |

Test counts preserved (25 total). I read transaction, decodeRows, and
the query before/after in full; **every −N is the vacuous-guard collapse
pattern**, not a dropped assertion:

- The vitest specs wrote `expect(isErr(r)).toBe(true); if (isErr(r)) { …content checks… }`.
  Under vitest, if `r` were the wrong variant the `if` body **silently
  skipped** and the test passed — a latent false-green. The migration's
  `errThen((e) => …)` / `okThen((v) => …)` **mandates** the branch (fails
  on the wrong arm). Happy path identical; wrong-variant path now fails.
- **The error-shape multi-assertions are fully preserved** — exactly the
  case to watch. decodeRows test 3 keeps all three:
  `errThen((e) => all([check(e.__tag, toEqual("InvalidError")),
  check(e.content.message, toContain("1 of 2")),
  check(e.content.sibling, toHaveLength(1))]))`. Test 4 keeps both the
  "2 of 2" message and `sibling toHaveLength(2)`. transaction preserves
  every `log` ordering assertion (`["begin","commit"]` / `[…,"rollback"]`)
  alongside the folded value/error check. Nothing dropped.

## 3. Narrowing / negation — genuine

`okThen`/`errThen`/`shouldBeErr` each assert the branch (fail on the
wrong arm). `errThen((e) => all([...]))` is the correct shape for
multi-field error assertions and is used wherever the original read
multiple `result.content.*` fields. The two `.not.toContain(...)`
negations both became `not(toContain(...))` — preserved verbatim
(verified in the diff). ✓

## 4. Body-returns-assertion — verified

I read all 4 files in full: every body is arrow-implicit
`() => check(...)` / `() => all([...])` or an `async () => { … return
all([...]) }`. The `check(...)` lines at body indent are all inside an
`all([...])` that is returned. No statement-position non-returned
`check(...)`; no false-green-by-non-return. ✓

## 5. Exclude-substring bar — VERIFIED file-by-file (8 pure barrels)

I checked all **8** nested `index.ts` the `"/index.ts"` fragment drops
from the 91 gate (`src`, `Db/`, `Db/model/`, `Db/usecase/`, `Mapping/`,
`Mapping/usecase/`, `Sql/`, `Sql/model/`): **every one has 0 non-barrel
lines** (only `export *` / `export {}` / comments). No logic-bearing file
is silently excluded from the gate. The Constructor's claim holds. ✓

## 6. Config — correct

scripts mirror plgg verbatim; `vitest` + `@vitest/coverage-v8` removed,
`plgg-test` added; `/// <reference types="vitest" />` and the
`test: { coverage … thresholds }` block removed; `plgg-test.config.json`
`threshold: 91` = plgg-sql's original vitest threshold. ✓

## Concern / trade-off (one, as required)

This is a clean approve; the concern is forward-looking. **The
`asInterpolation` helper is now duplicated verbatim in two tests
(`Sql.spec.ts:121-123` and `:138-140`), each carrying its own cast.** It
is the same `(v: unknown): Interpolation => v as Interpolation`. That is
fine for an approved-2-cast exception, but if a future adversarial test
needs the same injection vector, copy-paste would grow the cast count
past the Amendment-3 budget of 2 silently.

- **Constructive proposal (non-blocking)**: if a third adversarial test
  ever needs it, hoist `asInterpolation` to a single module-level helper
  in `Sql.spec.ts` so the cast lives in exactly one place and the
  "2 casts" budget becomes "1 helper" — easier to audit against the
  amendment. Not worth churning the current 2-test form now (two call
  sites, two casts, both documented); flagging so the budget is defended
  if the pattern recurs. (Pairs with the gate's cast-count check.)

## Decision rationale

Amendment 3 is honored exactly — 2 casts, adversarial-only, irreducible,
and actually de-escalated from double to single casts with no other
escape hatch introduced anywhere. Every matcher delta is a
vacuous-guard collapse that strengthens, with error-shape
multi-assertions and log-ordering assertions all preserved; narrowing and
negation are genuine; all bodies return; the 8 barrels are pure (no
coverage regression); config is correct at threshold 91. Nothing to
revise. **Approve.**

## Review Notes

- No test execution (analytical mandate); the Constructor's 25-test
  green + 91 gate and the Planner's E2E are the empirical confirmation.
- Verified against 75f1f57: all 4 spec before/after pairs read in full
  (transaction/decodeRows fully, Sql adversarial-cast context, query by
  pattern), precise cast inventory (2 single, down from 2 double), all 8
  `index.ts` barrels, both `.not`→`not` negations, config diffs.
- Bar continuity: the new precedent this package sets is the
  adversarial-cast handling (irreducible single cast in a typed
  `(unknown) => T` helper, confined to the test whose subject IS the
  type violation, count budgeted by the gate) — the template for the
  remaining packages' security/injection specs if any arise.

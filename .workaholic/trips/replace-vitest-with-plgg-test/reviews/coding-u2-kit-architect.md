# Coding Review — U2 plgg-kit (Architect, analytical)

- **Reviewer**: Architect (structural / translation-fidelity lens)
- **Ticket**: U2 — migrate plgg-kit (R5 vi.mock→DI in production source, R4 skip-timeout, standard recipe)
- **Commit**: a358343 (Constructor)
- **Phase/Step**: coding / per-ticket review (analytical — no test execution)
- **Date**: 2026-06-24
- **Decision**: **Approve with observations.**

This is the only U2 that changed **production source** (R5 DI), so I
scrutinized behavior-preservation hardest. The DI seam is textbook,
production behavior is provably unchanged, the offline tests assert the
same as `vi.mock` did (and slightly more), R4 is correct, and there are
no escape hatches (the grep hits for "as" are all the word inside
comments — "Typed as `typeof postJson`" — not casts; the code-line grep
is clean). One genuinely minor side effect (dotenv auto-load) is worth a
documented note.

## 1. R5 — production behavior identical (the keystone)

**The new param is last + optional + defaulted to the real `postJson`,
so no existing caller is affected.** Each vendor builder
(`reqObjectGPT`/`reqObjectClaude`/`reqObjectGemini`) and `generateObject`
gained `post = postJson` in the destructured object param, with
`post?: typeof postJson` in the type. The single network call site in
each vendor changed from `postJson({...})` to `post({...})`, and
`generateObject` threads `post` into all three vendor branches. Because
the default is the real `postJson`:
- Every production caller that constructs the param object **without**
  `post` gets `postJson` exactly as before — the network path is
  byte-identical.
- `generateObject`'s public signature is **not broken**: it takes one
  object argument; adding an optional property to that object's type is
  backward-compatible (existing callers pass objects that simply lack
  `post`). No positional shift, no required-param addition.
- I confirmed the three skipped **live** `generateObject` tests omit
  `post` (4 `post: fakePost` occurrences = exactly the 4 offline tests;
  the live ones fall through to the real `postJson` when un-skipped) —
  so the live path is preserved too.

**Typed seam, no escape hatch.** `post?: typeof postJson` pins the param
to `postJson`'s exact type. I checked `postJson`'s real signature
(`packages/plgg/src/Functionals/postJson.ts`): curried
`({ url, headers }: { url: string; headers: Dict }) => (data: Datum) =>
Promise<Result<unknown, Error>>`. The test `fakePost` is
`({ url }: { url: string; headers: Dict }) => (_data: Datum) =>
Promise.resolve(ok(responseFor(url)))` — it satisfies `typeof postJson`
structurally (destructures the same param shape, returns the same
`Promise<Result<…>>`), with **no `as`/`any`**. The type system is doing
the work the cast used to fake.

**DI is the right structural choice.** Passing the effect as a
defaulted parameter is the idiomatic plgg/functional answer — it keeps
`postJson` a first-class value, needs no module-mock engine (which
plgg-test deliberately omits, Plan Amendment 2), and makes the seam
explicit and type-checked at every call. The alternatives are worse: a
module-mock would re-introduce the machinery the runner avoids; a global
`postJson` mutable would break referential transparency. The chosen
shape (last optional param, default real impl) is exactly the
minimal-surface DI the house style favors. I confirmed all three vendors
use the identical pattern — consistent, not ad hoc.

## 2. Test fidelity — same behavior as vi.mock, not thinner (and slightly stronger)

`vi.mock("plgg", …)` replaced `postJson` with a per-vendor envelope fake
keyed by URL, then ran the full path and asserted the decoded fruit. The
DI version reproduces this **exactly**:
- `responseFor(url)` returns the same three vendor envelope shapes
  (OpenAI `output[].content[].text`, Anthropic `content[].text`, Google
  `candidates[].content.parts[].text`) — byte-identical to the old mock.
- The 3 provider tests still exercise **provider dispatch** (3 distinct
  providers → 3 URLs → 3 envelope decodes), **request assembly** +
  **per-vendor decode** (the real `generateObject`/`proc`/vendor builders
  run), and assert `toContain("pineapple"/"mango"/"kiwi")`.
- **apiKey resolution** is still covered: the 4th test builds
  `openai("gpt-5.1")` (no apiKey) + `vi.stubEnv("OPENAI_API_KEY", …)`
  and asserts the env path, with a correct `try/finally`
  `vi.unstubAllEnvs()`.

Not thinner. And **slightly stronger**: the old specs used
`assert(isOk(result)); expect(result.content).toContain(…)` (vacuous-pass
if Err); the new `okThen((fruits) => toContain(…)(fruits))` asserts the
Ok branch.

## 3. R4 — skip-timeout drops correct

All 6 `test.skip(name, fn, NNNNN)` timeout args are dropped (0 remaining
`}, NNNN)` across all 5 kit specs), and every one **remains `test.skip`**
(generateObject 3 + Google/OpenAI/Anthropic 1 each = 6 skipped) — none
converted to live, none deleted. Matches the stated baseline (12 passed +
6 skipped). The `(name, fn)` signature now type-checks (no TS2554). ✓

## 4. Standard recipe — faithful (Provider spec checked in full)

The two non-generateObject spec migrations follow the http bar.
**Provider.spec** showed a raw count of 16 expect → 15 check; I read it
in full and the −1 is **not a dropped assertion** — it is a vacuous-guard
collapse that *strengthens* coverage: the original
`isSome(apiKey).toBe(true); if (isSome) expect(content).toBe("sk-test")`
(2 expects, the second skippable) became one
`someThen((k) => toBe("sk-test")(k))` (1 check) that asserts Some **and**
content unconditionally. The "anthropic/google tags" test likewise
upgraded a bare `isSome(...).toBe(true)` to `someThen((k) => toBe("k")(k))`
— more, not less. All narrowing (`isOk`→`shouldBeOk`,
`isErr`→`shouldBeErr`, `isSome`→`someThen`, `isNone`→`shouldBeNone`)
asserts the branch; every body returns; imports trimmed correctly. ✓

**Config**: scripts mirror plgg; `vitest` + `@vitest/coverage-v8`
removed, `plgg-test` added; vite `test:` block removed. **No
`plgg-test.config.json`** — correct, because plgg-kit was **ungated**
(`all: true`, no thresholds) under vitest, and a missing config = ungated
(coverage reported, never failed). This matches the design's rule
exactly; no spurious gate introduced. ✓

## Observation (the dotenv judgment call — my structural read)

**Acceptable as-is; warrants a one-line documented note, not a concern.**
Removing the vitest `test:` block also removed
`test.env = dotenv.config().parsed`, so the 6 skip-by-default live
integration tests no longer auto-load `.env`; the now-unused `dotenv`
import was removed (the `dotenv` devDep is **retained** — confirmed
`^17.4.2`). My read:
- **No running test is affected** — all 6 are `test.skip`, so nothing in
  CI or the normal suite ever read that env. The change is invisible to
  the green path.
- The only impact is on a developer who **manually un-skips** a live
  test to hit a real API: they must now supply the key via the
  environment themselves rather than relying on auto-`.env`-load. That is
  a minor ergonomic change, and arguably *more* honest (the test no
  longer has a hidden env dependency baked into the runner config).
- It is **not** a behavior regression in any sense the Direction's
  success criteria measure (no protection lost; the live tests were never
  part of the gated suite).

- **Constructive proposal (non-blocking)**: add a short comment at the
  top of the live-test block (or a line in the package README/ticket)
  noting that un-skipping a live integration test now requires the API
  key in the environment, e.g. run via `node --env-file=.env` or export
  it — since plgg-test, unlike the old vitest config, does not auto-load
  `.env`. This preserves the (previously implicit) "how to run the live
  tests" knowledge that the `test.env` line used to encode. Retaining the
  `dotenv` devDep is the right call (a future runner-level env-file
  option could use it). Flagging as an **observation**, not a concern.

## Decision rationale

R5's DI is the correct, idiomatic, fully-typed seam; production behavior
is provably unchanged (default = real `postJson`, optional last param, no
signature break); the offline tests assert the same as `vi.mock` and
slightly more; R4 is correct; the standard-recipe specs are faithful and
even strengthen a couple of vacuous guards; config matches the ungated
original; zero escape hatches. The only follow-up is documenting the
lost auto-`.env`-load for un-skipped live tests, which affects no running
test. Hence **Approve with observations**.

## Review Notes

- No test execution (analytical mandate); Constructor's 12-passed/
  6-skipped and the Planner's E2E are the empirical confirmation.
- Verified against a358343: all 4 production `.ts` DI diffs read in full,
  `postJson`'s real type confirmed, all 5 spec before/after pairs (the 3
  DI tests + Provider in full, vendor specs + R4 by count), config diffs,
  dotenv devDep retention, and the absence of a `plgg-test.config.json`
  (ungated original).
- Bar continuity: this satisfies the 8-point http bar; the new
  precedent it sets for later packages is the DI-for-effect-mock pattern
  (last optional param `= realImpl`, typed `typeof realImpl`, fake
  satisfies the type with no cast) — the template for any future
  `vi.mock`-shaped seam (none remain in the corpus, but the pattern is
  recorded).

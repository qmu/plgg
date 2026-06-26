# Coding Review — U1-dom (Architect, analytical)

- **Reviewer**: Architect (structural / translation-fidelity lens)
- **Deliverable**: DOM-environment seam (`packages/plgg-test/src/Env/dom.ts` + Runner wiring)
- **Commit**: f29da9c (Constructor)
- **Phase/Step**: coding / per-ticket review (step 2, analytical — no test execution)
- **Date**: 2026-06-24
- **Decision**: **Request revision.**

The design of this seam is good — lazy import, opt-in directive, legacy
`@vitest-environment` honored, `finally`-based teardown, install-before-
import across the whole `runFile`, optional peerDependency. No
`as`/`any`/`ts-ignore` is introduced (grepped the added lines — clean;
the descriptor mirroring uses typed `getOwnPropertyDescriptor`/
`defineProperty` as claimed). But I found a **real cross-file isolation
defect** in the teardown — exactly the "highest structural risk" the
lead flagged — that the leak test does not catch. It is a small,
localized fix, but it breaks the seam's core leak-proof guarantee, so
this is a revision request rather than approve-with-suggestions.

## BLOCKER — `window` is double-saved; teardown leaks the happy-dom window across files

**The defect.** `installHappyDom` mirrors every own property of the
happy-dom `GlobalWindow` onto `globalThis` in a `keys.forEach` loop,
saving each prior descriptor for restore. It then **separately**
special-cases `window`:

```
const keys = Object.getOwnPropertyNames(win);   // includes "window"
keys.forEach((key) => {
  saved.set(key, getOwnPropertyDescriptor(globalThis, key));  // window: saves UNDEFINED (Node has no window) ✓
  …defineProperty(globalThis, key, winDescriptor);            // window: globalThis.window NOW = happy-dom window
});
// then, AFTER the loop has already replaced globalThis.window:
saved.set("window", getOwnPropertyDescriptor(globalThis, "window"));  // ✗ saves the happy-dom descriptor, CLOBBERING the undefined
defineProperty(globalThis, "window", { value: win, … });
```

`"window"` **is an own-property of happy-dom's `GlobalWindow`** — I
verified this directly: `Object.getOwnPropertyNames(new GlobalWindow())`
contains `window` (and `globalThis`, `self`, `top`; 439 props total). So
`window` is handled twice: the loop saves the correct original
(`undefined`, since Node has no `window`), and the explicit
`saved.set("window", …)` then **overwrites that saved entry** with the
descriptor read *after* the loop already mutated `globalThis.window` —
i.e. it saves happy-dom's own descriptor as if it were the prior state.
`Map.set` on an existing key overwrites, so the correct `undefined` is
lost.

**Consequence at teardown.** The restore loop does
`descriptor === undefined ? deleteProperty : defineProperty`. With the
`"window"` entry corrupted from `undefined` to a real descriptor,
teardown takes the `defineProperty` branch and **re-installs the (closed)
happy-dom window** onto `globalThis` instead of deleting it. So
`globalThis.window` **leaks into the next file**.

**I reproduced this analytically** (isolated Node, mirroring dom.ts's
exact logic — not a test run):
```
after loop, saved[window] is:      undefined (CORRECT original)
after explicit set, saved[window]: a descriptor (CORRUPTED — was undefined)
after teardown, window in globalThis: true   (LEAK)
```

**Why the leak test misses it.** `Runner.spec.ts`'s isolation test
asserts only `check("document" in globalThis, toBe(false))`. `document`
is handled *only* in the loop (not double-saved), so it restores
correctly and the test is green — while `window` silently leaks. The
test's own premise ("the runner process itself is clean after teardown")
is therefore only half-verified.

**Concrete risk for the migration**, not just theoretical: a no-DOM spec
running in the same process after a DOM spec would see a stale, closed
`globalThis.window`. `typeof window` probes flip from `"undefined"` to
`"object"`; any library code that branches on `window` presence (SSR vs.
client detection is common in `plgg-view`/`plgg-server`) would take the
wrong branch. And `application.spec.ts` specifically reads
`window.happyDOM` — a leaked *closed* window from a prior file (its
`happyDOM.close()` already called) is a live footgun.

- **Constructive proposal (minimal)**: delete the explicit `window`
  special-case block entirely. `window` is already an own-prop of
  `GlobalWindow`, so the `keys.forEach` loop already mirrors it onto
  `globalThis` *and* saves its correct prior descriptor. The only thing
  the explicit block adds is the bug. If there is a concern that the
  loop's mirrored `window` descriptor is not exactly the desired
  `{ value: win, writable, enumerable, configurable }` shape, verify the
  loop-copied descriptor first — but in happy-dom `win.window === win`,
  so the own `window` descriptor already points at the window. (Belt-
  and-suspenders alternative: keep the explicit install but guard the
  save with `if (!saved.has("window")) saved.set(...)`, so the loop's
  correct original is never overwritten.) Then **extend the leak test**
  to also assert `check("window" in globalThis, toBe(false))` (and ideally
  `self`/`top`) after teardown, so the corrected guarantee is pinned and
  this class of regression cannot recur silently.

## Secondary observations (minor — not blocking)

### O1 — directive parser scans the whole file, contradicting the "first-lines" intent
`environmentOf` runs `DIRECTIVE.exec(readFileSync(file))` over the
**entire** source. The doc comment says "first-lines comment" and "robust
to a leading license banner," but whole-file scanning means a
directive-shaped substring appearing *later* — inside a string literal,
a doc comment, or a test that asserts on the directive text — is a
false-positive that would force a DOM install (or, with a different
token, a hard `throw`). Low probability in this corpus, but it is a real
gap between the stated "first-lines" contract and the implementation.

- **Constructive proposal**: scan only the file's leading comment block
  — e.g. test the directive against the first N lines, or only lines
  before the first non-`//`, non-blank line. That matches vitest's own
  "directive must be at the top" rule and removes the false-positive
  surface. Cheap; aligns code with its comment.

### O2 — `match === undefined` is a dead branch
`RegExp.exec` returns `RegExpExecArray | null`, never `undefined`, so
`match === undefined` in `environmentOf` is unreachable. Harmless, but
dead. (And `match[1]` is `string | undefined` under
`noUncheckedIndexedAccess`; the current `return match[1]` is fine since a
matched group 1 is always present for this pattern, but the dead
`undefined` check suggests the author was reasoning about the wrong
nullish value.)

- **Constructive proposal**: drop `match === undefined ||`, keep
  `match === null`. One-token cleanup.

## What is correct and well-done (for the record)

- **Runner wiring / load-span**: `installEnvironment` runs before
  `loadModule` (module-eval DOM) and the `try` wraps **both**
  `loadModule` and `runSuite` (test-body DOM), with `restore()` in
  `finally`. Crucially the Constructor also added `await` to `runSuite`
  (previously unawaited) — without that, `finally` could tear down the
  DOM before async test bodies finished. Install happens once per
  `runFile`, so no double-install. This part is exactly right.
- **`document`/`self`/`top`/`globalThis` and the other 435 props** are
  handled *only* by the loop, so their save/restore is correct — the
  defect is isolated to the one double-handled key (`window`).
- **Teardown ordering**: `await win.happyDOM.close()` *before* detaching
  globals is correct (late timers/readyState tasks fire against a live
  document, not a torn-down one). The async `RestoreEnv` type is the
  right shape for this.
- **Fixtures**: `_domFixture` builds an element at module-eval time, so
  it loads at all only if the DOM is installed before import — a genuine
  end-to-end proof of the load-before-import guarantee, not a shallow
  one. `_noDomFixture` proves the opt-in default.
- **Dependency hygiene**: happy-dom as optional peerDependency +
  devDependency with a lazy dynamic import keeps it off the DOM-free
  path — correct for vendor-neutrality and a light default runner.
- **No escape hatch**: typed descriptor mirroring, no `as`/`any`.

## Decision rationale

Everything except one key is correct, and the seam's architecture is
sound. But the one defect breaks the seam's *entire reason to exist* —
per-file isolation — for the `window` global specifically, and `window`
is the global the DOM specs (`application.spec` reading `window.happyDOM`)
most directly depend on. The leak is masked by a leak test that checks
`document` but not `window`. Because this is a correctness defect in the
isolation guarantee (not a style or coverage nit), and the fix plus the
test-tightening are both small, the right call is **Request revision**:
remove the double-save, extend the leak test to assert `window` (and
ideally `self`/`top`) are gone after teardown, and address O1/O2 while in
the file. Re-review will be quick — the structure is already right.

## Review Notes

- No plgg-test test execution performed (analytical mandate). The
  `window`-leak reproduction was run as isolated Node mirroring dom.ts's
  logic, to confirm the defect is real rather than hypothetical; it is
  not a run of the plgg-test suite.
- Verified against commit f29da9c: 8 files, +343/-17; dom.ts and the
  Runner wiring reviewed line-by-line, happy-dom own-prop set verified
  empirically (`window`/`globalThis`/`self`/`top` are own props).
- Once revised, this unblocks U2-example and U2-plgg-view (the 4
  `@vitest-environment happy-dom` specs).

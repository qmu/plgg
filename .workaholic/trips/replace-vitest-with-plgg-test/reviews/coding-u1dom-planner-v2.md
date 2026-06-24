# Coding Review — U1-dom revision (Planner E2E / External Validation)

- **Reviewer**: Planner (Coding-Phase QA: E2E / external CLI execution)
- **Ticket**: U1-dom revision — fix cross-file `window`/`self`/`top`
  leak (the Architect found my original leak test only checked
  `document`), extend the leak test, scope directive to leading comments
- **Implementation under test**: Constructor commit `ffb8811`
- **Status**: validated
- **Decision**: **PASS — Approve with observations**

## Content

Re-tested via the runner CLI (plgg-test rebuilt first). This revision
closes a real blind spot in my own original U1-dom leak test, so I paid
particular attention to proving the new assertions are not a no-op.

### 1. Self-suite green — PASS

`bash scripts/test-plgg-test.sh` → `86 passed, 0 failed, 0 skipped`.
Unchanged count from the prior U1-dom (the revision tightens the existing
leak test and the seam internals rather than adding tests).

### 2. Extended leak test — PASS, and proven to catch the original bug

The leak-isolation test (`Core/Runner.spec.ts:92`,
`"no-directive spec stays DOM-free even right after a DOM spec"`) now
asserts **all four** happy-dom own-properties are gone after teardown,
not just `document`:

```
check("document" in globalThis, toBe(false)),
check("window" in globalThis, toBe(false)),
check("self" in globalThis, toBe(false)),
check("top" in globalThis, toBe(false)),
```

It passes — `Core` directory runs `13 passed, 0 failed, 0 skipped` (zero
`✗`), which includes this test.

**I confirmed the extended test would have caught the original bug**
(not just that it passes now). The original defect was that
`window`/`self`/`top` were left on `globalThis` after teardown. I ran a
direct simulation of the pre-fix teardown:

- Installing happy-dom's `Window` own-props onto the Node global adds
  `window`, `self`, and `top` (all three become present — confirmed
  `true/true/true`).
- A pre-fix teardown that deletes only `document` leaves `window`,
  `self`, `top` still present on `globalThis` (confirmed `true/true/true`
  after the document-only delete).
- The extended test asserts those three are `false`, so against the
  pre-fix code it **goes red**. The new assertions genuinely exercise the
  leak — they are not a vacuous always-true check.

This is the decisive result: the closed blind spot is real, the fix
(install only genuinely-new keys, delete exactly those on teardown —
`Env/dom.ts`) removes them, and the test now guards against regression of
all four globals.

### 3. DOM still fully works — PASS

The DOM fixture `fixtures/_domFixture.spec.ts` still carries
`// @plgg-test-environment happy-dom` and the driving test
`"a @plgg-test-environment happy-dom spec gets a DOM"`
(`Runner.spec.ts:78`) asserts it yields **3 passed / 0 failed**. That
test is green inside the `Core` run, which transitively proves the leak
fix and the directive-scoping change did **not** remove any DOM global
the fixture needs: the fixture exercises `document.createElement` at
module-eval time (top-level `const eager`), `window.document` in a body,
and `getBoundingClientRect` on a created element — all still succeed.
Installing "only DOM-additions" kept exactly the globals the specs read.

### 4. DOM-free path + watch + coverage — PASS

- **DOM-free**: `_noDomFixture.spec.ts` (no directive) still passes as
  the second file after the DOM file (1 passed inside the leak test) and
  asserts `document` absent — the seam stays opt-in; DOM-free packages
  run under plain Node.
- **Watch**: initial `86 passed`; touched `Env/dom.ts` →
  `change detected, re-running…` → `86 passed`; SIGINT clean stop, no
  orphan.
- **Coverage** (`npm run coverage`):

  ```
  Statements :  95.09% (1703/1791)
  Branches   :  86.10% (161/187)
  Functions  :  94.39% (202/214)
  Lines      :  95.09% (1703/1791)
  Coverage gate passed (all four metrics > 85%)
  ```

  Matches the Constructor's reported 95.09 / 86.10. The seam source
  `Env/dom.ts` is itself covered at **97.14%** — the revised teardown
  logic is instrumented, not excluded. (Branch coverage dipped slightly,
  86.70→86.10, consistent with the seam now doing a tighter
  install-exactly/delete-exactly dance; still comfortably above the 85
  gate, and protection is intact.)

### Observations (per Critical Review Policy)

**O-1 — the leak test now covers the four globals it knows about; make
the "install-only-additions, delete-exactly-those" invariant the durable
guard, not the enumerated list.** The fix's strength is that teardown
deletes *exactly the keys it added* (`added.forEach(delete)`), which is
leak-proof for *any* happy-dom global, not just the four asserted. But
the test enumerates four names; if a future happy-dom version adds a new
own-global (e.g. another window alias), the symmetric add/delete would
still clean it up, yet the test would not explicitly prove it.

- **Proposal** (U3 nicety, non-blocking): consider one assertion that the
  *count* of happy-dom-introduced globals returns to its pre-DOM value
  after teardown (or that the `added` set is empty post-teardown), so the
  guard tracks the mechanism (delete-exactly-what-was-added) rather than
  a hand-maintained name list. The current four-name test is correct and
  sufficient for today; this just future-proofs it.

**O-2 (carried from my U1-dom review, still open for U3)** — the
`fixtures/` directory is loaded only via `runFile` and contains
intentional-failure fixtures; pointing discovery at it goes red by
design. Still worth a one-line "runFile-only; never add to discovery"
note or a `Discovery/find.ts` glob anchored to `src`, as a U3 hardening
item. Re-flagging so it is not lost.

## Review Notes

- **Decision: PASS — Approve with observations.** Self-suite 86/0/0; the
  extended leak test asserts `document`/`window`/`self`/`top` absent and
  passes; I proved by direct simulation that it goes red against the
  pre-fix teardown (genuinely catches the bug); the DOM fixture still
  yields 3/0 (no needed global removed); DOM-free path opt-in; watch
  runs/reacts/stops cleanly; coverage gate holds 95.09/86.10 with
  `Env/dom.ts` covered at 97.14%. Nothing red.
- Both observations are non-blocking U3 items with concrete proposals.
- The Architect's catch (window/self/top, missed by my original test) is
  fully addressed; my re-validation independently confirms both the fix
  and the test's bug-catching power.

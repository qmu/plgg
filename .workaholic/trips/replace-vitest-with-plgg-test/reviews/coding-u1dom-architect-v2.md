# Coding Re-Review — U1-dom (Architect, analytical) — v2

- **Reviewer**: Architect (structural / translation-fidelity lens)
- **Deliverable**: DOM-environment seam (`packages/plgg-test/src/Env/dom.ts` + Runner wiring) — REVISION
- **Commit**: ffb8811 (Constructor) — revises f29da9c
- **Prior review**: `reviews/coding-u1dom-architect.md` (Request revision — window leak)
- **Phase/Step**: coding / per-ticket re-review (analytical — no test execution)
- **Date**: 2026-06-24
- **Decision**: **Approve with observations.**

My round-1 blocker is **fully resolved**, and the fix is structurally
better than a patched save/restore. All three concerns (the leak, O1,
O2) are addressed, and I verified the two questions the lead raised
about the new approach — including the one genuine risk it introduces —
analytically. No `as`/`any`/`ts-ignore` in the revision (grepped — clean).

## 1. The window/self/top leak — RESOLVED, and the redesign is sound

The Constructor replaced the fragile save/copy/restore with
**install-only-absent-keys, delete-exactly-added**:
`getOwnPropertyNames(win).filter((key) => !(key in globalThis))`
installs only the genuine DOM additions, records them in `added`, and
teardown `Reflect.deleteProperty`s exactly that list. This is the right
model: there is **no prior-descriptor bookkeeping to corrupt** (the
entire class of bug my round-1 review found is structurally impossible
now), intrinsics like `Infinity`/`Array`/`globalThis` are never touched
(skipped because already present → no redefine-throw), and `window`/
`self`/`top` are *deleted* on teardown rather than re-defined.

**Verified end-to-end** (isolated Node mirroring dom.ts's exact logic —
not a plgg-test run):
```
before install:      window/self/top/document = false
during (installed):  window/self/top/document = true
after teardown:      window/self/top/document = false   ← no leak
```
The exact symptom I reproduced in round-1 (`window in globalThis === true`
after teardown) is gone.

**Extended leak test is a genuine regression guard.** `Runner.spec.ts`
now asserts `window`/`self`/`top` (not just `document`) are absent after
a DOM file precedes a no-DOM file. The lead confirms it is RED pre-fix /
GREEN post-fix, which is exactly the property that makes it a real
guard rather than a restatement. `globalThis` is correctly **not**
asserted — it is a permanent intrinsic self-reference (own-prop of the
real global), never installed and never removed, so asserting its
absence would be wrong. That distinction is reasoned correctly.

## 2. Does skip-if-present MISS a DOM global the specs need? — investigated; NO (with a caveat the E2E confirms)

This is the real risk the new rule introduces, and the lead flagged it
precisely. I checked it concretely against Node v23.9.0 + happy-dom for
the DOM globals the 4 specs actually use.

**Finding**: three globals happy-dom defines are **skipped** because Node
23 already defines them — `navigator`, `Event`, `CustomEvent` (also
`EventTarget`). All four specs use `new Event(...)` + `dispatchEvent(...)`
heavily, and `application.spec` uses `MouseEvent`. So the question is
whether the specs depend on *happy-dom's* event classes vs. *Node's*.

**Resolved in the implementation's favor**, verified by an isolated
interop probe (install-only-absent exactly as dom.ts does, then dispatch
a Node-global Event to a happy-dom element):
- **`MouseEvent` IS installed** — Node does **not** define `MouseEvent`,
  so it is an absent key and gets installed. `application.spec`'s
  `MouseEvent` usage resolves. (Likewise `PopStateEvent` is absent in
  Node → installed.) ✓
- **Node-global `Event`/`CustomEvent`/`EventTarget` interoperate with
  happy-dom elements** — dispatching `new Event("input")` (the Node
  global, since happy-dom's is skipped) to a happy-dom element fired the
  registered listener (`heard === true`). Node's `Event`/`EventTarget`
  are WHATWG-standard and happy-dom builds on the same `EventTarget`
  contract, so the skip is benign: the shared event classes are
  interchangeable, and the only DOM-specific one the corpus needs
  (`MouseEvent`) is absent-in-Node and therefore installed. ✓

So the skip-if-present rule does **not** strand any DOM global the specs
need: DOM-only classes (`document`, `window`, `HTMLElement`,
`MouseEvent`, `getComputedStyle`, `matchMedia`, `Node`, `Element`,
`customElements`, `location`, `history`, `requestAnimationFrame`) are
absent in Node and installed; the shared web-platform classes Node
already provides interoperate. This is the answer to the lead's "verify
the DOM the specs need is actually fully installed despite the skip"
question: it is.

**Observation O3 (the one residual, low risk)**: this conclusion is
Node-version-dependent. The set of web globals Node defines has grown
release to release (Node added `navigator`, `CustomEvent`, `structured
Clone`, the `Event` family over several majors). If a future Node adds,
say, `HTMLElement` or `matchMedia` as a stub global, the skip rule would
silently leave the Node stub in place instead of happy-dom's real
implementation, and a spec relying on the real one would fail in a
confusing way (present-but-inert, not absent). The current corpus is
safe on Node 23; the interop case (`Event`) even degrades gracefully.
- **Constructive proposal (non-blocking)**: add a one-line comment in
  `installHappyDom` noting the skip-if-present rule assumes Node's
  pre-existing web globals are *interop-compatible* with happy-dom (true
  for the `Event`/`EventTarget` family today), and that a future Node
  adding a DOM *element/style* global as a stub could require an
  explicit allow-list of keys to force-install. This documents the
  boundary so a future Node bump that breaks it is diagnosable. The
  Planner's E2E on the real specs is the empirical confirmation that
  today's set is sufficient — this comment just records *why* it works
  and when it might not.

## 3. `delete` fully removes each added global (no getter residue) — confirmed

The round-1 fragility note was that `self`/`top` are **getter**
descriptors on `GlobalWindow`. Under the new model that is a non-issue:
the seam copies happy-dom's own descriptor (getter and all) onto
`globalThis` via `defineProperty`, and teardown `Reflect.deleteProperty`
removes the property **wholesale** — a `delete` drops the entire
descriptor (data or accessor) in one operation, leaving no getter
residue. My end-to-end probe confirms `self`/`top` are gone (`in` →
false) after teardown, which a lingering getter would contradict. ✓

## 4. O1 (leading-comment scan) and O2 (dead branch) — both correctly addressed

**O1**: `environmentOf` now scans only `leadingComments(source)` — the
contiguous run of blank/`//` lines at the top, stopping at the first
code line. I verified the behavior across five cases:
- directive in the leading block → matched ✓
- directive **after** the first code line → not matched (`undefined`) ✓
- a directive-shaped substring inside a later **string literal** → not a
  false positive (`undefined`) ✓
- license banner + blank line before the directive → matched ✓
- no directive → `undefined` ✓

This closes the whole-file-scan false-positive surface and now matches
the "first-lines" doc and vitest's own top-of-file directive rule.

**O2**: the dead `match === undefined ||` branch is removed;
`environmentOf` returns `match === null ? undefined : match[1]`, which is
the correct nullish handling for `RegExp.exec`.

## 5. Unchanged-and-correct (carried from round-1)

The Runner wiring was already right in f29da9c and is untouched here:
install before `loadModule` (module-eval DOM), `try` wrapping both
`loadModule` and the now-`await`ed `runSuite` (test-body DOM), teardown
in `finally` (survives a load/suite throw), single install per
`runFile`. Teardown order (`happyDOM.close()` before detaching) and the
optional-peerDependency + lazy-import hygiene are unchanged and correct.
Fixtures still genuinely prove load-before-import.

## Decision rationale

The blocker is fixed by a redesign that makes the entire bug class
impossible rather than patching the one symptom, the regression test now
guards `window`/`self`/`top`, O1/O2 are cleanly resolved, and the one
real risk the new approach introduces (skip-if-present stranding a needed
DOM global) I investigated concretely and found benign for this corpus
on Node 23 — the only DOM-specific event class the specs need
(`MouseEvent`) is installed, and the shared `Event` family interoperates.
No escape hatches. This is **Approve with observations**: O3 is a
non-blocking documentation suggestion about the Node-version boundary,
not a defect. U1-dom is fit to unblock U2-example and U2-plgg-view.

## Review Notes

- No plgg-test suite execution (analytical mandate). The leak-fix
  verification and the Node-Event↔happy-dom interop probe were run as
  isolated Node snippets mirroring dom.ts's exact logic, to confirm the
  fix is real and the skip-rule is safe — not runs of the plgg-test
  suite. The Planner's E2E on the 4 real DOM specs is the empirical
  confirmation.
- Verified against commit ffb8811: 3 files, +67/-62; dom.ts reviewed in
  full, Runner.spec leak-test diff reviewed, happy-dom own-prop /
  Node-global sets and event interop verified empirically on Node
  v23.9.0.

# Round-1 Review — Constructor

- **Author**: Constructor
- **Phase/Step**: planning / one-turn review (round 1)
- **Date**: 2026-06-24
- **Artifacts reviewed**: `directions/direction-v1.md` (Planner),
  `models/model-v1.md` (Architect)
- **Lens**: engineering quality / production-readiness / build ownership

All counts below were re-verified by me against the real tree, because
the model and my own design-v1 disagreed on the long tail. The
ground-truth reconciliation is stated up front, since it changes the U1
ticket scope.

---

## Ground-truth reconciliation (the long-tail capability gaps)

I grepped the corpus directly to settle the disagreement between my
design-v1 (which flagged only `toBeGreaterThanOrEqual` as a gap) and the
model-v1 (which flagged `.rejects`/`toThrow`/`vi.mock`/skip-timeout).
Verdicts:

| Claim | model-v1 | my design-v1 | **verified truth** |
| --- | --- | --- | --- |
| `.rejects` sites | 11 | 0 | **0** — `grep -r '\.rejects'` returns nothing. The model's "11" is a substring miscount; there is no `.rejects` work. |
| `toThrow` sites | 3 | 0 (missed) | **3** — confirmed: `seam.spec.ts:74` `.toThrow()`, `bun.spec.ts:59` + `deno.spec.ts:63` `.not.toThrow()`. **The model is right; my design missed these.** |
| `vi.mock` sites | 1 | 0 (missed) | **1** — `generateObject.spec.ts:27` `vi.mock("plgg", …)`. **The model is right; my design missed this.** |
| `toBeGreaterThanOrEqual` | not separately flagged | 1 (R1) | **1** — `runFoundry.spec.ts:35`. Still a real gap. |
| skip + trailing timeout arg | "4 plgg-kit" | 0 (missed) | **10** — 6 in plgg-kit + 4 in plgg-foundry (`}, 20000)` / `30000` / `60000`), all on `test.skip` integration specs. **Both of us undercounted; the model found the category, I missed it entirely, and the real number is 10 across two packages.** |

So the genuine long-tail capability surface is **3 `toThrow` + 1
`vi.mock` + 1 `toBeGreaterThanOrEqual` + 10 skip-timeout-args**, NOT the
`.rejects` work the model implied. This is now folded into my refinement
plan (design-v2 action below), and it directly shapes U1.

I also discharged the **two pre-impl verifications the Architect owed
me** by reading the source myself (details under "Gating checks"):
`Core/Runner.ts` confirms a thrown/rejected body fails-not-crashes AND
that a body which does not RETURN an Assertion is failed (anti-false-
green). `Core/Registry.ts:117` confirms `test.skip` is strictly
`(name, fn) => void` — so the 10 timeout-args are real `tsc` errors.

---

## Artifact 1 — `directions/direction-v1.md` (Planner)

The direction is sound and its four success criteria are the right
outcome contract: (1) zero vitest references, (2) green under plgg-test
with coverage preserved file-for-file, (3) watch+coverage parity, (4)
contributor can write a test without reaching for vitest. From a
production-readiness lens these are testable and I can map every one to
concrete work (see "Success-criteria traceability" below).

**Concern 1 (production-readiness — criterion 1 is under-specified on
the `plgg` package).** Criterion 1 says "no package depends on,
configures, or imports vitest anywhere." That is the right bar, but the
already-migrated `plgg` package *today violates it*: it still lists
`vitest` + `@vitest/coverage-v8` in devDependencies and keeps a dead
`test:{coverage}` block + `/// <reference types="vitest" />` in its
`vite.config.ts`. The direction implies plgg is "done"; under criterion
1's own wording it is not. If this stays implicit, a reviewer could mark
the trip complete with vitest still declared in plgg.

*Constructive proposal*: make criterion 1 explicit that it includes
cleaning the already-migrated `plgg` package (devDeps + vite.config),
not only the 9. I have already scoped this as delivery unit U3 in
design-v1, so the work exists; the direction should name it so the
audit is unambiguous.

**Concern 2 (criterion 3 — "coverage preserved file-for-file" needs a
concrete mechanism, and parity is not uniform).** The criterion is
correct but coverage is not uniform across the 9: 6 packages carry real
vitest thresholds (fetch/router/server/sql/view = 91, http = 90) and 3
are ungated (example/foundry/kit, `all:true`/no threshold).
"File-for-file preservation" therefore has two distinct meanings
(re-gate the 6 at their numbers; keep the 3 ungated). There is also a
real drift risk: plgg-test uses V8 block-branch counting, which the
runner's own config comment documents as reading lower than vitest's
istanbul-normalized number (plgg-test gated itself at 85 for exactly
this reason).

*Constructive proposal*: restate criterion 3 as "each gated package
keeps a `plgg-test.config.json` at its original threshold; ungated
packages stay configless," and add the explicit fallback that if a
package's real plgg-test branch number lands below its historical
threshold, it is a documented ship-or-defer decision (lower the
threshold with a comment, as plgg-test did at 85) — never silently
exclude files to hit a number. This keeps "preserved protection"
honest.

**Trade-off worth naming (DX, criterion 4).** Criterion 4 ("a new test
is as natural to write") is a genuine trade-off, not a pure win: the
data-last `check(x, toBe(y))` idiom is more verbose than fluent
`expect(x).toBe(y)` for the common case, and the `toThrow`/`vi.mock`
rewrites are strictly harder to author than their vitest forms. The
direction frames criterion 4 as "path of least resistance," which is
achievable for the 99% matcher cases but not literally true for the
handful of try/return and DI-redesign cases.

*Constructive proposal*: keep criterion 4 but scope it to "the common
assertion cases"; for the long tail, the win is consistency/sovereignty,
not lower authoring effort. Documenting the `toThrow`/DI patterns (a
short authoring note) is the mitigation that keeps the idiom
discoverable.

### Decision — Artifact 1: **Approve with minor suggestions**

The direction is approved. The three suggestions (name plgg-cleanup in
criterion 1; make the gated/ungated coverage mechanism + drift-fallback
explicit in criterion 3; scope criterion 4's "natural" to common cases)
are wording refinements that make the outcome contract auditable; none
blocks planning.

---

## Artifact 2 — `models/model-v1.md` (Architect)

This is a strong structural model and it did the repo the service of
surfacing the long tail my design-v1 under-weighted (`toThrow`,
`vi.mock`, the skip-timeout category). The resolver-boundary analysis
(§4) is the most valuable part: it retires the a-priori-highest risk by
proving all 9 tsconfigs follow the `"<name>*": ["./src/*"]` convention
`deriveAliases` already handles. I verified that convention independently
and agree it is retired. The component taxonomy (§5) and the "scripts
need zero edits" finding match my design exactly.

**Concern 1 (factual — the `.rejects` count is wrong and would mis-size
U1).** §2/§3-#2 assert "11 `.rejects` sites" and bundle them with
`toThrow` into "14 sites" of try/catch work. A direct
`grep -r '\.rejects' packages --include=*.spec.ts` returns **zero**. The
real long-tail throw surface is **3 `toThrow` sites only** (two of which
are `.not.toThrow()`). If the ticket is sized for "14 hand-written
try/catch blocks," it is over-scoped by ~11 and may justify a
`rejects` refinement that nothing needs.

*Constructive proposal*: correct the count to 3 `toThrow` sites, drop
the `.rejects` line, and re-evaluate the proposed `rejects`/`toThrow`
refinement against the smaller real number (my recommendation under my
refinement plan below: hand-rewrite the 3, do NOT add a `rejects` API).

**Concern 2 (production-readiness — the `toThrow` rewrite must RETURN an
assertion, which the model's "try/catch → check" sketch omits).** I read
`Core/Runner.ts:253-260`: the runner FAILS any body that does not RETURN
a branded Assertion (the anti-false-green guard). So the model's
suggested shape `try { … } catch { check(threw, toBe(true)) }` would
fail even on success, because the `check` result is computed and
dropped, not returned. The correct shape must capture the throw and
`return` the assertion, e.g.

```ts
test("toFetchRequest throws on a malformed URL", () => {
  const threw = ((): boolean => {
    try { toFetchRequest(baseRequest({ path: "not a url" })); return false; }
    catch { return true; }
  })();
  return check(threw, toBe(true));
});
```

and `.not.toThrow()` is the inverse (`return check(threw, toBe(false))`,
or run the body and `return check(true, toBe(true))` after it completes
without throwing). This is a small per-site rewrite, but the "must
return" constraint is load-bearing and should be stated so the rewrite
isn't authored as a side-effecting `check`.

*Constructive proposal*: add the "body must RETURN the assertion" rule
explicitly to the §3-#2 pattern (and to my design-v2). It applies to
every async `.resolves` rewrite too: `return check(await p, toBe(y))`,
not a bare `check(await p, …)`.

**Concern 3 (the skip-timeout count is 10, not 4, and spans two
packages).** §5-(d)(1) says "4 plgg-kit `.spec.ts` files call
`test.skip(name, fn, 20000)`." Verified reality: **10 sites** —
6 in plgg-kit (`20000`) and **4 in plgg-foundry** (`30000`/`60000`,
in blueprint/runFoundry/ProfileFoundry/TodoFoundry). All are on
`test.skip` integration specs. The model under-scoped this to one
package; plgg-foundry's tickets must include the same drop-the-arg edit.
I confirmed `test.skip`'s signature is strictly `(name, fn)`
(`Registry.ts:117`), so all 10 are real `tsc --noEmit` errors that block
the package's test script.

*Constructive proposal*: correct to "10 sites across plgg-kit and
plgg-foundry," and adopt the model's own recommendation (drop the
trailing timeout arg in the rewrite; no signature widening of
plgg-test). I agree — these are `.skip`ped live-network tests where the
timeout is inert, so dropping it is faithful and needs no API change.

**Concern 4 (`vi.mock` DI redesign — agree it's out of scope for a
matcher, but the model should name the no-`as` constraint on the
redesign).** §3-#5 correctly identifies `generateObject.spec.ts`'s
`vi.mock("plgg", …)` as a test-redesign-to-DI, the single highest-effort
file. My only addition: the DI rewrite must land WITHOUT an `as`/`any`
escape hatch. The existing migrated `plgg` specs reached for
`as unknown as typeof fetch` in their fetch-mock seam — that pattern
must NOT be copied here; the seam should be injected with a real typed
parameter so the three vendor-envelope decodes run offline with no cast.

*Constructive proposal*: annotate §3-#5 (and the U1/kit ticket) with the
hard constraint "DI seam injected via a typed parameter, no `as`/`any`,"
and confirm the production `generateObject` actually exposes an
injectable seam before committing the kit ticket — if it does not, that
is a small production change that must be surfaced, not worked around
with a cast.

### Decision — Artifact 2: **Request revision**

The model is excellent structurally and I am adopting most of it, but two
of its numbers are wrong in ways that would mis-size the U1 ticket and
could justify an unnecessary plgg-test refinement: the `.rejects` count
(11 → **0**) and the skip-timeout count (4/one-package → **10/two
packages**). Please correct these two counts, drop the `rejects`
refinement candidate (nothing needs it), and add the "body must RETURN
the assertion" constraint to the `toThrow`/`.resolves` patterns. With
those three corrections the model is approve-ready; the structural
analysis itself needs no change.

---

## Gating checks I am taking into U1 (the two verifications the Architect
owed me — discharged)

I read the source rather than wait, and I want both as **explicit U1
entry gates before any per-package migration starts**:

1. **Runner fails-not-crashes on a thrown/rejected body — CONFIRMED.**
   `Core/Runner.ts:202-268`: the body runs in a try/catch inside an
   unhandled-rejection window; a throw or rejected promise folds to a
   fail. So `return check(await p, toBe(y))` is faithful on both the
   happy and the rejection path. The model's §3-#1 "highest semantic
   risk" is **retired**. Keep as a U1 gate only as a one-line
   regression assertion (a spec that a throwing body reports fail), not
   as open risk.

2. **`deepEqual` vs vitest `toEqual` on Box-tagged Option/Result —
   STILL OWED, keep as a hard U1 gate.** I have NOT yet confirmed
   `Expect/equals.ts` matches vitest `toEqual` on class instances,
   nested `Box`-tagged Option/Result, `Map`/`Set`, and the
   `undefined`-vs-absent distinction. With 81 `toEqual` sites (my count;
   the model's 170 is a substring count), a divergence is a silent
   false-green/false-red. **I want this pinned by reading
   `Expect/equals.spec.ts` + a targeted parity spec as the FIRST act of
   U1, gating the bulk rewrite.** This is the one genuinely open
   fidelity risk and I am treating it as blocking.

3. **(Added by me) anti-false-green RETURN guard — CONFIRMED and adopted
   as a review rule.** Because the runner fails any body that doesn't
   RETURN an Assertion, every rewritten body must `return` its
   `check(...)`/`all([...])`. I will add a grep gate to U1's QA:
   no rewritten `test(` body may contain a `check(`/`all(` that is a
   bare statement rather than returned (caught structurally during
   review + by the runner itself going red).

---

## Folding into my refinement plan (design-v2 actions)

design-v1's refinement plan listed only R1 (`toBeGreaterThanOrEqual`)
and R2 (per-package coverage configs). Reconciled, the corrected
refinement plan is:

- **R1 — add `toBeGreaterThanOrEqual` (1 site): KEEP.** Minimal faithful
  matcher addition.
- **R2 — per-package `plgg-test.config.json` for the 6 gated packages:
  KEEP** (config files only, no code change).
- **R3 — NEW: hand-rewrite the 3 `toThrow` sites to try/return-boolean +
  `check` (no new matcher).** I considered a `toThrow` matcher
  (the model's candidate) but with only 3 sites — and the runner's
  RETURN-guard making the pattern a clean 6-line helper — a matcher is
  not justified. **Decision: hand-rewrite, no plgg-test API addition.**
  (If review prefers symmetry, a tiny local `didThrow(() => …): boolean`
  test helper is acceptable; still no runner change.)
- **R4 — NEW: drop the trailing timeout arg at all 10 `test.skip` sites
  (6 kit + 4 foundry).** No plgg-test signature change (the model's
  recommended option; I concur). Faithful because these are `.skip`ped
  live-network tests.
- **R5 — NEW: `vi.mock` → DI redesign in `generateObject.spec.ts`, with
  a typed injected seam and NO `as`/`any`.** Out of scope for any
  plgg-test API; it is a single-file test redesign. Gate: confirm the
  production seam is injectable first.
- **R6 — DROP: no `.rejects`/`rejects` refinement.** Zero sites; nothing
  to support.

R3/R4/R5 are per-package work (they live in the plgg-foundry and
plgg-kit U2 tickets), not in the plgg-test refinement ticket. So U1
(the plgg-test refinement ticket) carries only R1 + the two gating
verifications; R2 lands per-package; R3/R4/R5 are package-local rewrites.

---

## Success-criteria traceability (Direction → my delivery plan)

Confirming all four direction success criteria are concrete, testable
work in design-v1's delivery plan:

| Direction criterion | Concrete, testable work | Where |
| --- | --- | --- |
| 1. Zero vitest refs (incl. plgg) | grep gates (`from "vitest"`, devDeps, `reference types="vitest"`, dead `test:` block) = 0; plgg cleanup | U3 + QA grep gates |
| 2. Green + coverage file-for-file | per-package `test-<pkg>.sh` green; `plgg-test.config.json` re-gates the 6 at original numbers; 3 stay ungated; drift→documented ship-or-defer | U2 (per pkg) + R2 |
| 3. Watch + coverage parity | run `test-watch-<pkg>.sh` + `coverage` per package; CLI already parses `--watch`/`--coverage` | U2 per-package verify |
| 4. New test without vitest | data-last idiom for the 99% matcher cases; authoring note for `toThrow`/DI long tail | U2 + a short docs note |

All four map to concrete work. The only addition the reconciliation
forces is the authoring note for the long-tail patterns (criterion 4)
and the explicit drift-fallback (criterion 2).

---

## Net verdicts

- **Direction-v1: Approve with minor suggestions** — three wording
  refinements (plgg in criterion 1; gated/ungated + drift mechanism in
  criterion 3; scope "natural" to common cases in criterion 4).
- **Model-v1: Request revision** — correct `.rejects` (11→0) and
  skip-timeout (4/one-pkg→10/two-pkg) counts, drop the `rejects`
  refinement candidate, add the "body must RETURN the assertion"
  constraint to the `toThrow`/`.resolves` patterns. Structural analysis
  is otherwise adopted wholesale.
- **My own design-v1** owes a design-v2 update folding in R3/R4/R5/R6 and
  the two U1 gating checks — I will make that edit when the planning
  loop calls for revised artifacts.

# Round 1 Review — Architect

- **Reviewer**: Architect (structural / translation-fidelity lens)
- **Phase/Step**: planning / one-turn review (round 1)
- **Date**: 2026-06-24
- **Artifacts reviewed**: `directions/direction-v1.md` (Planner),
  `designs/design-v1.md` (Constructor)

All counts below were re-verified against the working tree during this
review (not carried from model-v1). Where my model-v1 and the design
disagreed, I re-ran the exact greps and **inspected the matching
lines** to settle each discrepancy; the reconciliation is recorded so
the team can trust one number.

---

## Reconciliation of the model-v1 vs. design-v1 count conflict

My model-v1 reported `.rejects` = 11 and `toThrow` = 3; design-v1
reports `.rejects` = 0 and omits `toThrow`. I inspected every match:

- **`.rejects` = 0 — the Constructor is correct; my model-v1 was
  wrong.** All 11 "rejects" tokens are the English word inside
  `test("… rejects …")` names and comments (e.g.
  `Method.spec.ts:9 test("isMethod … rejects others")`,
  `element.spec.ts:152 // exactly-one rejects two`). **Not one** is the
  vitest `.rejects` matcher. I withdraw the model-v1 `.rejects` finding;
  the design's "0" stands.
- **`toThrow` = 3 — confirmed real, and the design omits all three.**
  `plgg-server/src/bun.spec.ts:59` and `deno.spec.ts:63` use
  `.not.toThrow()`; `plgg-fetch/.../seam.spec.ts:74` uses `.toThrow()`.
  These are genuine vitest matcher calls with no plgg-test equivalent.

So the net correction is: my `.rejects` alarm was a false positive
(good — less work), but a **smaller, real gap (`toThrow`, 3 sites)
survives and is unaddressed by the design**. This sharpens, rather than
dissolves, the structural concern.

---

## Direction v1 (Planner) — decision: **Approve with minor suggestions**

The direction is coherent and correctly frames the migration as the
tooling-level expression of the project's "no escape hatch" principle.
Its four success criteria are auditable and the right ones (sovereignty,
file-for-file protection, watch/coverage parity, contributor ergonomics).
Criterion 4 — "refining `plgg-test` is in scope and is itself a win" —
is exactly the structural posture this migration needs, because the
genuine gaps (below) should be closed by *raising the runner*, not by
bending tests around it.

**Concern / trade-off (one, as required): Criterion 1 ("zero vitest
references remain") and Criterion 2 ("coverage preserved file-for-file")
can pull against each other, and the direction doesn't name the
tie-breaker.** plgg-test measures coverage with V8 block-branch
counting, which reads *lower* than vitest's istanbul-normalized numbers
(the design's R-risk "threshold drift" documents this; plgg-test itself
lowered its own gate from 91→85 for the same reason). So a package
honestly migrated to plgg-test may report, say, 87% branch where vitest
said 91% — with no real loss of protection, just a different ruler. A
maintainer auditing Criterion 2 literally ("the number must not drop")
would read that as a regression, when it is a measurement-basis change.

- **Constructive proposal**: add one sentence to Criterion 2 (or
  Business Risk) distinguishing *protection* (which assertions/branches
  are exercised — must be preserved file-for-file) from *the reported
  percentage* (which legitimately shifts with the V8 ruler). State that
  a documented threshold adjustment accompanying a measurement-basis
  change satisfies the criterion, whereas silently excluding files to
  hit an old number does not. This keeps Criterion 1's "zero vitest"
  absolutism from forcing a false coverage-regression verdict.

The direction otherwise needs no revision; its outcome framing is sound
and the success criteria are checkable by a non-coder.

---

## Design v1 (Constructor) — decision: **Request revision**

The design is strong on the bulk of the work: its inventory of the
closed matcher surface, the per-package script/devDep/vite.config swaps,
the verified "shell scripts need no change," the verified "no root
vitest config," the R2 per-package `plgg-test.config.json` coverage
story, and the leaf-first U1→U2→U3 sequence are all accurate and
well-grounded. The coverage-gating insight (6 gated / 3 ungated, with
config files only for the gated 6) is a genuine improvement over both
the lead's survey and my model. I want to approve it — but it
**under-scopes three structural gaps that will surface mid-migration as
hard compile/parity failures**, exactly the "capability gaps surfacing
late" risk the Direction names as the thing to retire up front. Each is
small, but each blocks a specific package, and none appears anywhere in
the design (verified: a grep of the design for `vi.mock`, `toThrow`,
`timeout`, `20000`, `.skip` returns nothing).

### Gap 1 (BLOCKER — plgg-kit) — `vi.mock` backs 4 LIVE tests, with no migration path

`plgg-kit/src/LLMs/usecase/generateObject.spec.ts:27` calls
`vi.mock("plgg", async (importOriginal) => …)` to stub plgg's
`postJson` network seam. This is **not** a skipped test scaffold — it
backs **four live, non-skipped tests** (lines 80/99/117/135: the OpenAI,
Anthropic, Google offline-envelope decodes and the env-apiKey path). The
entire offline test path of `generateObject` depends on it.

plgg-test **deliberately does not implement `vi.mock`** (its
`Mock/vi.ts` header documents this as Plan Amendment 2: the one spec
that used it is to be migrated to dependency injection instead). The
design's matcher table (1b) and recipe (Section 2) silently assume every
plgg-kit spec is a mechanical `expect→check` rewrite. It is not: this
file requires a **test redesign** — inject the `postJson`/HTTP seam into
`generateObject` (or its caller) so the canned vendor responses are
passed in, rather than module-mocked. That is design work, not a leaf
edit, and it may touch `generateObject`'s signature or a seam parameter.

- **Constructive proposal**: add an explicit work-item to the plgg-kit
  unit (U2): "Redesign `generateObject.spec.ts` from `vi.mock` to
  dependency injection — verify `generateObject` already accepts (or add
  a seam parameter for) the `postJson` dependency, pass the three
  vendor-envelope canned responses through it, and keep all four
  offline tests green." Call out that this is the single non-mechanical
  file in the corpus and size the plgg-kit ticket accordingly (it is no
  longer "5 mechanical specs"). Faithfulness bar: the same three vendor
  envelopes must still be exercised offline; the migration must not
  weaken these to skips.

### Gap 2 (BLOCKER — plgg-server, plgg-fetch) — `toThrow` (3 sites) has no plgg-test matcher

`toThrow`/`.not.toThrow()` is used at `bun.spec.ts:59`,
`deno.spec.ts:63` (both `.not.toThrow()`) and `seam.spec.ts:74`
(`.toThrow()`). plgg-test has **no `toThrow` matcher** (confirmed by
reading `Matchers/matchers.ts` — the exception-assertion shape does not
exist). The design's table 1b has no row for it and its refinement plan
(Section 3) does not list it, so these three sites have no defined
rewrite and will block plgg-server and plgg-fetch.

- **Constructive proposal**: choose one and write it into Section 2 +
  Section 3, mirroring the design's own R1 reasoning:
  - *(preferred, structural)* Add a small `toThrow` capability to
    plgg-test. Because the runner is expression-style (a body returns an
    `Assertion`, never throws to signal pass/fail), the faithful shape is
    a helper that **runs the thunk inside a try/catch and returns a
    `pass`/`fail` Assertion** — e.g. `throws(() => f())` and its
    negation via the existing `not(...)`. This keeps the 3 sites
    near-mechanical and raises the published runner (Direction
    Criterion 4). It is the same "add the matcher" call the design
    already made for R1 (`toBeGreaterThanOrEqual`).
  - *(fallback, per-site)* Hand-rewrite each as an explicit
    `try { f(); } catch { … }` capturing a boolean `threw`, then
    `check(threw, toBe(true|false))`. Faithful but 3 bespoke blocks; the
    `.not.toThrow()` sites must assert `threw === false`.
  Recommend the helper (it is the structurally consistent choice and
  the corpus may grow more such sites). Either way, name it explicitly —
  the design currently leaves these 3 sites undefined.

### Gap 3 (BLOCKER — plgg-kit, plgg-foundry) — `test.skip(name, fn, timeout)` 3rd arg won't typecheck

**10 sites** pass a third positional timeout argument to a skipped test:
`generateObject.spec.ts` (×3, `}, 20000)`), `Google/OpenAI/Anthropic`
vendor specs (×3, `}, 20000)`), and `plgg-foundry`
`runFoundry`/`blueprint`/`TodoFoundry`/`ProfileFoundry` (×4, `}, 30000)`
/ `}, 60000)`). All ten are on `test.skip(...)`. plgg-test's Registry
types `test.skip` as `(name: string, fn: TestBody) => void` — a **third
argument is a `tsc --noEmit` compile error (TS2554)**, and `tsc --noEmit`
runs *before* `plgg-test src` in the very `test` script the design
adopts. So every one of these 10 files fails the typecheck gate on the
first migration attempt. The design does not mention this.

- **Constructive proposal**: the cleanest fix is to **drop the timeout
  arg during the rewrite** — these are `.skip`ped live-integration tests
  where a per-test timeout is inert anyway, so removing `, 20000` /
  `, 30000` / `, 60000` loses nothing. Add a line to Section 2's recipe:
  "When migrating a `test.skip(name, fn, <timeout>)` call, drop the
  trailing timeout argument; plgg-test's `test.skip` is `(name, fn)` and
  the skipped body never runs." (A signature-widening refinement to
  accept-and-ignore a trailing number is the alternative, but it adds
  runner surface to support dead args — not worth it. Recommend the
  drop.) Either way this must be named, or U2's plgg-kit and
  plgg-foundry tickets red-fail on `tsc`.

### Secondary concern (MINOR) — pre-implementation verifications not scheduled as gates

I owed the Constructor two cheap, high-value checks; the design folds
them into general risk notes but does not schedule them as **gating
steps before the per-package rewrites**:

1. **Runner throws-handling** underpins the `.resolves` →
   `check(await p, …)` rewrite (24 sites). The design's "Async semantic
   drift (LOW)" risk asserts the await form is faithful "since
   `.rejects` is 0" — which my reconciliation confirms is true, so the
   happy-path equivalence holds. But the rewrite still relies on the
   runner **failing rather than crashing** if an awaited promise ever
   rejects unexpectedly; that property should be confirmed against
   `Core/Runner.ts` once, up front, not assumed.
2. **`deepEqual` vs. vitest `toEqual` parity on Box-tagged
   Option/Result and class instances** underpins 81 `toEqual` sites. The
   design lists `toEqual`→`check(x, toEqual(y))` as exactly-parity but
   never pins `deepEqual`'s behavior on plgg's tagged values — a silent
   divergence there is a false-green/false-red across 81 sites.

- **Constructive proposal**: add a **U0 gate** (or a first checklist
  item inside U1) — "Confirm `Core/Runner.ts` reports a thrown/rejected
  test body as a failure (not a crash); confirm `Expect/equals.spec.ts`
  covers `deepEqual` on nested Option/Result `Box` values and class
  instances, matching vitest `toEqual`. Both must pass before any U2
  package migration begins." These are read-only confirmations; making
  them explicit gates costs minutes and de-risks 105 sites.

### Why "Request revision" and not "Approve with observations"

The delivery plan's structure (U1 refinement → U2 leaf-first per-package
→ U3 cleanup) is sound and **does** structurally serve the Direction's
intent — it is cleanly decomposable into per-package tickets, respects
the `file:` build-order dependency, and leaves the repo green per unit.
I would approve the *shape* outright. The revision request is narrowly
about **three named capability gaps the design currently treats as
mechanical** (`vi.mock` DI redesign, `toThrow`, the `test.skip` timeout
arg). Each will halt a specific U2 ticket the moment it is attempted —
precisely the "capability gap surfacing late" failure the Direction asks
us to retire in planning. They are individually small; surfacing them
now (with the proposals above) converts three mid-migration ambushes
into three pre-scoped checklist items. Once Section 2/3 and the plgg-kit
ticket sizing absorb these, this design is ready to drive.

---

## Summary of decisions

| Artifact | Decision |
| --- | --- |
| direction-v1.md (Planner) | **Approve with minor suggestions** (protection-vs-percentage wording on Criterion 2) |
| design-v1.md (Constructor) | **Request revision** (3 unscoped capability gaps: `vi.mock` DI / `toThrow` / `test.skip` timeout arg; + schedule the 2 pre-impl verifications as gates) |

All proposals above are additive to an already-solid design — none
requires re-architecting the U1→U2→U3 plan.

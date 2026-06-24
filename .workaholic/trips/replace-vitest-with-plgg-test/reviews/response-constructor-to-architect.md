# Response — Constructor to Architect (round 1)

- **Author**: Constructor
- **Re**: `models/model-v1.md` review feedback on `designs/design-v1.md`
- **Disposition**: **Accept and revise** → see `designs/design-v2.md`

I accept the structural findings and the long-tail capabilities you
surfaced that my design-v1 under-weighted. After the team's shared
re-grep there is no remaining disagreement; the two count corrections I
raised in my round-1 review are folded in below as agreed facts, not
open disputes.

- **`toThrow` = 3 (you were right; my design-v1 missed them).**
  Accepted: `seam.spec.ts:74` `.toThrow()`, `bun.spec.ts:59` +
  `deno.spec.ts:63` `.not.toThrow()`. design-v2 **R3** hand-rewrites
  these to existing API with **no new matcher**, applying the "body must
  RETURN the assertion" constraint from `Core/Runner.ts` (a
  side-effecting `check()` inside try/catch reads *fail* even on success
  because the runner fails any body that does not return a branded
  Assertion).

- **`vi.mock` = 1 (you were right; my design-v1 missed it).** Accepted:
  `generateObject.spec.ts:27` `vi.mock("plgg", …)`. design-v2 **R5**
  redesigns it to a typed dependency-injection seam (the offline
  `generateObject` path, 4 live tests) with **no `as`, no `any`, no
  `ts-ignore`** — and gates on first confirming the production seam is
  injectable rather than reaching for a cast.

- **skip-timeout signature gap.** Accepted *and widened*: the count is
  **10**, not 4 — 6 in plgg-kit + 4 in plgg-foundry
  (`}, 20000/30000/60000)`), all on `test.skip`. design-v2 **R4** drops
  the trailing timeout arg at all 10 sites (fixes the TS2554 `tsc`
  raises before plgg-test runs), with no signature change to plgg-test.

- **The two pre-impl gates you owed me.** Discharged: I read the source.
  *Runner-fails-not-crashes* on a thrown/rejected body is **CONFIRMED**
  (`Runner.ts:202-268`, try/catch + rejection window) — recorded as
  done, your §3-#1 "highest semantic risk" is retired. *`deepEqual` vs
  vitest `toEqual` on Box-tagged Option/Result* is **still genuinely
  open** — design-v2 schedules it as a **hard U1 entry gate** (read
  `Expect/equals.spec.ts` + a targeted parity spec) before any bulk
  per-package rewrite.

- **`.rejects` correction.** As you'll have seen in my round-1 review,
  the model's `.rejects` = 11 is a substring miscount; the real count is
  **0**. design-v2 **R6** drops the `rejects` refinement candidate.

Your resolver-boundary analysis (§4) is adopted wholesale — it retires
the a-priori-highest structural risk by proving all 9 tsconfigs follow
the `deriveAliases`-handled convention, and I confirmed it independently.
design-v2 carries it forward unchanged. `Reviewed-by` credits you. Thank
you for surfacing the `toThrow`/`vi.mock`/skip-timeout long tail my
design had missed.

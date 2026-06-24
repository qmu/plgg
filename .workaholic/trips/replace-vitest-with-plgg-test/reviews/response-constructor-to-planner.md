# Response — Constructor to Planner (round 1)

- **Author**: Constructor
- **Re**: `directions/direction-v1.md` review feedback on `designs/design-v1.md`
- **Disposition**: **Accept and revise** → see `designs/design-v2.md`

I accept all three of your concerns; none is contested, and the team has
re-grepped to the same reconciled facts.

- **C-1 (the error-path count conflict).** Accepted. I independently
  re-grepped: `.rejects` = **0** (the "14"/"11" figure was a substring
  miscount), real long-tail throw surface = **3** `toThrow`/
  `.not.toThrow()` sites only. design-v2 folds this in as **R3**
  (hand-rewrite the 3 sites, no new matcher) and **R6** (drop the
  `.rejects` refinement entirely — nothing needs it).

- **C-2 (coverage-threshold parity).** Accepted. design-v2 §"Coverage
  parity rule" states it explicitly: the 6 gated packages get a
  `plgg-test.config.json` at their *original* threshold
  (fetch/router/server/sql/view = 91, http = 90); the 3 ungated stay
  configless. A gate may be lowered **only** to the measured plgg-test
  (V8) number, **only** with a one-line istanbul-vs-V8 rationale,
  **never** by excluding files to hit a number — and each lowered gate
  becomes an explicit ship-or-defer line item. This is **R2**.

- **C-3 (watch + coverage in definition-of-done).** Accepted. design-v2
  adds a per-package definition-of-done: a package ships green only
  after a watch-mode confirmation and (if gated) a coverage-run
  confirmation — not merely a passing single run.

design-v2 is the authoritative plan. I have marked your name under
`Reviewed-by`. Thank you for catching the parity-mechanism gap in
criterion 3; it materially de-risks the "coverage preserved
file-for-file" promise.

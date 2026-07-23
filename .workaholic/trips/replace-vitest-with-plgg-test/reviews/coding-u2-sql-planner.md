# Coding Review — U2 plgg-sql (Planner E2E / External Validation)

- **Reviewer**: Planner (Coding-Phase QA: E2E / external CLI execution)
- **Ticket**: U2 — migrate `plgg-sql` from vitest to plgg-test (4 specs,
  standard recipe, gated 91)
- **Implementation under test**: Constructor commit `75f1f57`
- **Status**: validated
- **Decision**: **PASS — Approve with one observation**

## Content

All validation via the runner CLI (plgg-test + plgg-sql rebuilt first).
Standard gated-91 recipe.

### 1. Green single run — PASS

`bash scripts/test-plgg-sql.sh` → `25 passed, 0 failed, 0 skipped` —
matches the vitest baseline of **25** exactly. No test lost; plgg-test
output format confirms the runner swapped.

### 2. Watch-mode — PASS

`npm run test:watch`: initial `25 passed`, touched
`src/Mapping/usecase/decodeRows.spec.ts` → `change detected,
re-running…` → `25 passed`, SIGINT clean stop, no orphan.

### 3. Coverage gate at 91 — PASS, proven genuinely enforced
(non-interactively)

`npm run coverage`:

```
Statements : 100.00% (198/198)
Branches   : 100.00% (14/14)
Functions  :  96.97% (32/33)
Lines      : 100.00% (198/198)
Coverage gate passed (all four metrics > 91%)
```

Matches the Constructor's report exactly (100 / 100 / 96.97 / 100), all
above the 91 gate — **no drift, no ship-or-defer**.

Enforcement probe (non-interactive, per my established discipline): wrote
threshold 101 via a `node` edit, ran coverage → `Coverage gate FAILED
(need all four > 101%)`, exit **non-zero (1)**; restored to 91 via
`git checkout`; working tree clean. The 91 gate is live and the probe
left no residue. `exclude: ["/index.ts"]` is the same legitimate
pure-barrel exclusion as the other gated packages.

### 4. Vitest-free — PASS

`grep -rn vitest packages/plgg-sql/{src,package.json,vite.config.ts}` →
empty. Scripts swapped to `plgg-test src` (+ watch/coverage), devDeps
dropped vitest/@vitest/coverage-v8, vite.config vitest block gone.

### Observation (per Critical Review Policy) — functions at 96.97%
(32/33) means one function is uncovered; confirm it is benign

As with plgg-router, the gate passes comfortably but with one uncovered
function (32 of 33). This is well above 91 and not a regression, but
"passes the gate" is not "we know what is uncovered."

- **Proposal** (non-blocking): a one-line confirmation from the
  Constructor/Architect of *which* function is uncovered and that it is a
  benign/defensive path (vs. a genuinely untested code path) would close
  the loop. Not a blocker — the gate's purpose (hold 91) is satisfied and
  statements/branches/lines are all 100%.

(Per the lead's note, I am intentionally NOT flagging the two documented
adversarial casts in `Sql.spec` — the developer ruled to keep them, and
they are out of my E2E scope.)

## Review Notes

- **Decision: PASS — Approve with one observation.** Single run 25/0/0
  (exact baseline), watch runs/reacts/stops cleanly, coverage
  100/100/96.97/100 with the 91 gate proven genuinely enforced
  (non-interactive probe, restored clean), vitest-free. Nothing red.
- Third consecutive gated package to pass with zero drift / no
  ship-or-defer — the gated recipe is proving reliable.
- The one observation (benign-uncovered-function confirmation) is
  non-blocking; the recurring U3 exclude roll-up now also includes
  plgg-sql's `/index.ts`.

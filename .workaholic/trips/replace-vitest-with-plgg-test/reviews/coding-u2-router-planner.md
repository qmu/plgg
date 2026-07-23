# Coding Review — U2 plgg-router (Planner E2E / External Validation)

- **Reviewer**: Planner (Coding-Phase QA: E2E / external CLI execution)
- **Ticket**: U2 — migrate `plgg-router` from vitest to plgg-test
  (8 specs, standard recipe, gated 91)
- **Implementation under test**: Constructor commit `14c44d5`
- **Status**: validated
- **Decision**: **PASS — Approve with observations**

## Content

All validation via the runner CLI (plgg-test + plgg-router rebuilt
first). Standard gated-91 recipe.

### 1. Green single run — PASS

`bash scripts/test-plgg-router.sh` → `39 passed, 0 failed, 0 skipped` —
matches the vitest baseline of **39** exactly. No test lost; plgg-test
output format confirms the runner swapped.

### 2. Watch-mode — PASS

`npm run test:watch`: initial `39 passed`, touched
`src/Routing/model/Location.spec.ts` → `change detected, re-running…` →
`39 passed`, SIGINT clean stop, no orphan.

### 3. Coverage gate at 91 — PASS, and proven genuinely enforced
(non-interactively)

`npm run coverage`:

```
Statements : 100.00% (286/286)
Branches   :  97.44% (38/39)
Functions  :  98.11% (52/53)
Lines      : 100.00% (286/286)
Coverage gate passed (all four metrics > 91%)
```

Matches the Constructor's report exactly (100 / 97.44 / 98.11 / 100), all
above the 91 gate — **no drift, no ship-or-defer**.

Applying my refined enforcement-probe discipline (O-1 from the plgg-http
review — never mutate the committed config interactively): I wrote
threshold 101 via a non-interactive `node` edit, ran coverage, and got an
explicit failure — `Coverage gate FAILED (need all four > 101%)`, exit
**non-zero (1)**. I then restored the committed file to 91 via
`git checkout` (authoritative, no interactive prompt) and confirmed the
working tree is clean. So the 91 gate is genuinely live, and my probe
left zero residue this time. The `exclude: ["/index.ts"]` is the same
legitimate one-line re-export barrel pattern (no coverable logic).

### 4. Vitest-free — PASS

`grep -rn vitest packages/plgg-router/{src,package.json,vite.config.ts}`
→ empty. Scripts swapped to `plgg-test src` (+ watch/coverage), devDeps
dropped vitest/@vitest/coverage-v8, vite.config vitest block gone.

### Observations (per Critical Review Policy)

**O-1 — the 91 gate passes with one uncovered branch and one uncovered
function (38/39, 52/53); worth a glance that the miss is benign, not a
silently-tolerated gap.** Branches sit at 97.44% (1 of 39 uncovered) and
functions at 98.11% (1 of 53 uncovered). The package clears the 91 gate
comfortably, so this is not a regression — but "passes the gate" is not
the same as "we know what is uncovered." For a routing library, an
uncovered branch could be a benign defensive arm or a real untested path.

- **Proposal** (non-blocking): not a gate concern — the package is well
  above 91 and ships as-is. As a low-priority quality note for the
  Constructor/Architect, a one-line confirmation of *which* branch and
  function are uncovered (defensive fallback vs. a real path) would close
  the loop; if it is a defensive arm, no action. I am not blocking on it
  because the gate's purpose (hold the line at 91) is satisfied and the
  numbers are strong.

**O-2 — re-flag for U3 (now the third gated package): roll up the
`/index.ts` coverage exclude into the single audit table.** plgg-router
excludes `/index.ts`, consistent with plgg-http and the plgg-test
bootstrap excludes. Each is individually a legitimate pure-barrel
exclusion, but criterion 2 wants them auditable in one place.

- **Proposal**: at U3, the ship-or-defer roll-up table should now have
  entries for plgg-test (4 bootstrap paths), plgg-http (`/index.ts`), and
  plgg-router (`/index.ts`) — and will keep growing as the remaining
  gated packages land. One table, one glance.

## Review Notes

- **Decision: PASS — Approve with observations.** Single run 39/0/0
  (exact baseline), watch runs/reacts/stops cleanly, coverage
  100/97.44/98.11/100 with the 91 gate proven genuinely enforced
  (non-zero exit at an impossible threshold, restored clean
  non-interactively), vitest-free. Nothing red.
- Clean standard migration, no drift — the second consecutive gated
  package to pass without a ship-or-defer decision.
- Both observations are non-blocking (a benign-uncovered-arm
  confirmation and the recurring U3 exclude roll-up); no rework
  requested. My enforcement probe was fully non-interactive and left the
  committed config untouched.

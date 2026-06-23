# Coding-Phase E2E — Iteration-1 Re-test (Planner)

Author: Planner (E2E / external-interface QA)
Status: complete
Validated against: Constructor's iteration-1 fixes at `b9c3492`
(working tree clean at `7a2962a`).
Method: external execution on temp copies under the session
scratchpad; the real corpus was not mutated.

## Headline

Both flagged items are FIXED and verified; no regression.

- **Coverage four-metric gate: PASS.** Reports and gates
  statements/branches/functions/lines at the per-package threshold
  read from config (91 for plgg, not a hardcoded 90). plgg passes all
  four. The uncalled-function edge case is fixed. The gate still fails
  on under-executed code.
- **Watch source-edit freshness: FIXED.** A source-file edit now
  produces a re-run that reflects the NEW value (fresh process per
  run). Spec-edit, debounce, and loop-survives-failure still hold.
- **Regression: PASS.** plgg parity unchanged at 74 files / 465 passed
  / 0 failed.

---

## 1. Coverage four-metric gate (routed item O1)

### 1a — four metrics reported + gated at per-package threshold: PASS

`--coverage` on plgg now prints all four metrics and gates them
against the threshold from `packages/plgg/plgg-test.config.json`
(`threshold: 91`), not a hardcoded value:

```
Statements :  99.10% (3967/4003)
Branches   :  91.86% (440/479)
Functions  :  97.56% (360/369)
Lines      :  99.10% (3967/4003)
Coverage gate passed (all four metrics > 91%)
```
Exit 0. **plgg passes all four > 91.** (Branches at 91.86% is the
tightest — comfortably over.)

Per-package config confirmed:
- `plgg` → threshold 91, real four-metric numbers (above).
- `plgg-test` (its own) → threshold 85, with an explicit documented
  rationale in its config `_comment`: statements/functions/lines clear
  90 (~98/97/98%) but the BRANCH metric sits ~86% because plgg-test is
  full of defensive fallback arms (??-defaults, fs/JSON catch arms)
  that are safety nets, plus V8 block-branch counting is finer-grained
  than vitest's istanbul-normalized number. Gating plgg-test at 85 is
  an explicit Amendment-6 ship-or-defer verdict, NOT a silent
  narrowing of migrated production packages. This is exactly the
  "honest, recorded, never-ambiguous" outcome Amendment 6 demanded.

### 1b — uncalled-function edge case fixed: PASS

Previously a never-CALLED top-level function scored as free 100% (the
V8 line-proxy hole I found). Re-tested with 3 uncalled + 1 called
function:

```
Statements : 100.00% (4/4)
Functions  :  25.00% (1/4)      <- now correctly counts the 3 uncalled
Coverage gate FAILED (need all four > 91%)
```
Exit 1. The function metric now catches uncalled functions; no more
free 100%.

### 1c — gate still fails on under-executed code: PASS

Executed-but-unexercised branch (a function called only on its
positive path):

```
Statements :  60.00% (3/5)
Branches   :   0.00% (0/1)      <- never-taken else path caught
Functions  : 100.00% (1/1)
Lines      :  60.00% (3/5)
Coverage gate FAILED (need all four > 91%)
```
Exit 1. Branch + statement + line all correctly below threshold.

## 2. Watch source-edit freshness (routed item O2)

The exact scenario that was STALE before (source edit reflecting old
value) now works. Watch banner now reads "editing a source or spec
file re-runs the suite (fresh process)".

- **Initial run:** `1 passed` (lib.answer=1, spec expects 1).
- **Source edit** lib.ts `answer: 1 → 2` (spec still expects 1) →
  re-run output:
  ```
  plgg-test: change detected, re-running…
  ✗ watch lib
      expected 2 to be 1 (Object.is)
  0 passed, 1 failed, 0 skipped
  ```
  **The re-run reflects the NEW source value** (fresh process busts the
  old module cache). FIXED.
- **Loop survived** the failing run (process still alive).
- **Spec edit** (expect 2, matching source) → re-run fired. PASS.
- **Debounce:** 5 rapid writes coalesced to exactly 1 re-run. PASS.

All four watch behaviors hold; the source-edit staleness I flagged is
resolved.

## 3. Regression check

`plgg-test src` on the real plgg corpus:
- files discovered: **74**
- result: **465 passed, 0 failed, 0 skipped**, exit 0

Unchanged from `32ce653`. The coverage/watch rework did not disturb
the runner. No stray watcher processes left behind.

---

## Verdict summary

| Re-test | Result |
|---|---|
| Four metrics reported + gated at config threshold (91) | PASS |
| plgg passes all four (S 99.10 / B 91.86 / F 97.56 / L 99.10) | PASS |
| Uncalled-function edge case no longer free 100% | FIXED |
| Gate fails on under-executed code | PASS |
| Watch source edit reflects new value (fresh process) | FIXED |
| Watch spec-edit / debounce / loop-survives-failure | PASS (no regression) |
| plgg parity 74 / 465 / 0 | PASS (no regression) |

Note: the `vi.mock`→`postJson` injection (O3 / plgg-kit full
migration) is separate iteration-1 product work and was not part of
this re-test scope; per the plgg-kit smoke note it remains to be
verified once the injection seam lands.

## Review Notes

(none yet)

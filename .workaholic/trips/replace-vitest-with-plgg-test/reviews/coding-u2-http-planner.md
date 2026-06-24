# Coding Review — U2 plgg-http (Planner E2E / External Validation)

- **Reviewer**: Planner (Coding-Phase QA: E2E / external CLI execution)
- **Ticket**: U2 — migrate `plgg-http` from vitest to plgg-test (rewrite
  5 specs, swap scripts/devDeps, clean vite.config, add gated coverage
  config)
- **Implementation under test**: Constructor commit `a46f616`
- **Status**: validated
- **Decision**: **PASS — Approve with observations**

## Content

All validation executed via the runner CLI (plgg-test + plgg-http
rebuilt first). This is the first real per-package migration, so I held
it to the full per-package definition-of-done plus the protection rule.

### 1. Green single run — PASS (no test lost)

`bash scripts/test-plgg-http.sh`:

```
32 passed, 0 failed, 0 skipped
```

This matches my pre-migration vitest baseline of **32** exactly — no
test was lost or weakened in the data-last rewrite. The output is now
plgg-test's format (not vitest's "Test Files / Tests" lines), confirming
the runner actually swapped. All 5 spec files now import
`from "plgg-test"` (verified: 5/5).

### 2. Watch-mode — PASS

`npm run test:watch` (`plgg-test src --watch`):

- initial run `32 passed`,
- touched `src/Http/model/HttpError.spec.ts` → `change detected,
  re-running…` → `32 passed`,
- SIGINT stopped it cleanly, no orphan PID.

Watch parity holds for the migrated package.

### 3. Coverage gate — PASS, and proven genuinely enforced

`npm run coverage`:

```
Statements : 100.00% (355/355)
Branches   : 100.00% (14/14)
Functions  : 100.00% (49/49)
Lines      : 100.00% (355/355)
Coverage gate passed (all four metrics > 90%)
```

Matches the Constructor's report exactly — 100% on all four metrics
against the **90** gate (the package's original vitest threshold). Under
the protection-preserved rule this is the cleanest possible outcome:
**no drift, no ship-or-defer** — the reported number did not even drop,
so there is nothing to re-pin.

**I additionally proved the gate is genuinely enforced, not silently
disabled** (the lead's explicit ask). 100%-passing alone does not prove
the gate *would* fail on a miss, so I temporarily set the threshold to an
impossible **101** and re-ran coverage: the runner exited **non-zero
(1)** — i.e. the gate really fails a coverage shortfall. At the restored
real threshold of 90 it exits 0 and passes. The gate is live. I restored
`plgg-test.config.json` to threshold 90 via `git checkout` and confirmed
the working tree is clean (see observation O-1 on the restore method).

The coverage config excludes `["/index.ts"]`. I examined it:
`src/index.ts` is a **single line** — `export * from "plgg-http/Http"` —
a pure re-export barrel with zero coverable logic. Excluding it is
legitimate (no productive code hidden to inflate a number), consistent
with the protection rule.

### 4. Vitest-free — PASS

`grep -rn vitest packages/plgg-http/{src,package.json,vite.config.ts}`
returns **empty**. The scripts now read `tsc --noEmit && plgg-test src`
(+ `--watch`/`--coverage` variants), the devDeps no longer carry
`vitest`/`@vitest/coverage-v8`, and the vite.config vitest block is gone.
(As the lead noted, the package-lock still has transitive vitest via
`plgg`'s `file:` dep — that is the U3 cleanup target and correctly out of
scope here.) This package now satisfies criterion 1 locally.

### Observations (per Critical Review Policy)

**O-1 — my enforcement probe is a sound technique but the per-package
coverage config needs a safer restore discipline.** To prove the gate
fires I mutated `plgg-test.config.json` (threshold 90→101) in place; my
first restore via `cp` hit an interactive overwrite prompt and silently
left the file at 101, which I then corrected with `git checkout`. No harm
done (verified clean), but it is a reminder that the gated packages'
config files are live, committed artifacts — a careless in-place edit
during testing could leave a wrong threshold staged.

- **Proposal**: For the remaining 5 gated U2 packages I will prove
  enforcement by copying the config to a scratch path and pointing a
  throwaway run at it (or by `git stash`/`git checkout` discipline),
  never relying on an interactive `cp` restore. This keeps the
  enforcement proof without any risk to the committed gate value. (Pure
  process note for myself; nothing for the Constructor to change.)

**O-2 — `index.ts` exclusion is fine here, but it is the second package
to carry a coverage `exclude`, so the U3 audit-roll-up matters.** This
package excludes `/index.ts` (a one-line barrel) and plgg-test itself
excluded four bootstrap paths. Both are individually defensible, but the
Direction's criterion 2 wants coverage decisions auditable *in one
place*.

- **Proposal** (re-flag of my U1 observation, now with a second data
  point): at U3 final acceptance, roll up every per-package coverage
  `exclude` into one ship-or-defer table — package, excluded path,
  one-line reason — so a stakeholder sees the full exclusion surface
  without reading nine config files. For plgg-http the entry is trivial
  ("`index.ts` — pure re-export barrel, no coverable logic").

## Review Notes

- **Decision: PASS — Approve with observations.** Single run 32/0/0
  (matches baseline 32 exactly — no test lost), watch runs/reacts/stops
  cleanly, coverage 100% all four metrics with the gate proven
  genuinely enforced at 90 (non-zero exit at an impossible threshold),
  vitest-free in src/package.json/vite.config.ts. Nothing red.
- This is a clean reference migration: zero coverage drift means no
  ship-or-defer decision was needed, exactly the best-case path through
  criterion 2.
- Both observations are non-blocking process/U3-reporting items with
  concrete proposals; no rework requested of the Constructor. Working
  tree restored clean after the enforcement probe.

# Coding Review — U2 plgg-kit (Planner E2E / External Validation)

- **Reviewer**: Planner (Coding-Phase QA: E2E / external CLI execution)
- **Ticket**: U2 — migrate `plgg-kit` from vitest to plgg-test, including
  R5 (`vi.mock` → typed DI seam for `postJson`) and R4 (drop 6
  skip-timeout args)
- **Implementation under test**: Constructor commit `a358343`
- **Status**: validated
- **Decision**: **PASS — Approve with one documented follow-up**

## Content

All validation executed via the runner CLI (plgg-test + plgg-kit rebuilt
first). This migration touched **production source** (R5 DI), so beyond
the usual per-package checks I verified the DI swap preserved behavior.

### 1. Green single run — PASS (skip fidelity preserved)

`bash scripts/test-plgg-kit.sh`:

```
12 passed, 0 failed, 6 skipped
```

Exact baseline match. The skip count is the load-bearing detail here, and
it reconciles precisely against the source:

- active `test(` across all specs: **12** → all 12 pass.
- `test.skip(` across all specs: **6** → all 6 skipped.

So the 6 live provider tests are **still skipped** — not silently dropped
(the count would be lower) and not accidentally promoted to run (no
network calls, no failures). R4's removal of the timeout 3rd arg from the
6 `test.skip(name, fn, 20000)` calls did not change their skip status.

### 2. Watch-mode — PASS

`npm run test:watch`: initial `12 passed / 6 skipped`, touched
`generateObject.spec.ts` → `change detected, re-running…` →
`12 passed / 6 skipped`, SIGINT clean stop, no orphan.

### 3. Ungated coverage — PASS

`plgg-kit` correctly has **no `plgg-test.config.json`**. `npm run
coverage` runs without error (exit 0) and reports:

```
Statements : 100.00% (312/312)
Coverage: reported (this package is UNGATED — no threshold configured)
```

This exactly reproduces its prior vitest `coverage.all: true` / no-
threshold behavior — coverage is reported, never fails. The
protection-preserved rule is satisfied: an ungated package stays ungated
(no gate existed to drop).

### 4. Vitest-free — PASS

`grep -rn vitest packages/plgg-kit/{src,package.json,vite.config.ts}` →
empty. Scripts swapped to `plgg-test src` (+ watch/coverage), devDeps
dropped vitest/@vitest/coverage-v8, vite.config vitest block gone.

### 5. DI behavior intact (the R5 production change) — PASS

This is the proof the `vi.mock` → DI swap preserved behavior, and it is
clean:

- **`vi.mock` is gone entirely** (grep across `src` → none).
- The 4 offline `generateObject` tests (OpenAI `output[].content[].text`,
  Anthropic `content[].text`, Google `candidates[].content.parts[].text`,
  plus apiKey-from-env resolution) are all **non-skip** (lines
  79/101/122/141) and are inside the 12 passed.
- The injected `fakePost` returns the **real per-vendor response
  envelope** keyed off the request URL, so the full path — provider
  dispatch, apiKey resolution, request assembly, and the per-vendor
  decode — actually executes; only the network call is faked. The fake
  satisfies `typeof postJson` **exactly with no cast**
  (`({ url, headers }) => (data) => Promise<Result<unknown, Error>>`),
  honoring the no-escape-hatch rule.

So the DI seam exercises the same dispatch/decode logic the old `vi.mock`
test did, offline and deterministically. Behavior is preserved, and the
test is arguably *more* faithful than a module mock because it drives the
real `generateObject` with a typed seam rather than replacing the module.

### The `.env` question the Constructor flagged — acceptable, with a
documented follow-up

The vitest `vite.config.ts` carried
`env: dotenv.config({ path: ".env" }).parsed`, which auto-loaded `.env`
into the test process. The migration removed that block (plgg-test has no
equivalent). My assessment of the impact:

- **My run is unaffected**, and correctly so: the 6 live tests are
  skip-by-default (they never run), and the one offline test that needs
  an API key (`"resolves the apiKey from env"`, line 141) sets it
  explicitly via `vi.stubEnv("OPENAI_API_KEY", "sk-from-env")` and uses
  the `fakePost` seam — it does not read `.env` at all. So no offline
  test depends on dotenv.
- **The residual is a real but minor DX regression for the skipped live
  tests.** Previously a developer could drop keys in `.env` and un-skip a
  live test; now, with no dotenv auto-load, un-skipping a live test
  yields a silent no-key failure unless the developer knows to export the
  vars into their shell first. The behavior under the default run is
  identical (skipped), so this does not affect criterion 2 or the green
  baseline — but it changes the un-skip workflow without saying so.

**My verdict: acceptable to ship as-is, but it warrants a documented
follow-up.**

- **Proposal**: add a one-line comment in `generateObject.spec.ts` at the
  live-integration section ("// live integration (skipped by default;
  require real API keys) — export OPENAI_API_KEY / ANTHROPIC_API_KEY /
  GOOGLE_API_KEY into your shell before un-skipping; `.env` is no longer
  auto-loaded since the vitest dotenv block was removed"). This is a
  contributor-experience (criterion 4) nicety, not a blocker — the
  comment block at line ~166 already says "require real API keys," so it
  is one sentence away from also saying *how* to provide them now. I'd
  log it as a U3 (or post-trip) follow-up rather than re-opening this
  ticket.

## Review Notes

- **Decision: PASS — Approve with one documented follow-up.** Single run
  12/0/6 (exact baseline; skip fidelity proven via source count
  12 active + 6 skip), watch runs/reacts/stops cleanly, ungated coverage
  reports-without-failing as intended, vitest-free, and the R5 DI swap
  preserves behavior with a cast-free typed seam exercising the real
  dispatch/decode path. Nothing red.
- The `.env` change is acceptable under the default (skipped) run; my one
  follow-up is a one-line how-to-provide-keys note for whoever un-skips
  the live tests — a criterion-4 DX item, not a correctness or coverage
  issue.
- R4 (dropped timeout args) and R5 (DI) both land cleanly; this is a
  faithful migration of a package that also carried a production-source
  change, which is the harder case and it held up.

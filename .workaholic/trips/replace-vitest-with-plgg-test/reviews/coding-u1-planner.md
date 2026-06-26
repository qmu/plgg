# Coding Review — U1 (Planner E2E / External Validation)

- **Reviewer**: Planner (Coding-Phase QA: E2E / external CLI execution)
- **Ticket**: U1 — plgg-test foundation (Finding A self-suite fix, R1
  `toBeGreaterThanOrEqual`, Gate B deepEqual/toEqual parity)
- **Implementation under test**: Constructor commit `a12591f`
- **Status**: validated
- **Decision**: **PASS — Approve with one observation**

## Content

All validation was performed by actually executing the runner CLI (my
QA domain), not by reading the diff. plgg-test was rebuilt before testing
because U1 modified its source.

### 1. Self-suite green (Finding A resolution) — PASS

`bash scripts/test-plgg-test.sh`:

```
84 passed, 0 failed, 0 skipped
```

This is the headline result. The pre-migration baseline I captured was
**0 passed / 15 failed** — every self-spec failed to load with
`Cannot find module '.../src/index.js'`. After U1 the same suite is
**84 passed / 0 failed / 0 skipped**. Finding A (the blocker I surfaced
at concurrent-launch) is resolved: the runner can now execute its own
suite, which is the precondition for the fidelity gate being observable
at all.

### 2. R1 — `toBeGreaterThanOrEqual` executes and passes — PASS

Confirmed the matcher exists in source (`Matchers/matchers.ts:126`,
re-exported `index.ts:42`) and that its unit test actually runs (not
silently skipped). Running the discovered `Matchers` directory:

```
20 passed, 0 failed, 0 skipped
```

The spec `test("toBeGreaterThanOrEqual", …)` (`matchers.spec.ts:81`)
exercises the real semantics: `3 >= 2` → Ok, `3 >= 3` → Ok (boundary),
`3 >= 4` → Err. This is the user-visible proof R1 works and unblocks the
one `plgg-foundry` site that needs it.

### 3. Gate B — Box-tagged Option/Result + class-instance parity
executes and passes — PASS

Running the discovered `Expect` directory:

```
18 passed, 0 failed, 0 skipped
```

The parity spec (`Expect/equals.spec.ts`) executes named tests that
directly answer the fidelity concern the Architect/Constructor raised in
planning — that `deepEqual` must match vitest `toEqual` on plgg domain
values:

- `"Box-tagged Result/Option equal by tag + content"`
- `"nested Box-tagged values equal recursively"`
- `"class instances compare by own enumerable fields"`
- `"plain objects ignore undefined props"` /
  `"objects ignore function props"`
- `"Map and Set structurally"`, `"Date by time, RegExp by source+flags"`

These are the exact shapes my round-1 review (C-1 region) and the Model's
§3-#4 flagged as silent-false-green risks. They now run green, so the
bulk `toEqual` rewrite in the U2 packages rests on an *observable*
parity guarantee rather than an assumption. This materially de-risks
success criterion 2 (coverage preserved file-for-file).

### 4. Watch-mode smoke (criterion 3) — PASS

Started `node ./bin/plgg-test.mjs src --watch`, observed the full
lifecycle, then stopped it:

- **Initial run**: `84 passed, 0 failed, 0 skipped`.
- **Reacts to change**: after touching a spec file, the runner emitted
  `change detected, re-running…` and re-ran to `84 passed`.
- **Clean stop**: SIGINT terminated the process with no orphan (verified
  the PID was gone).

Watch parity — a per-package definition-of-done item and a Direction
release condition — holds for the runner itself, which is where it
matters most.

### 5. Coverage run + gate (criterion 2) — PASS

`npm run coverage`:

```
Statements :  94.90% (1583/1668)
Branches   :  86.74% (157/181)
Functions  :  94.12% (192/204)
Lines      :  94.90% (1583/1668)
Coverage gate passed (all four metrics > 85%)
```

These match the Constructor's reported numbers exactly (94.90% stmts /
86.74% branches). Applying the **protection-preserved vs
reported-percentage** rule from direction-v2/model-v2: plgg-test gates
*itself* at **85** (not at the 91 the production packages keep), and that
lower gate is **explicitly documented** in `plgg-test.config.json` with a
written rationale — branch coverage sits ~86% because the runner is full
of defensive fallback arms (`??`-defaults, fs/JSON catch arms) that are
correctness safety nets rather than exercisable behavior, and V8
block-branch counting reads finer-grained than vitest's istanbul number.
This is a legitimate, surfaced ship-or-defer verdict for the runner
package — **not** a silent narrowing of the migrated packages (the
comment explicitly states migrated production packages keep their real
numbers, e.g. plgg = 91). The gate *fires* and *passes*; protection is
intact.

### Concern (per Critical Review Policy) — the coverage `exclude` list is
a discretionary judgment that should be visible, not buried in config

`plgg-test.config.json` excludes four paths from coverage:
`/index.ts`, `/Cli/cli.ts`, `/Coverage/gate.ts`, and `/Resolve/`. The
protection-preserved rule explicitly forbids "excluding files to hit a
number," so I examined each:

- `index.ts` (75 lines) — pure re-export façade, no branching logic.
- `Cli/cli.ts` (50 lines) and `Coverage/gate.ts` (81 lines) — the
  orchestration entry points the `bin` launcher invokes; they run as the
  process top-level, not as importable in-process units the coverage
  subprocess can instrument.
- `Resolve/` — the Node loader hook + alias derivation that runs **in
  the launcher process before the coverage subprocess starts**, so it is
  structurally outside V8's in-process instrumentation. (Notably
  `Resolve/hook.ts` *is* tested by `Resolve/hook.spec.ts` — it is
  excluded from coverage *counting*, not from testing.)

My judgment: these are genuinely-uncoverable out-of-process bootstrap
seams, so the exclusion is defensible and does **not** violate the
protection rule — it is not productive logic hidden to inflate a number.
**But** it is a discretionary call that currently lives only inside the
config file, and the Direction's whole point is that coverage decisions
stay *auditable* by a stakeholder.

- **Proposal**: This does not block U1 — I am passing it. For the U3
  final acceptance, treat each coverage `exclude` (here, and any added in
  the U2 packages) as an explicit ship-or-defer line item in the final
  report, the same status the lowered-threshold gets, so a stakeholder
  can see *which paths are excluded and why* in one place rather than
  reconstructing it from per-package config comments. For U1
  specifically, the `Resolve/hook.spec.ts` existence is the right
  pattern to point to: "excluded from counting because out-of-process,
  but still tested." Carrying that one-line justification into the U3
  report closes the audit loop on criterion 2.

## Review Notes

- **Decision: PASS — Approve with one observation.** All four required
  checks pass with exact numbers: self-suite 84/0/0 (from baseline
  0/15), R1 and Gate B specs both execute green, watch-mode runs/reacts/
  stops cleanly, coverage gate fires and passes (94.90/86.74/94.12/94.90
  vs 85) with a documented, legitimate lower threshold. Nothing red.
- The single observation (coverage-exclude auditability) is a U3
  reporting item, not a U1 blocker, and I have given a concrete proposal.
- U1 also clears my planning-round C-1 worry at the runtime level: the
  `toEqual`/`deepEqual` parity on Box-tagged Option/Result is now an
  executed, passing guarantee that the U2 bulk rewrites can rely on.

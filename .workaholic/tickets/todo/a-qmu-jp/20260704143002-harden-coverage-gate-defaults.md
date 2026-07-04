---
created_at: 2026-07-04T14:30:02+09:00
author: a@qmu.jp
type: housekeeping
layer: [Config, Infrastructure]
effort:
commit_hash:
category:
depends_on: []
---

# Harden the coverage gate: opt-out gating (default 90), gate `plgg-kit`, record explicit exemptions

## Overview

Phase 0 (整地 Groundwork), ticket **02** of the plggpress/plggmatic roadmap —
implements **D14** ("New packages gated ≥90 from day one; fix the
silent-ungating default (missing plgg-test.config.json must not silently skip
gating); gate plgg-kit") from the approved decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`. **D12** is the
reason plgg-kit specifically must be gated: it is declared **LIVE** — the
single active vendor seam that Phase 8/9 (RAG embeddings, Realtime agent)
builds on.

Today the gate is opt-**in** twice over, and both layers were deliberate
*migration-era* choices whose rationale has expired:

1. **Per-package opt-in.** `packages/plgg-test/src/Coverage/config.ts` treats
   a missing `plgg-test.config.json` (or a config without a numeric
   `threshold`) as UNGATED — coverage is printed, never enforced. The comment
   in that file says why: during the vitest→plgg-test migration
   ("Iteration-1"), formerly-ungated packages had to stay ungated so the
   migration wouldn't silently re-gate them. The migration finished
   2026-06-24; the safety valve is now a hole. A brand-new package is born
   ungated unless its author remembers a config file — the exact opposite of
   D14.
2. **Per-run opt-in.** The gate only executes under `--coverage`
   (`packages/plgg-test/bin/plgg-test.mjs`, `wantsCoverage` branch), but every
   canonical runner — each `scripts/test-*.sh`, therefore `check-all.sh`,
   therefore the fresh-clone CI backstop (`.github/workflows/run-tests.yml`,
   which runs exactly `npm-install.sh` + `check-all.sh`) — invokes
   `npm run test`, which is `plgg-test src` *without* `--coverage`. So **no
   threshold, on any package, is enforced by check-all or CI today**; the 17
   existing configs bite only when someone manually runs `npm run coverage`.

Measured state of the config-less packages (fresh runs, 2026-07-04):

| package | S / B / F / L | disposition |
|---|---|---|
| `plgg-kit` | 100 / 100 / **90.00** / 100 (F: 18/20) | **gate at 90** (D14+D12; needs ≥1 more function covered — the gate is strictly `>`) |
| `plgg-foundry` | 45.02 / 33.33 / 34.38 / 45.02 | **exempt, explicitly experimental** (retired-era; see Considerations) |
| `example` | not measured | **exempt** — private demo app (`"private": true`) |
| `plggmatic-example` | not measured | **exempt** — private demo app; rewritten declaratively by roadmap ticket 13 |
| `guide`, `site` | n/a | never invoke plgg-test (guide has no test script; `test-site.sh` runs `npm run examples`) — outside the runner's jurisdiction, nothing to mark |

Design (opt-out, one canonical runner, zero new scripts — per the
command-scripts policy no bespoke wrappers are added; the change lives in the
runner itself):

- **Missing config ⇒ gated at default threshold 90.** Exemption becomes an
  explicit, reasoned marker in `plgg-test.config.json`:
  `{ "coverage": { "exempt": "<non-empty reason>" } }` — printed verbatim by
  the gate so exemption is always visible in test output.
- **Malformed config ⇒ hard failure.** Today a JSON parse error silently
  ungates (`readJson` catch → `undefined`). It must exit 1 with a clear
  message — never silently skip.
- **Gating rides every one-shot `plgg-test` run.** The launcher always
  collects V8 coverage and runs the gate post-pass; `--coverage` stays
  accepted (now redundant) so existing `coverage` npm scripts keep working.
  With that, `check-all.sh` and CI enforce every package's gate with **zero
  script edits**, and a future package is gated on its first test run even if
  its author writes no config at all.

Zero new dependencies; no native bindings; no new shell scripts (seven
redundant ones are deleted).

## Policies

- `workaholic:implementation` / `policies/test.md` — the coverage-targets
  policy: 90% on all four metrics enforced by the same command developers run.
  Its "Gaps" section records exactly this defect ("coverage thresholds for
  plgg-foundry and plgg-kit are not observed … low coverage in those packages
  does not fail CI"); this ticket closes the gap for plgg-kit and converts the
  remainder from silent to explicit.
- `workaholic:implementation` / `policies/quality.md` — lists "Coverage
  thresholds absent in plgg-foundry and plgg-kit" as an open quality
  constraint, and establishes that quality gates must be executable, not
  conventional. An ungated-by-omission default violates its "every statement
  reflects implemented, executable practice" standard.
- `workaholic:operation` / `policies/delivery.md` — the local-CI/CD doctrine:
  hosted CI is a fresh-clone backstop that runs the one canonical runner
  (`check-all.sh`), identical to the local path so the two cannot drift.
  Enforcement therefore must live inside `plgg-test`/`check-all.sh`, not in a
  new CI step or bespoke per-package script.

## Key Files

- `packages/plgg-test/src/Coverage/config.ts` — the opt-in default and its
  expired Iteration-1 comment; `CoverageConfig.threshold: Option<number>`
  becomes a sum type (gated/exempt), `readJson`'s silent catch goes away.
- `packages/plgg-test/src/Coverage/config.spec.ts` — existing config specs
  (temp-dir fixtures); extend for the new rules.
- `packages/plgg-test/src/Coverage/gate.ts` — the post-pass that prints
  "UNGATED — no threshold configured" and exits 0; must branch exhaustively on
  the new sum type.
- `packages/plgg-test/bin/plgg-test.mjs` — launcher; the `wantsCoverage`
  branch in `runChild()` is where gating becomes unconditional.
- `packages/plgg-kit/plgg-test.config.json` — **new**, threshold 90; plus the
  spec work to lift Functions above 90.00% (18/20 today — the two uncovered
  functions are identifiable from the gate's per-file report; the offline DI
  seam from the u2 migration keeps this live-network-free).
- `packages/example/plgg-test.config.json`,
  `packages/plggmatic-example/plgg-test.config.json`,
  `packages/plgg-foundry/plgg-test.config.json` — **new** exempt markers with
  reasons.
- `packages/plgg-foundry/README.md` — one-line explicit "experimental /
  retired-era" note (the D14 "explicitly mark experimental" half of the
  foundry decision).
- `scripts/coverage-plgg.sh`, `coverage-plgg-bundle.sh`,
  `coverage-plgg-highlight.sh`, `coverage-plgg-md.sh`,
  `coverage-plgg-parser.sh`, `coverage-plgg-test.sh`, `coverage-plggpress.sh`
  — become redundant duplicates of their `test-*.sh` twins once gating is
  default-on; delete (command-scripts policy: consolidate, don't accumulate).
- `README.md` (line ~423) — the only reference to a `coverage-*.sh` script
  outside `.workaholic/`; update alongside the deletion.
- `scripts/check-all.sh`, `scripts/test-*.sh` — **unchanged**; they start
  enforcing simply because the runner underneath them does.

## Related History

- `.workaholic/tickets/archive/work-20260624-135934/` (story
  `.workaholic/stories/work-20260624-135934.md`) — the vitest→plgg-test
  migration that created today's default.
  `20260624141655-u1-plgg-test-refinement-and-fidelity-gate.md` built the
  per-package config + gate; the u2 tickets migrated each package with strict
  fidelity — `20260624141703-u2-migrate-plgg-kit.md` says it outright: "NO
  plgg-test.config.json (ungated)", "ungated stays ungated". Correct scope
  discipline then; D14 is the deliberate reversal now that migration fidelity
  no longer needs protecting. The same plgg-kit ticket's R5 introduced the
  injectable provider seam this ticket's new specs lean on.
- `packages/plgg-test/src/Coverage/config.ts` header comment — the in-code
  record of the same decision ("keeps migrating more packages later from
  silently re-gating them at some default"); update it to record D14.
- `.workaholic/policies/quality.md` + `policies/test.md` (frozen 2026-02) —
  both documented the foundry/kit ungated gap back in the vitest era; the gap
  survived two test-runner generations. Their regeneration is a separately
  deferred roadmap item — do not rewrite them here.
- `.workaholic/tickets/archive/work-20260704-104625/20260704104836-plgg-bundle-hook-dir-resolution.md`
  — recent example of a Quality Gate *assuming* check-all enforces coverage
  ("check-all is green … coverage stays >90%"); this ticket makes that
  assumption actually true.
- Sibling ticket
  `20260704143001-cleanup-plgg-press-remnant-and-canonical-manifests.md` —
  removes the empty `packages/plgg-press/` remnant; no interaction (the
  remnant has no manifest, so it never reaches plgg-test either way).

## Implementation Steps

1. **Rework `packages/plgg-test/src/Coverage/config.ts`.** Replace
   `threshold: Option<number>` with an explicit sum, e.g.
   `CoverageGate = { kind: "gated"; threshold: number } | { kind: "exempt"; reason: string }`,
   and have `readConfig` return `Result<CoverageConfig, …>` (or an equivalent
   typed error channel — Result, not throw). Rules: file absent → gated at
   `DEFAULT_THRESHOLD = 90`; `coverage.exempt` a non-empty string → exempt
   with that reason; `coverage.threshold` a number → gated at it; config
   present with neither → gated at 90 (safe default); file present but
   unreadable/unparseable, or `exempt` present but empty/non-string → **Err**
   (the gate must fail, not skip). Trim `DEFAULT_EXCLUDE` to `["/index.ts"]` —
   the plgg-specific entries (`/Grammaticals/…`, `/Abstracts/`) are dead for
   every package that would ever receive the default (verified: all 17
   existing configs declare their own `exclude`). Update the Iteration-1
   header comment to state the D14 rule.
2. **Update `packages/plgg-test/src/Coverage/gate.ts`.** Exhaustive `match` on
   the new type: exempt → print
   `Coverage: reported only — EXEMPT (<reason>)`, exit 0; gated → the existing
   strictly-greater four-metric check, message naming the threshold and
   whether it came from config or the default; config Err → print the error,
   exit 1.
3. **Make gating unconditional in `packages/plgg-test/bin/plgg-test.mjs`.**
   `runChild()` always uses the NODE_V8_COVERAGE + gate post-pass path;
   `--coverage` remains accepted as a no-op (per-package `coverage` /
   `coverage:watch` npm scripts keep working untouched). Watch mode keeps its
   never-exit loop — the gate line simply appears in each re-run's output.
4. **Specs for the new behavior** in `config.spec.ts` (and gate-level
   coverage as needed): missing file → gated 90; explicit threshold → that
   threshold; exempt+reason → exempt; empty-string exempt → Err; malformed
   JSON → Err; default exclude trimmed. plgg-test's own gate (it has a
   threshold config) must stay green over the new code.
5. **Gate `plgg-kit`.** Add `packages/plgg-kit/plgg-test.config.json` with
   `{ "coverage": { "threshold": 90, "exclude": ["/index.ts"] } }`. Current
   Functions is exactly 90.00% (18/20) and the check is strict `>`: locate the
   two uncovered functions via the per-file report and cover at least one with
   offline specs through the existing injectable provider seam — no
   live-network tests, no `.skip` removal.
6. **Record the exemptions** (reason strings are part of the record — keep
   them meaningful):
   - `packages/example/plgg-test.config.json`:
     `{ "coverage": { "exempt": "private demo app" } }`
   - `packages/plggmatic-example/plgg-test.config.json`:
     `{ "coverage": { "exempt": "private demo app; declarative rewrite scheduled (roadmap ticket 13)" } }`
   - `packages/plgg-foundry/plgg-test.config.json`:
     `{ "coverage": { "exempt": "experimental retired-era package (45/33/34/45 measured 2026-07-04); gate before any revival" } }`
     plus the one-line experimental note at the top of
     `packages/plgg-foundry/README.md`. (Decision per D14's "decide
     plgg-foundry": exempt-as-experimental, not gate — it sits at ~45%
     coverage, is not on the roadmap's critical path, and its frozen-spec
     regeneration is already a deferred roadmap item. Gating it would be a
     multi-day test-writing project with no consumer; revisit trigger below.)
7. **Consolidate scripts.** Delete the seven `scripts/coverage-*.sh` (each is
   now behaviorally identical to its `test-*.sh` twin); update the
   `README.md` script-inventory line that names `coverage-plgg.sh`. Verify
   `grep -rn 'coverage-plgg' README.md scripts .github packages --include='*'`
   (excluding node_modules/dist/.workaholic) → 0 hits. Do **not** add any
   replacement script.
8. **Fresh `scripts/check-all.sh`.** Every plgg-test package is now enforced
   for the first time in the canonical pipeline. If any previously-configured
   package turns red, **raise its coverage** with real specs; lowering a
   threshold is a last resort that must be named explicitly in the PR — never
   done silently.
9. House rules throughout: no `as`/`any`/`ts-ignore`; Option/Result +
   exhaustive `match` (plgg-coding-style); Prettier `printWidth: 50`; zero new
   dependencies; `npm-install.sh`/`build.sh` untouched (no new packages).

## Quality Gate

**Acceptance criteria**

1. **Opt-out default:** a package with no `plgg-test.config.json` is gated at
   90 — proven by spec (config fixture) *and* by the launcher: a temp fixture
   package (or a temporarily renamed config) running below 90 exits non-zero
   from plain `plgg-test src` with no `--coverage` flag.
2. **No silent skip anywhere:** malformed JSON and empty/non-string `exempt`
   both fail the run (exit 1) with a message; the string
   "UNGATED — no threshold configured" no longer exists in
   `packages/plgg-test/src`.
3. **Canonical runner enforces:** `scripts/test-plgg-kit.sh` output contains
   the gate-passed line with all four metrics > 90; no runner script was
   edited to achieve this (`git diff --stat` clean for `scripts/test-*.sh`
   and `scripts/check-all.sh`).
4. **Exactly three exemptions**, each with a non-empty reason
   (`example`, `plggmatic-example`, `plgg-foundry`), each printing
   `EXEMPT (<reason>)` in its `scripts/test-*.sh` output;
   `packages/plgg-foundry/README.md` carries the experimental note.
5. **Scripts consolidated:** the seven `scripts/coverage-*.sh` are gone and
   the reference grep from step 7 returns 0 hits; no new shell script exists
   under `scripts/`.
6. **Red/green demonstrated:** the new config specs fail against the old
   `readConfig` (missing-config → ungated) and pass against the new one.
7. Zero new dependencies in every touched `package.json`; no
   `as`/`any`/`ts-ignore` introduced.

**Verification method**

Run `scripts/test-plgg-test.sh`, `scripts/test-plgg-kit.sh`,
`scripts/test-example.sh`, `scripts/test-plggmatic-example.sh`,
`scripts/test-plgg-foundry.sh` and paste each gate/exempt line. Demonstrate
criterion 1's live trigger (fixture below threshold → non-zero exit).
Then a **fresh** `scripts/check-all.sh` (clean rebuild — stale dists must not
mask drift) must be green end-to-end: this is the first run in which the
coverage gates are load-bearing for every package in the pipeline.

**Gate**

All seven acceptance criteria hold objectively AND the fresh `check-all.sh`
run is green. Any silent-skip path left alive, any runner-script edit, any
new script, or any silently lowered threshold fails the ticket.

## Considerations

- **First-enforcement risk:** the 17 pre-existing configs have never been
  enforced by check-all; a latent sub-threshold package may surface at step 8.
  That is the point of the ticket — fix forward with specs, and surface any
  threshold change loudly in the PR.
- **Runtime cost:** every one-shot test run now pays V8 coverage collection +
  one extra gate process. Expected to be seconds per package. Revisit trigger:
  if the dev loop or watch mode becomes noticeably slower, a follow-up ticket
  may add an explicit local-only escape hatch (e.g. `--no-coverage`) — default
  stays gated.
- **`guide` / `site` are out of jurisdiction**, not exempt: they never invoke
  plgg-test (content-only / `npm run examples`). If either ever gains a spec
  suite, the opt-out default gates it automatically — no registry to update.
  That automatic capture is also why no separate repo-level exemption file is
  kept: the per-package `exempt` marker, with reason, *is* the record, and it
  travels with the package.
- **`plgg-foundry` revival trigger:** any ticket that makes foundry a consumer
  of live roadmap work (or regenerates its frozen 2026-02 specs) must replace
  the exempt marker with a real threshold as part of that work — the reason
  string says so.
- **npm `coverage` scripts retained** as aliases (`test` and `coverage` now do
  the same thing). Dropping them across 20 manifests is churn with no
  consolidation payoff at the shell-script layer; prune opportunistically if a
  later ticket touches those manifests anyway.
- **plgg-kit exclusions stay honest:** if the two uncovered functions turn out
  to be genuinely unreachable offline (pure live-network glue), prefer a
  targeted `exclude` entry with a comment-equivalent reason in the PR over a
  lowered threshold — but try the DI seam first.
- The sibling manifest-cleanup ticket (**01**) and this ticket touch disjoint
  files; either may land first.

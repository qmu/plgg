---
instruction: "over tickets (queue-execute)"
phase: coding
step: coding/ticket-20260626122207
iteration: 0
updated_at: 2026-06-27T01:02:54+09:00
---

# Trip Plan

## Initial Idea

Queue-execute trip: no design instruction was given; the team drives the
existing 5-ticket todo queue with three-agent QA on the current branch
`work-20260626-221353`. No Planning, no Decomposition — the tickets are the spec.

## Plan Amendments

- **Mode: queue-execute** — `/trip over tickets` with a populated queue and no
  design instruction routes to queue-execute. Uses current branch/working tree
  (tickets live here), not a new worktree. Drive order by `depends_on` then severity:
  1. `20260626122207-refactor-spec-validation-examples-to-cast-refine` (no deps)
  2. `20260627002333-bundler-foundation-poc-against-plgg-core` (no deps)
  3. `20260627002334-migrate-library-builds-to-in-house-bundler` (← 2333)
  4. `20260627002335-replace-example-vite-dev-server-and-app-bundle` (← 2333)
  5. `20260627002336-purge-vite-and-final-grep-gate` (← 2334, 2335)

- **Concurrent-launch gate closed** — all three teammates primed. Constructor:
  queue buildable as-is, ordering matches drive order, system changes NOT
  authorized (project-local devDeps only). Planner: per-ticket E2E gates written
  to `e2e-plan.md`. Architect: codebase map + risks in `codebase-map.md`.
  Notable risks carried into coding: (T1) `cast` failure-message wrapping vs
  existing top-level-message assertions — green suite is the only proof; Bin fn
  is `validateBinaryData`. (T2) `packages/plgg/tsconfig.build.json` does not
  exist; two dts modes mandatory; don't leak tsc `.js` into dist. (T3) output-key
  renames + `index.${format}.js` naming ARE the dist contract.

- **Moderation — Ticket 1 cast contradiction (Leader ruling).** The ticket
  demands both "single `cast()` expression" and "every assertion verbatim";
  Constructor proved these collide because `cast` aggregate-wraps when the first
  (caster) step fails. Architect verdict: D (caster-first via `chainResult`, then
  `cast` the refines). Planner verdict: A (flat cast, teach the aggregate via a
  `.sibling` read). Leader verified the source before ruling:
  - cast.ts:538-577 — cast only wraps into the "Cast failed at N of M steps"
    aggregate when a SECOND step also fails (subsequent steps run against the
    original `value`); a single failure stays unwrapped. So D preserves every
    assertion verbatim, including business-rule cases.
  - reference.md:16 — the cheat-sheet idiom `cast(v, asObj, forProp, refine)` is
    the PARALLEL field-validation shape; these are SEQUENTIAL scalar validators
    (type must hold before rules apply).
  - HEAD `validateUserId` is genuinely imperative — the ticket's "before" is
    accurate; Planner's "already pipe+chainResult" caveat was a working-tree
    misread, so "close as already-satisfied" is not an option.
  **Ruling: Option D.** Preserves the ticket's "pure style refactor, behavior
  unchanged" intent AND demonstrates `cast`+`refine` idiomatically for sequential
  validation, with no `.content` deep-reach. A would bake a worse deep-reach
  anti-pattern into the reference examples. Planner's teaching value is preserved
  via one explanatory comment on the caster-outside composition. Carry-over for
  /report: cheat-sheet should distinguish sequential vs parallel validation
  shapes; `cast`'s aggregate-on-first-step-failure is a sharp edge.

## Progress

- [x] concurrent-launch (Leader + Planner/Architect/Constructor)
- [ ] ticket-1: spec validateX refactor
- [ ] ticket-2: bundler foundation PoC
- [ ] ticket-3: migrate library builds
- [ ] ticket-4: replace example vite
- [ ] ticket-5: purge vite + grep gate

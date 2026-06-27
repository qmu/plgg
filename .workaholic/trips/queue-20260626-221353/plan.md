---
instruction: "over tickets (queue-execute)"
phase: coding
step: coding/ticket-20260627002333
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

- **Design correction — Ticket 2 vendor dependencies (developer directive).**
  The developer rejected the PoC's dependency design: shedding vite while adding
  `terser` + `@microsoft/api-extractor` trades one dependency for two and defeats
  the vendor-neutrality goal. Breakdown: `typescript`/`ts.transpileModule` is
  reused (not new) and stays; `terser` (minify) and `api-extractor` (rolled-up
  dts) are both new and both droppable. Directive: target **zero new deps**.
  - Drop `terser` → no minification (libraries don't need minified dist;
    consumers re-bundle; minified-ness was never the resolution contract). Free
    size trim via `removeComments` only.
  - Drop `api-extractor` → per-file `.d.ts` tree for ALL packages incl.
    plgg-kit/plgg-foundry (rolled-up dts was a vite-plugin-dts style choice, not
    correctness; breaking-changes-OK). Bundler keeps ONE dts mode.
  - Constructor to verify kit/foundry have no genuine need for rolled-up dts
    before forcing per-file, then re-run the plgg PoC and update DEPENDENCY-LOG.
  Ticket 2 archive is HELD pending the revised, zero-new-dep PoC. Planner E2E
  paused.

- **OBS-3 — bootstrap chicken-and-egg (Planner finding, escalated into the
  ticket-2 rework).** `plgg-bundle`'s bin imports `plgg` from
  `packages/plgg/dist/`, but its job is to BUILD that dist — a clean checkout
  with no `packages/plgg/dist` cannot start the tool (ci-cd policy violation: a
  fresh CI runner must build with the same commands). Fix in the foundation:
  bundler resolves `plgg` from source (`packages/plgg/src`) via its strip-types
  resolver, or drops the plgg runtime dep entirely. Rework acceptance (all
  three): (1) zero new deps, (2) per-file dts for all incl. kit/foundry,
  (3) clean-checkout build works with `packages/plgg/dist` deleted first.

- **OBS-3 resolution — ruling C1 (Leader).** Constructor proved source-resolution
  is blocked (plgg source won't load under Node type-stripping without a
  109-file `verbatimModuleSyntax` + ESM overhaul of core — out of scope). Fork:
  C1 (rewrite plgg-bundle in plain TS, no plgg runtime dep) vs C2 (duplicate a
  ~40-line Result/Option util inside plgg-bundle). C2 rejected — duplicating
  plgg primitives is the "don't clone garbage" violation. **Ruled C1**: a
  bootstrap build tool must not depend on the library it builds (root cause of
  OBS-3); repo precedent = plgg-test's plain `.mjs` launcher. The FP idiom
  governs the library + consumers, not bootstrap tooling. CLAUDE.md hard rule
  (no `as`/`any`/`ts-ignore`) still applies; the departure is documented in
  plgg-bundle's README. Deps #1 (zero-new) and dts #2 (per-file for all) already
  done; C1 makes the clean-checkout bar pass by construction.

## Progress

- [x] concurrent-launch (Leader + Planner/Architect/Constructor)
- [x] ticket-1: spec validateX refactor — Option D, archived 49bd283 (consensus: Constructor green, Architect approve, Planner E2E approve)
- [ ] ticket-2: bundler foundation PoC
- [ ] ticket-3: migrate library builds
- [ ] ticket-4: replace example vite
- [ ] ticket-5: purge vite + grep gate

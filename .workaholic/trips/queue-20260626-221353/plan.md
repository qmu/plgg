---
instruction: "over tickets (queue-execute)"
phase: coding
step: coding/ticket-20260627002336
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

- **Moderation — Ticket 3 inline-vs-externalize dist-contract fork (Leader, ruled B).**
  Constructor found vite currently INLINES plgg's prebuilt dist into 7 consumer
  packages (`external:[]`) — each ships an embedded copy of plgg. The in-house
  bundler can't inline a dependency's prebuilt dist. Options: A (build a
  dist-inlining engine), A' (inline by re-transpiling sibling SOURCE via
  multi-alias resolver — Constructor's interim default), B (externalize plgg +
  siblings; each bundle = own source, deps imported at runtime). **Ruled B**,
  unanimous team: Planner decisive-B, Architect decisive-B, Constructor rec-B.
  Rationale: B makes each bundle faithful to its declared `dependencies` (A/A'
  ship a copy while the manifest says "depends on") ; A/A' duplicate plgg into 7
  packages (artifact-level clone, bloat, version-skew) and A needs a whole new
  inlining engine; B reuses the already-required ESM-externals work (gaps #1/#2),
  so it builds NO new capability beyond what was scoped. Module-identity hazard
  is largely neutralized by plgg's tag-structural types (Architect's honesty
  correction) so it's not the deciding factor — graph-fidelity + less-new-code
  is. Breaking-OK + zero blast radius (the 7 consumers are unpublished `file:`
  packages; plgg core is the graph root, unaffected). Inlining belongs at the
  example APP bundle (B3), not libraries. Refinements folded in: (1) derive each
  package's `external` from its package.json `dependencies` keys (+ `/^node:/`)
  so externals can't drift from the declared graph; (2) validate B on plgg-http
  (single dep) first as the B PoC, then multi-dep/node/predicate cases.

- **Ticket 3 — invocation-form swap DEFERRED to Ticket 5 (B5).** Architect ruled
  the build-script invocation form = **B** (the plgg-test precedent: add
  `"plgg-bundle": "file:../plgg-bundle"` devDep + `"build": "plgg-bundle"` via the
  package's `bin`, across all 10 packages) — Approve-with-observations, the swap
  being cosmetic house-consistency Architect explicitly OK'd folding into B5.
  Currently all 10 build scripts use the working direct-path placeholder
  (`node ../plgg-bundle/bin/plgg-bundle.mjs`); check-all is green through it.
  UPDATE: invocation B was actually APPLIED during the message-lag (Constructor
  acted on the verdict) — all 10 build scripts = `"plgg-bundle"` + `file:` devDep,
  check-all green through the bin. Decision (a): keep it. B5's invocation item is
  now a NO-OP (nothing to swap). Verified on disk by Leader.

- **Invocation form CONFIRMED uniform = B (post-T4 ground-truth).** All 11
  packages (10 libs + example) have `"build": "plgg-bundle"`; no uncommitted lib
  package.json changes → T3 committed form B for the libraries (earlier "form A"
  reads were stale mid-edit snapshots). Whole monorepo invokes the bundler one
  way; B5 invocation item is a genuine no-op.

- **Ticket 3 SOLE REMAINING GATE — flaky dts emit (determinism).** Planner E2E
  REJECT: `build.sh` fails ~33% (2/6 runs, different packages) — a consumer's
  dts emit intermittently resolves `plgg`/sibling to its `index.cjs.js` (implicit
  `any`) instead of its `.d.ts`. Constructor reproduced the same in its own run
  but initially mis-called it a one-time fs race (rejected: 2 green re-runs ≠
  determinism vs a 33% flake). Root-cause leads Leader confirmed in
  `plgg-bundle/src/domain/usecase/emitDts.ts`: (1) `spawnSync("npx", ["tsc"…])`
  at line 55 — npx resolves nondeterministically → use local tsc; (2) synthesized
  `tsconfig.dts.json` extends the package tsconfig which may carry
  `incremental`/`composite` → stale `.tsbuildinfo` replay; force both false +
  delete tsbuildinfo; (3) force dep resolution to upstream `dist/index.d.ts` via
  `paths` so it can't fall back to cjs JS + add a loud guard. Acceptance: 10×
  consecutive clean builds + a stated mechanism (not luck). Planner re-runs the
  10× cold flake check. Ticket 3 does NOT archive until this is green.

- **Ticket 3 flake — npx fix INSUFFICIENT; real root cause found (Planner).**
  Planner's re-check: still ~33% (4 fails / ~12 cold builds), and the
  npx-targeted TS7016 mode RECURRED → npx was a red herring. REAL structural
  root: the bundler discovers export surface by EXECUTING the freshly-built CJS
  bundle (`readExportNames` in `vendors/runner.ts`). Post-B, that bundle does
  real `require("plgg")`/`require("plgg-http")`, so export discovery triggers
  runtime resolution of sibling dists AT BUILD TIME — which races dist
  availability/completeness/emptyDir. 4 signatures (EvalError cannot-find sibling
  dist ×2, DtsError on incomplete emitted state, ENOENT scandir dist-before-exists),
  one root. This is the vm-execution-export-discovery + externals interaction
  flagged as DEPENDENCY-LOG gap #2. **Fix:** derive export surface STATICALLY
  (from the bundler's own walked module graph / emitted `.d.ts`), not by executing
  the bundle — removes build-time sibling-dist resolution entirely; + guard the
  ENOENT scandir ordering. Verify static surface == runtime surface (parity diff).
  Acceptance unchanged: 10× cold 0-fail on Planner's env + mechanism stated.

- **Ticket 3 flake — TRUE root cause + accepted fix (Constructor, controlled proof).**
  Deeper than both prior hypotheses: the flake is a **torn read of a shared
  sibling `dist` mid-rebuild**. `build.ts:emptyDir` does `rm -rf dist; mkdir;
  refill file-by-file` — a multi-second window where an upstream dist is
  missing/partial; on the shared worktree (multiple trip agents + harness +
  orphaned `build.sh` invocations rebuild the same dists concurrently) a reader
  hits it. BOTH build-time reader points tear in that window: export-discovery
  executing the CJS bundle (modes 1,3) AND tsc dts emit resolving sibling .d.ts
  (modes 2,4). Controlled proof: stable sibling dist → 20/20 & 30/30 clean;
  inject a concurrent rebuilder → 6/25 fail with the exact four signatures.
  **Fix accepted = atomic dist publish** (build into `dist.stage`, swap via
  `rename`) — closes both reader points. Static-export-derivation REJECTED as the
  fix (Constructor's sound argument: it fixes only reader #1; atomic publish fixes
  both, lower risk) — recorded as a future architectural cleanup (gap #2), not
  required. OPEN before done: confirm the warm-rebuild swap is genuinely atomic
  (rename onto existing dir / no ENOENT window) + same-FS; deliver before/after
  concurrency numbers + cold 10×; Planner runs authoritative 10× + concurrent-
  rebuilder stress on its env. NOTE: flake may be largely a shared-multi-agent-
  worktree artifact (single sequential CI build.sh has no concurrent rebuilder) —
  atomic publish is correct robustness regardless; Planner's env is the gate.

## Progress

- [x] concurrent-launch (Leader + Planner/Architect/Constructor)
- [x] ticket-1: spec validateX refactor — Option D, archived 49bd283 (consensus: Constructor green, Architect approve, Planner E2E approve)
- [x] ticket-2: bundler foundation PoC — archived b3d9590 (zero-new-dep, plain-TS no-plgg-dep / OBS-3 fixed, dist reproduced, 465/0; after 2 dev/QA interventions). B2 prereqs in DEPENDENCY-LOG.
- [x] ticket-3: migrate library builds — archived d77ce03 (10 pkgs → in-house bundler, B/externalize, invocation-B, atomic-publish flake fix; consensus: Constructor green, Architect approve-w-obs, Planner E2E approve 10/10+25/25) — B/externalize impl correct (Architect approve-w-obs; externalization all 3 forms + styleEntry/ssgEntry renames verified). **Planner E2E REJECT: build is FLAKY (~33% fail)** — dts-emit (emitDts.ts) intermittently can't resolve `plgg`'s declaration (resolves to index.cjs.js as implicit-any instead of its `types`); not package-specific. Constructor fixing (root-cause: likely npx-tsc + tsbuildinfo cache / types-resolution); must pass 10× builds 0-fail. Minor open: plgg-test CJS enumerates 0 named keys vs plgg-http's 36. Invocation A→B swap deferred to T5.
- [x] ticket-4: replace example vite — archived 3626c1d (app-mode bundle, node:http dev server + fs.watch rebuild, SSR via node strip / tsx dropped; consensus Constructor green, Architect approve-w-obs, Planner E2E approve)
- [ ] ticket-5: purge vite + grep gate

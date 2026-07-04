---
created_at: 2026-07-04T14:30:13+09:00
author: a@qmu.jp
type: refactoring
layer: [UX]
effort:
commit_hash:
category:
depends_on: [20260704143010-multi-column-renderer.md, 20260704143012-action-form-components.md]
---

# Rewrite plggmatic-example declaratively: the Phase 4 proof-of-value demo and the canonical docs example

## Overview

Phase 4 (Scheduler), ticket **13** of the plggpress/plggmatic roadmap — the
phase's closing gate: "plggmatic-example rewritten declaratively with
substantial line-count reduction as the proof-of-value demo" (spec, Phase
quality gates). It cashes in **D1** ("plggmatic = design system + UI
scheduling framework" whose essence is "declarative definition of menus,
data lists/details, actions, search, and flows, from which the UI is
automatically 'scheduled'") on the reference consumer, under **D10**'s
mode-agnostic vocabulary. Approved decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`. Working-style
policy honored by design: prove value with a runnable demo — this ticket IS
the runnable proof.

Today `packages/plggmatic-example/src/app.ts` is **691 hand-written lines**
(at `5ad57db`): a bespoke `Model`/`Msg`/`update` (lines 64–221), a
hand-rolled total URL codec (`parseUrl`/`toUrl`, lines 138–192), hand-built
column-stack composition (`stack`, lines 446–472), chrome components
(`colHead` 232–266, `breadcrumb` 482–563), and an app-authored chrome
stylesheet (`chromeCss`, 640–657). By the time this ticket starts, the
sibling Phase 4 tickets have deliberately half-emptied it: ticket 06 made
`update` pair-shaped, ticket 05 tokenized its literals, ticket 10 lifted
the chrome CSS and `colHead`/`breadcrumb` into the framework ("the app
keeps composing its own columns until 13"), and ticket 09 parked a crude
scheduler demo at a second entry. This ticket finishes the arc:

1. **Replace the program with a declaration.** The app's remaining
   hand-written `Model`/`Msg`/`update`/URL-codec/stack-composition is
   deleted in favor of a plggmatic declaration (Resource/Collection over
   the `Section`/`Note` dataset, Menu, List/Detail views, Query, Action,
   Flow) passed through `schedule(...)` (ticket 09) and rendered by the
   multi-column renderer (ticket 10) with action/form components where the
   flow mutates (ticket 12). The app authors: the declaration, the dataset,
   app identity (brand, scheme carrier), and the thin mount.
2. **Showcase the full vocabulary.** The rewritten example keeps the
   workbench behavior users know (sections → notes → reader traversal,
   URL-reflected stack, back/forward, keyed remounts, scheme toggle) and
   absorbs ticket 09's crude second-entry demo into the real app: a query
   filter over notes and a small mutable collection exercising
   create/delete with confirmation through ticket 12's form components.
   One entry again; the crude demo entry is retired.
3. **Record the before/after.** The proof is a number: ~690 hand-written
   program lines (app.ts at `5ad57db`) versus the size of the declaration
   modules that replace them, measured honestly (see Quality Gate) and
   recorded in the example's README and the PR.
4. **Make it the canonical docs example.** `packages/site/workbench.md` and
   its compiling twin `packages/site/examples/workbench.ts` currently teach
   the hand-composed stack ("the stack is derived, the geometry is
   composed"); rewrite them declaration-first — the page shows the
   declaration and states that Model, Msg, update, URL codec, and the
   column arrangement are all derived. The built example keeps shipping
   beside the site at `/example/` (`scripts/build.sh` line 76 copies
   `plggmatic-example/dist` into `site/dist/example/`).

No new package: plggmatic-example is already wired into
`scripts/npm-install.sh` (line 29), `scripts/build.sh` (the
`cd $REPO_ROOT/packages/plggmatic-example && npm run build` line, 70), and
`scripts/check-all.sh` (line 47, `test-plggmatic-example.sh`) — those
scripts must **not** change, and zero new dependencies enter any
`package.json`.

## Policies

- `workaholic:implementation` / `policies/quality.md` — TypeScript strict
  mode is the sole static-analysis layer and `as`/`any`/`ts-ignore` are
  prohibited; the rewrite is the end-to-end test of that contract on the
  consumer side: the example must type-check against the *landed* exports
  of tickets 09/10/12 (imported, never re-declared), so any drift between
  scheduler, renderer, and forms surfaces as a `tsc` error in this very
  package. Prettier `printWidth: 50` governs every touched `.ts` — the
  line-count comparison is only honest if both sides wear the same
  formatter.
- `workaholic:implementation` / `policies/test.md` — coverage is gated per
  package and one colocated `.spec.ts` per module is the house layout; the
  example's behavioral specs (`app.spec.ts`: URL round-trip, canonical
  serialization, markup assertions) must survive the rewrite as
  *behavior* specs over the scheduled program, not be deleted with the
  hand-written code they currently import — the rewrite proves the derived
  program passes the oracle's own tests.
- `workaholic:design` / `policies/accessibility.md` — the policy snapshot
  records accessibility as "not observed / not applicable (no UI
  components)"; that predates plggmatic. After tickets 10/12 the
  accessibility surface (landmark panes, labelled close links,
  `aria-current`, confirm dialogs) is framework-owned; this ticket must
  demonstrate that a consumer gets all of it *from the declaration alone*
  — the rewritten example hand-writes no `aria-*` attribute for anything
  the framework renders, and the docs page says so.

## Key Files

- `packages/plggmatic-example/src/app.ts` — the 691-line before-image; the
  hand-written program (`Model`/`Msg`/`update` 64–221, `parseUrl`/`toUrl`
  138–192, `stack` 446–472, `view`/`topBar` 570–600, `appCss` app-identity
  remainder) is replaced by the declaration + wiring. Line numbers are as
  of `5ad57db`; tickets 05/06/10 will have moved them — the file, not the
  numbers, is the oracle.
- `packages/plggmatic-example/src/app.spec.ts` — the behavioral oracle
  (init depth, URL round-trip `?s=…&n=…`, canonical serialization,
  rendered-markup counts); ported to drive the scheduled program.
- `packages/plggmatic-example/src/data.ts` — the `Section`/`Note` dataset;
  stays (content is not program) and grows whatever small mutable
  collection the action demo needs.
- `packages/plggmatic-example/src/main.ts` — the CSR mount (style
  injection + `application(app)`); stays thin, wires the scheduled app.
- `packages/plggmatic-example/src/stamp.ts`, `bundle.config.ts`,
  `index.html` — the build harness; retire ticket 09's second demo entry
  here (back to one entry) and un-extend `stamp.ts` if 09 extended it.
- `packages/plggmatic-example/README.md`, `package.json` — the README
  records the before/after numbers; the manifest `description` still says
  "an independent client-side program (plgg-view Elm Architecture)…" —
  update it to the declarative story.
- `packages/plggmatic/src/index.ts` — the framework barrel the example
  consumes (vocabulary, `schedule`, multi-column renderer, form
  components). Consumption only: a gap found here is fixed as a follow-up
  to the owning sibling ticket, not by growing this one.
- `packages/site/workbench.md` — the canonical docs page; currently opens
  "The repository ships a reference app…" and teaches hand-composed
  `row`/`column` stacking; rewritten declaration-first.
- `packages/site/examples/workbench.ts` — the compiling twin of the page's
  code fence ("Twin of the workbench page's code fence"); rewritten to the
  declaration, still compiling under `tsconfig.examples.json`.
- `packages/site/site.config.ts` — sidebar entry "Example: the workbench"
  (lines 69–72); keep the slug, retitle only if the page's new framing
  demands it.
- `scripts/build.sh` (lines 68–70, 76), `scripts/npm-install.sh` (line
  29), `scripts/check-all.sh` (lines 46–47) — the existing wiring; cited
  by the gate as must-not-change.
- `.workaholic/specs/20260704-plggmatic-scheduler-design.md` — ticket 09's
  design spec (exists once 09 lands); contains the
  plggmatic-example-equivalent declaration this rewrite starts from.

## Related History

- `packages/plggmatic` + `plggmatic-example` arrived with commit `6d7a832`
  ("Add the plggmatic UI design framework to the monorepo") after **D13**
  reversed the absorb-era exile
  (`.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md`,
  story `.workaholic/stories/work-20260703-184443.md`). The example's
  seeding tickets live in the standalone `qmu/plggmatic` repo's archive,
  **not** here — don't hunt for them.
- `.workaholic/tickets/archive/work-20260531-003055/20260604013259-plgg-view-url-model-reflection.md`
  — the `toUrl`/`onUrlChange` reflection this example has been the live
  consumer of since; after this ticket the codec is derived, and the
  example remains the reflection's showcase — via the scheduler.
- `.workaholic/tickets/archive/work-20260703-184443/20260704011005-vocabulary-articles-example-first.md`
  — the example-code-first docs convention; the rewritten `workbench.md`
  and its compiling twin follow it.
- Sibling tickets **09** (`20260704143009-declarative-ui-vocabulary-and-scheduler-core.md`),
  **10** (`20260704143010-multi-column-renderer.md`), **12**
  (`20260704143012-action-form-components.md`) — this ticket consumes what
  they *landed*; 09's Overview explicitly points the phase-4
  line-count-reduction gate here ("lands **there**, not here"), and 10's
  Considerations pre-announce the half-migrated example as this ticket's
  honest diff baseline.
- `packages/site/workbench.md` + `examples/workbench.ts` — the current
  docs story ("options are atoms and hooks, not config fields", the
  hand-derived stack) that this ticket supersedes for the program half
  while keeping it true for the style half.

## Implementation Steps

1. **Pin the baseline.** Record the before-image before touching anything:
   `git show 5ad57db -- packages/plggmatic-example/src/app.ts | wc -l`
   context plus the current (post-05/06/10) line counts of every
   `src/*.ts` file, specs excluded. Both numbers go into the comparison —
   the 691-line pre-Phase-4 figure is the headline, the half-migrated
   figure keeps the diff honest (ticket 10's stated intent).
2. **Write the declaration** (e.g. `src/declaration.ts`, name per taste):
   Resources over `sections`/`Note` from `data.ts` plus one small mutable
   in-memory collection (absorbing ticket 09's demo dataset if it parked
   one); Menu for the section entries; List/Detail views for
   notes-per-section and the reader; a Query declaration filtering the
   note list; create/delete Actions with confirmation-as-data on the
   mutable collection; the Flow tying them together. Start from the
   example-equivalent declaration in
   `.workaholic/specs/20260704-plggmatic-scheduler-design.md` and diverge
   only where the landed types demand.
3. **Schedule and render.** Pass the declaration through `schedule(...)`;
   satisfy plgg-view's `Application` contract with the derived
   `init`/`update`/`onUrlChange`/`toUrl` and a `view` that applies ticket
   10's multi-column renderer (and ticket 12's form components where the
   scheduled state shows a pending action) to the scheduled state. App
   identity — brand text, scheme-class carrier, `schemeClassCss`
   re-scoping, the scheme-toggle wiring — is the only hand-written view
   code left.
4. **Delete the replaced program.** `parseUrl`/`toUrl`, the hand-written
   `Model`/`Msg`/`update`, `stack`, and the per-column view builders go;
   `app.ts` shrinks to declaration + identity + wiring (or dissolves into
   `declaration.ts` + `app.ts`; keep modules single-purpose). No parallel
   legacy path is kept "just in case".
5. **Retire the crude demo entry** from ticket 09: `bundle.config.ts` back
   to the single `main` entry, drop the second HTML page, revert any
   `stamp.ts` extension. The real app is now the vocabulary's demo.
6. **Port the specs.** Rewrite `app.spec.ts` against the scheduled
   program: init depth, URL round-trip and canonical serialization
   (byte-equal `?s=…&n=…` — the derived codec must clear the oracle's
   bar), junk-URL totality, markup assertions via `renderToString` (root
   column always present, push/truncate depth, `aria-current` selection),
   and the new flows (query filtering; destructive action
   request→confirm/cancel). If sibling ticket 02's explicit-config rule
   is in force, give the package its `plgg-test.config.json` (threshold
   90) rather than relying on defaults.
7. **Record the comparison** in `packages/plggmatic-example/README.md`: a
   short table — hand-written program lines before (691 at `5ad57db`;
   plus the post-10 baseline) vs. declaration + wiring lines after, same
   Prettier settings, specs and `data.ts` excluded on both sides — and
   one sentence on what the deleted lines were (codec, update, stack
   composition, chrome). Update `package.json`'s `description`.
8. **Rewrite the docs example**: `packages/site/workbench.md` tells the
   declaration-first story (the declaration in a fence, what gets
   derived, the URL-is-the-serialized-stack behavior now framework-made,
   the before/after number as the punchline); `examples/workbench.ts`
   compiles the same declaration snippet; `site.config.ts` sidebar entry
   checked; `pane-alignment.md` cross-references verified (the style
   half's "options are atoms" story stays true — do not gut it).
9. **House rules end to end**: no `as`/`any`/`ts-ignore`; Option/Result
   and exhaustive `match` (`plgg-coding-style`); data-last pipelines;
   Prettier `printWidth: 50`; zero new dependencies; no diffs under
   `scripts/` (wiring already exists — verify, don't edit).

## Quality Gate

**Acceptance criteria**

1. `packages/plggmatic-example` contains no hand-written `update`, URL
   codec, or column-stack composition: the program is a declaration
   passed through `schedule(...)` and rendered by the framework's
   multi-column renderer and form components — all imported from
   `plggmatic`, none re-declared. Hand-written view code is app identity
   only.
2. Behavior parity with the workbench: sections → notes → reader
   traversal, `?s=…&n=…` URL reflection with canonical serialization,
   deep-link restore, back/forward, keyed column remounts with entrance
   fade, scheme toggle — all reproduced by the derived program and
   asserted by the ported specs.
3. Vocabulary coverage: the running example demonstrates Menu, List,
   Detail, Query (live note filtering), and a confirmed destructive
   Action through ticket 12's components; ticket 09's crude second entry
   is gone (`bundle.config.ts` has one entry).
4. The before/after comparison is recorded in the example's README with
   the measurement method stated (691 lines at `5ad57db` and the post-10
   baseline vs. the replacement modules, Prettier-identical, specs and
   dataset excluded), and the reduction is substantial — the Phase 4 gate
   is a judgment the numbers must make easy.
5. `packages/site/workbench.md` + `examples/workbench.ts` teach the
   declaration-first story and compile; the built example still ships at
   `/example/` beside the site.
6. `git diff --stat` touches only `packages/plggmatic-example/**` and
   `packages/site/**` (plus a follow-up-ticket note if a framework gap
   was found — never an in-ticket framework patch); no changes under
   `scripts/`, no new dependencies in any `package.json`.

**Verification method**

`scripts/tsc-plgg.sh` clean; `./scripts/test-plggmatic-example.sh` and
`./scripts/test-plggmatic.sh` green; then a **fresh** `scripts/check-all.sh`
(clean rebuild — stale dists must not mask drift against the landed
09/10/12 exports) green end to end, with plggmatic-example coverage above
90 across statements/branches/functions/lines. Build and serve the example
(`npm run build && npm run preview`), drive criterion 2's flow plus the
query filter and the confirm/cancel action in a real browser at a ≥900px
and a <900px viewport, and paste before/after screenshots into the PR
(Phase 4 has no preview env — the side-by-side is the visual check).

**Gate**

All six acceptance criteria hold objectively AND the fresh `check-all.sh`
is green AND the browser drive passes. A surviving hand-written codec or
update, a re-declared framework type, a missing or method-less line-count
record, a still-present crude demo entry, an escape hatch, a coverage dip,
or a `scripts/`/dependency diff fails the ticket.

## Considerations

- **This ticket is the framework's exam, not its patch bay.** If the
  rewrite exposes a vocabulary or renderer gap (something the workbench
  needs that the declaration cannot express), the fix belongs to the
  owning sibling's follow-up ticket; this ticket records the gap and
  blocks on it rather than quietly growing plggmatic. That discipline is
  what makes the line count evidence rather than advertising.
- **The number must survive scrutiny**: exclude specs and `data.ts` on
  both sides, same Prettier, and publish the method next to the number.
  If the honest reduction is unimpressive, that is a roadmap-level signal
  about the vocabulary (report it; do not massage the measurement).
- **Behavior parity, not pixel parity**: markup semantics and physics
  come from ticket 10's renderer; if the derived app differs visibly from
  the old workbench beyond what 10 already changed, that is a renderer
  finding, not something to patch with app CSS.
- **Single-column mode is ticket 11's business** (D10 runtime switch
  included): the rewritten example stays multi-column here; if 11 lands
  first and wants the example as its switch demo, rebase on its landed
  state rather than pre-building the toggle.
- **plggpress is untouched**: the CMS rides the theme tickets (Phase 3)
  and re-layers onto the scheduler in later phases (D1 "re-layered
  gradually"); nothing here migrates plggpress.
- **Deferred**: persistence-backed Resources (HTTP/SQLite) arrive with
  Phase 5's delivery API — the example's mutable collection stays
  in-memory; the guide-site consolidation of the two docs sites is
  ticket 29; any `secondary`/`tertiary` chrome awaits D9's earned-place
  rule.

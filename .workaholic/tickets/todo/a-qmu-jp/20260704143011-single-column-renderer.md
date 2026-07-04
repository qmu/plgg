---
created_at: 2026-07-04T14:30:11+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort:
commit_hash:
category:
depends_on: [20260704143009-declarative-ui-vocabulary-and-scheduler-core.md, 20260704143010-multi-column-renderer.md, 20260704143003-plggmatic-token-matrix-monochrome-default.md, 20260704143005-plggmatic-non-color-design-tokens.md]
---

# plggmatic single-column renderer: one-operation-per-screen projection of the scheduled state, with back behavior and runtime mode switching

## Blocking precondition (read before starting)

**This ticket is NOT startable against the repo as it stands on this
branch.** Its three most load-bearing inputs are *outputs of tickets 09 and
10, which are still in `.workaholic/tickets/todo/a-qmu-jp/`* — none of them
exists yet:

1. The **renderer-seam type** this renderer compiles against
   (`(seam value) => Html<Msg>`) is derived and exported by ticket **09**.
   It does not exist until 09 lands; `grep -rn "seam" packages/plggmatic/src`
   returns nothing today.
2. The **design spec** `.workaholic/specs/20260704-plggmatic-scheduler-design.md`
   (Step 1 tells the implementer to append a single-column addendum to it) is
   *written by ticket 09's mandatory design step*. It does not exist today —
   `ls .workaholic/specs/ | grep scheduler` is empty. Do not create it from
   scratch here; it is 09's artifact.
3. The **`Render/` (or `Declare/`+`Schedule/`) feature directories** under
   `packages/plggmatic/src/` are created by tickets 09/10. Today
   `ls packages/plggmatic/src` shows only `Component Layout Meta Style
   index.ts styleEntry.ts` — no `Render`, `Declare`, or `Schedule`.

**Hard gate:** drive order is 09 → 10 → 11 (roadmap numbering). Do not begin
this ticket until both 09 and 10 are landed on this branch and a fresh
`scripts/check-all.sh` is green with them in. The very first implementation
action (Step 1) is to *read the landed code of 09 and 10*, not to write
anything. Every "proposed" path/name below is ticket 09/10's draft proposal;
the "Inherited seam artifacts" section states exactly which names to confirm
against the landed code, and how.

## Inherited seam artifacts (confirm the exact landed names before coding)

Ticket 09 describes the seam only functionally. Its design (Implementation
Step 3 of `20260704143009-declarative-ui-vocabulary-and-scheduler-core.md`)
derives, from a declaration, all of: the `Model` (flow position/traversal
state, per-collection selection, query state, pending-confirmation as
`Option`, resource slots), the `Msg` union (navigation, selection, query
input, action requested/confirmed/cancelled/completed, resource
arrived/failed, `urlChanged`), the pure pair-shaped
`update: (msg, model) => [Model, Cmd<Msg>]`, the URL codec (`toUrl` +
`onUrlChange`), and **the typed renderer-seam value the mode renderers
consume**. This renderer imports — never re-declares (ticket 10's criterion
1, `policies/quality.md`) — five concrete artifacts. Because 09 has not
landed, pin each by running the command shown, then use the exact landed
name:

- **The renderer-seam value type** — the single argument of
  `(seam value) => Html<Msg>`. Proposed home `packages/plggmatic/src/Schedule/`
  (09 Step 3). Confirm its exported name and module:
  `grep -rn "export type" packages/plggmatic/src/Schedule packages/plggmatic/src/Declare 2>/dev/null`
  and cross-check against the multi-column renderer's import (below), which
  already consumes it — the two renderers MUST import the identical type.
- **The scheduled `Model`, `Msg`, and `update`** — from
  `schedule(...)`. Confirm the entry point:
  `grep -rn "export const schedule\|export type.*Model\|export type.*Msg" packages/plggmatic/src`.
  The `Msg` union is a closed discriminated union tagged by `kind` (house
  idiom — see `packages/plggmatic-example/src/app.ts` lines 73-74 and the
  `switch (msg.kind)` at line 206).
- **The scheduler's parent-navigation `Msg` constructor** — the variant the
  in-UI back affordance dispatches (Overview deliverable 2). It is one arm of
  09's `Msg` union under the "navigation" group; the renderer must NOT invent
  its own back Msg. Confirm the exact `kind` string and any payload:
  `grep -rn "kind:" <the scheduler Msg module found above>` and look for the
  parent/pop/up navigation arm. If 09 landed no parent-navigation arm, that
  is a *seam gap* — amend the scheduler in ticket 09's modules on this branch
  (see Considerations "Seam gaps flow upstream"), never synthesize back
  navigation renderer-side.
- **The derived URL codec** — `toUrl(model): Url` and
  `onUrlChange(url): Msg`, satisfying `plgg-view`'s
  `Application<Model, Msg>` (`packages/plgg-view/src/Program/usecase/application.ts`
  lines 29-52; `toUrl?`/`historyMode?` are the reflection seam). `Url` is
  `packages/plgg-view/src/Program/model/Url.ts` (`{ path, search }` +
  `makeUrl`). Parity criterion 4 asserts `toUrl(model)` is *byte-identical*
  across a mode switch — so this renderer never touches the codec, it only
  proves the model the codec reads is untouched.
- **The multi-column renderer** (ticket 10) — the dispatcher's other arm and
  the parity counterpart. Locate its landed module and the exact exported
  function name:
  `grep -rln "multiColumn\|multi-column" packages/plggmatic/src` — ticket 10
  Step 4 proposes `packages/plggmatic/src/Layout/usecase/multiColumn.ts`, but
  its Overview may have relocated the renderer to a shared `Render/` dir; use
  what landed. Both renderers share one input type and one feature dir
  (Related History, ticket 10).

## Overview

Phase 4 (Scheduler), ticket **11** of the plggpress/plggmatic roadmap —
delivers the **second display mode** promised by **D10** ("Runtime-switchable:
the declaration format is mode-agnostic from day one; the single-column
renderer may ship later, but the vocabulary never encodes a mode") of the
approved decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`. Per **D1**,
plggmatic is the home: design system + UI scheduling framework; this ticket is
pure UI-scheduling surface, no plggpress involvement.

Dependency ticket 09 lands the declarative vocabulary, the `schedule(...)`
derivation (Model, Msg, pair-shaped `update`, total URL codec), and the
**typed renderer seam**. Sibling ticket 10 projects that seam into the
multi-column panes-expanding-rightward mode. This ticket projects the **SAME
seam** into the conventional mode: **one operation per screen** — a menu
screen, a list screen, a detail screen, a confirmation screen — with screen
transitions instead of pane pushes. Three deliverables:

1. **The `singleColumn` renderer** — a pure `(scheduled state) => Html<Msg>`
   over ticket 09's renderer seam. The **current screen is DERIVED, never
   stored**: the deepest defined position in the scheduled traversal (flow
   position → selection → pending confirmation) picks the screen, per ticket
   09's design tenet (g) (mode-specific presentation state lives
   renderer-side *or is derived* — this renderer needs no state at all,
   which is the strongest possible answer to (g)).
2. **Back behavior** — every non-root screen carries a labeled in-UI back
   affordance that dispatches the scheduler's own parent-navigation `Msg`
   (no renderer-local history), and the **browser Back button pops exactly
   one screen** because the URL codec is scheduler-owned and traversal steps
   push history (`historyMode` "push" on navigation, "replace" on typing —
   the reflection discipline `plgg-view`'s `Application` already defines and
   plggmatic-example already exercises).
3. **Runtime mode switching** — a closed `Mode` union
   (`"multiColumn" | "singleColumn"`) plus an exhaustively-matched render
   dispatcher, so the consuming app holds a mode value **beside** the
   scheduled model (never inside it, never in the declaration, never in the
   URL) and the app or the user flips it at runtime. Because both renderers
   are pure projections of one model, a mode switch mid-flow is loss-free by
   construction: same flow position, same selection, same query, same
   pending confirmation, same URL.

**Mode parity is the proof obligation**: the same declaration rendered under
both renderers (ticket 10's multi-column and this single-column) in headless
specs and in the browser demo, with equivalent reachability at every step of
a scripted walk. Ticket 12 adds the action form components; ticket 13
rewrites plggmatic-example declaratively (the phase-4 line-count gate lands
there).

No new package: everything lands inside `packages/plggmatic` (+ demo wiring
in `packages/plggmatic-example`), both already wired into
`scripts/npm-install.sh`, `scripts/build.sh` (the
`cd $REPO_ROOT/packages/plggmatic && npm run build` line), and
`scripts/check-all.sh` — verify the wiring, do **not** edit `scripts/`;
zero new dependencies in any `package.json`.

## Policies

- `workaholic:implementation` / `policies/quality.md` — TypeScript strict
  mode is the sole static-analysis layer and `as`/`any`/`ts-ignore` are
  prohibited; this ticket's two central unions lean on it: `Mode` and the
  derived `Screen` union are closed and consumed with exhaustive `match`,
  so a future third mode or a new screen kind that skips a renderer is a
  `tsc` error, not a blank page. Prettier `printWidth: 50` governs every
  touched `.ts` file.
- `workaholic:implementation` / `policies/test.md` — coverage is gated per
  package; `packages/plggmatic/plgg-test.config.json` sets threshold 90
  (excluding only `/index.ts`, `/styleEntry.ts`), so the renderer, the
  screen derivation, and the mode dispatcher all arrive fully spec'd. Both
  renderers are pure `(state) => Html<Msg>`, so the parity walk runs
  headlessly under plgg-test — no browser needed to keep the number honest.
- `workaholic:design` / `policies/accessibility.md` — the policy snapshot
  records "not observed / not applicable (no UI components)"; that predates
  plggmatic, and the single-column mode is exactly where the house landmark
  discipline (`Layout/model/pane.ts`: closed `PaneRole` → exhaustive
  landmark `Record`, "can never silently degrade to a bare `div`") earns
  its keep — one `main` landmark per screen, the menu screen as a
  `navigation` landmark, and a *labeled* back control, because a
  one-operation-per-screen UI is the mode assistive tech and small screens
  actually get.

## Key Files

- `packages/plggmatic/src/index.ts` — the explicit named-export barrel;
  gains `Mode`, the mode dispatcher, and the single-column renderer.
- `packages/plggmatic/src/Layout/model/pane.ts`,
  `src/Layout/usecase/combinators.ts` — `PaneRole`/`landmarkTag` and the
  `row`/`column`/`pane` combinators; the single-column screen composes
  `column`/pane with `main`/`navigation` roles (renderers MAY import
  Layout — that is their job; the D10 fence bars only
  declaration/scheduler modules from it).
- `packages/plggmatic/src/Component/usecase/navTree.ts`, `button.ts`,
  `textLink.ts`, `typography.ts` — the components screens are assembled
  from: the menu screen is a `navTree` projection; the back affordance is a
  labeled `button`/`textLink`.
- `packages/plggmatic/plgg-test.config.json` — threshold 90; every new
  module is counted.
- `packages/plgg-view/src/Program/usecase/application.ts` —
  `Application<Model, Msg>` with `toUrl`/`onUrlChange`/`historyMode`
  (`"push" | "replace" | "none"`): the mechanism single-column back
  behavior rides on; nothing here changes.
- `packages/plgg-view/src/Program/model/Url.ts` — `Url`/`makeUrl`; the
  address is mode-agnostic, so it must be byte-identical across a mode
  switch.
- Ticket 09's landed modules — the renderer seam, scheduler, and derived
  URL codec (proposed there as `packages/plggmatic/src/Declare/` +
  `src/Schedule/`; consume the paths its design spec actually fixed). The
  five concrete artifacts and the grep commands to confirm their exact
  landed names are enumerated in **Inherited seam artifacts** above — that
  section, not this bullet, is the seam contract.
- Ticket 10's landed multi-column renderer module — the parity counterpart.
  **The single-column renderer goes in the SAME feature dir ticket 10 chose**;
  do not decide the layout independently. Discover it first:
  `grep -rln "multiColumn\|multi-column" packages/plggmatic/src` gives the
  file, `dirname` its `usecase/` gives the feature dir. Then place
  `singleColumn.ts` beside the multi-column renderer's `usecase/`,
  `mode.ts`/`screen.ts` beside its `model/`, and `renderMode.ts` in the same
  `usecase/`, matching that dir's own barrel + naming idioms. Proposed layout
  if 10 created a shared `packages/plggmatic/src/Render/`: `model/mode.ts`,
  `model/screen.ts`, `usecase/singleColumn.ts`, `usecase/renderMode.ts` — but
  the landed dir wins; if 10 kept the renderer under `Layout/usecase/`
  (its Step 4 proposal), single-column lands there too.
- `packages/plggmatic-example/bundle.config.ts`, `index.html`,
  `src/stamp.ts` — the CSR demo harness; the demo entry introduced by
  tickets 09/10 gains the runtime mode toggle. `src/app.ts`/`main.ts` stay
  untouched (their rewrite is ticket 13).
- `.workaholic/specs/20260704-plggmatic-scheduler-design.md` — ticket 09's
  design spec; its renderer-seam contract and tenet (g) resolution bind
  this ticket.
- `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md` — the
  decision record this ticket implements.

## Related History

- `20260704143009-declarative-ui-vocabulary-and-scheduler-core.md` (this
  todo queue, the dependency) — supplies the seam this renderer consumes;
  its design tenet (g) (mode-specific presentation state stays out of the
  scheduled model) is resolved *most strictly* here: this renderer stores
  nothing, it derives the screen. Its Quality Gate criterion 5 promises the
  seam is "proven sufficient" only by a crude demo renderer — this ticket
  and ticket 10 are the real test; seam gaps found here flow back as small
  amendments, not renderer-side workarounds.
- `20260704143010-multi-column-renderer.md` (sibling, same queue) — the
  first mode and this ticket's parity counterpart; drive order lands 10
  before 11 (roadmap numbering). Shared decisions (feature dir, seam
  consumption idioms, landmark composition) are made once, there.
- `.workaholic/tickets/archive/work-20260531-003055/20260604013259-plgg-view-url-model-reflection.md`
  — the `toUrl`/`onUrlChange`/`historyMode` reflection precedent.
  `packages/plggmatic-example/src/app.ts` (its `historyMode` at the
  `Application` literal) is the live "push on traversal, replace on
  typing" oracle; single-column browser-Back-pops-a-screen is that
  mechanism doing its job through the scheduler's derived codec — this
  ticket must not add a second history mechanism.
- `.workaholic/tickets/archive/work-20260701-185044/20260701213410-scaffold-plggmatic-framework-extract-composition.md`
  and `.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md`
  (stories `work-20260701-185044.md`, `work-20260703-184443.md`) — the
  old-meaning plggmatic (app-framework facade) was absorbed into
  `plggpress/src/framework`; today's `packages/plggmatic` arrived with
  commit `6d7a832` as the design-system/framework home. Nothing here
  touches plggpress.
- `20260704143004-palette-override-api-and-scheme-persistence.md` (this
  todo queue) — the scheme-persistence precedent (`vp-appearance`
  localStorage key preserved per D16); if mode choice is ever persisted it
  follows that pattern, but persistence is deferred here (see
  Considerations).

## Implementation Steps

1. **Alignment step (before any `src/` edit).** Read ticket 09's landed
   design spec and ticket 10's landed renderer. Append a short
   single-column addendum to
   `.workaholic/specs/20260704-plggmatic-scheduler-design.md` (or a sibling
   note it links): the `Mode` union, the screen-derivation rule (deepest
   defined position in the scheduled traversal picks the screen; the back
   target is the parent position, obtained from the scheduler — never
   computed ad hoc in the renderer), the `Screen` union's variants
   (menu / list / detail / confirmation, extended only if 09's vocabulary
   demands), and whether pending confirmation is its own screen or a
   renderer-owned overlay (record the choice and why; parity is about
   reachability, not pixel structure). Present at the drive approval gate.
2. **Mode model** (proposed `packages/plggmatic/src/Render/model/mode.ts`,
   final dir = wherever ticket 10 put the multi-column renderer): closed
   `Mode` union `"multiColumn" | "singleColumn"` — pure data, no
   persistence, no DOM. The mode value lives in the CONSUMER's model beside
   the scheduled model; it never enters the declaration, the scheduled
   model, or the derived URL codec (D10).
3. **Screen derivation** (proposed `src/Render/model/screen.ts`): a total,
   pure function from the renderer-seam value to the closed `Screen` union,
   plus the back target as `Option` (root screen has none). Exhaustive
   `match`; junk-tolerant by construction because the scheduled model is
   already total (ticket 09's URL-codec standard). **`Screen` variant set:**
   start from `"menu" | "list" | "detail" | "confirmation"` (the four
   one-operation-per-screen kinds named in Overview deliverable 1). This set
   is *conditional on 09's landed vocabulary* — confirm it covers every
   reachable traversal depth by cross-checking the scheduled `Model`'s
   position/selection/query/pending-confirmation slots
   (`grep -rn "export type.*Model\|selection\|pendingConfirm\|query" <09's
   Model module>`): if 09's Flow/Query vocabulary exposes a traversal state
   with no screen here (e.g. a search-results state distinct from `list`),
   add exactly one `Screen` variant for it and record why in the Step-1
   addendum. The back target comes from the scheduler's parent position —
   obtain it via the scheduler, never recompute it in the renderer
   (Overview deliverable 2). Root screen (the menu) → `none()`.
4. **`singleColumn` renderer** (proposed
   `src/Render/usecase/singleColumn.ts`): `(seam value) => Html<Msg>`
   matching on the derived `Screen`. One operation per screen; exactly one
   `main` landmark per screen; the menu screen composed as a `navigation`
   landmark via `navTree`; every non-root screen renders a labeled back
   affordance dispatching the scheduler's parent-navigation `Msg`;
   destructive-action confirmation per the step-1 record (confirm and
   cancel both dispatch scheduler `Msg`s — the renderer owns zero state).
   Compose `Layout` combinators and `Component` builders; style via
   `style_` parts per house layout rules.
5. **Mode dispatcher** (proposed `src/Render/usecase/renderMode.ts`):
   `(mode) => (seam value) => Html<Msg>` exhaustively matching `Mode` to
   ticket 10's multi-column renderer or `singleColumn`. Adding a `Mode`
   variant must be a compile error here.
6. **Back behavior, end to end**: verify the scheduler's derived
   `historyMode` pushes on traversal steps so browser Back pops one screen
   in single-column mode. If ticket 09 landed a different default, fix it
   THERE (a small amendment to the scheduler), not with renderer-local
   history — this renderer must contain no `window.history` access at all.
7. **Parity specs** (plgg-test, colocated, headless): over one shared
   declaration (the demo declaration from tickets 09/10), drive the
   scheduled `update` through a scripted walk — menu → list → detail →
   query filter → destructive action request → cancel → request → confirm.
   At every step assert: (a) both renderers produce `Html` without crash;
   (b) the sets of dispatchable navigation `Msg`s / hrefs exposed by the
   two trees are equivalent (same reachability); (c) `toUrl` of the model
   is identical regardless of which renderer is on screen; (d) in
   single-column, the back target chains from any screen to the root; (e)
   flipping `Mode` at any step changes only the projection, never the
   model. Plus screen-derivation unit specs (each traversal depth → its
   screen; root → no back target) and landmark assertions (one `main`,
   `nav` on the menu screen, labeled back control).
8. **Demo**: extend the plggmatic-example demo entry from tickets 09/10
   with a visible runtime mode toggle (mode held in the demo app's model
   beside the scheduled model). Drive in a real browser: walk deep in
   multi-column, toggle to single-column mid-flow, observe the same
   arrangement and identical URL, pop screens with both the in-UI back and
   the browser Back button, complete a confirm/cancel round, toggle back.
   `app.ts`/`main.ts` untouched.
9. **Export surface + prose**: `packages/plggmatic/src/index.ts` is an
   explicit named-export barrel (blocks re-exporting from `plggmatic/Meta`,
   `plggmatic/Layout`, `plggmatic/Component`). Add a new export block for the
   render/mode surface, mirroring the existing `type`-prefixed idiom, with
   these named exports: the `Mode` type, the mode dispatcher (proposed
   `renderMode`), the `singleColumn` renderer, and the `Screen` type (plus
   any screen-derivation helper the seam requires a consumer to call). **The
   dispatcher, not `singleColumn` alone, is the public entry** — a consuming
   app calls `renderMode(mode)(seamValue)`; `singleColumn`/`multiColumn` are
   exported for direct/testing use. If ticket 10 already added a
   `Layout/index.ts` (or `Render/index.ts`) sub-barrel and re-exported the
   multi-column renderer through it, route the single-column exports through
   the SAME sub-barrel and let the root `index.ts` re-export the sub-barrel —
   match ticket 10's landed barrel path. `Mode`/`Screen`/`singleColumn`/
   dispatcher are all counted toward coverage (only `/index.ts` and
   `/styleEntry.ts` are excluded per `plgg-test.config.json`). Extend the
   `packages/plggmatic/README.md` scheduler section with the example-first
   two-modes-one-declaration snippet.
10. **House rules end to end**: no `as`/`any`/`ts-ignore`; Option not
    null/undefined; exhaustive `match` over every union; data-last
    pipelines; Prettier `printWidth: 50`; zero new dependencies; no diffs
    under `scripts/` (plggmatic and plggmatic-example are already wired
    into `npm-install.sh`/`build.sh`/`check-all.sh` — verify, don't edit).

## Quality Gate

**Acceptance criteria**

1. `Mode` is a closed union and the render dispatcher matches it
   exhaustively — commenting out a renderer arm or adding a third variant
   is a `tsc` error, not a runtime fallback.
2. The single-column renderer is a pure projection: current screen and
   back target are derived from the scheduled state; the renderer modules
   contain no mutable state, no `window`/`document`/`window.history`
   access, and no mode or screen notion leaks into the declaration
   vocabulary, the scheduled model, or the URL codec (D10 audit on the
   diff).
3. Back behavior is dual and single-sourced: every non-root screen shows a
   labeled back affordance dispatching a scheduler `Msg`, and the browser
   Back button pops exactly one screen via the scheduler's URL codec — no
   renderer-side history mechanism exists.
4. Runtime mode switching is loss-free: flipping the mode at ANY step of
   the scripted walk preserves flow position, selection, query text, and
   pending confirmation, and `toUrl(model)` is byte-identical before and
   after the flip.
5. Mode parity is proven against ticket 10's renderer: the shared
   declaration drives both renderers through the full scripted walk in
   headless specs with equivalent reachability at every step (criterion
   7's assertions), and the browser demo shows the same declaration under
   both modes with a working runtime toggle.
6. Landmarks hold: exactly one `main` per screen, the menu screen is a
   `navigation` landmark, the back control is labeled (asserted in specs,
   not eyeballed).
7. No new dependencies in any `package.json`; `git diff --stat` shows no
   changes under `scripts/`; `packages/plggpress` and
   `packages/plggmatic-example/src/app.ts` untouched.

**Verification method**

`scripts/tsc-plgg.sh` clean; `./scripts/test-plggmatic.sh` and
`./scripts/test-plggmatic-example.sh` green; then a **fresh**
`scripts/check-all.sh` (clean rebuild — stale dists must not mask drift)
green end to end, with plggmatic above its configured threshold 90 across
statements/branches/functions/lines including all new Render modules.
Manually drive the demo per Implementation Step 8 and confirm criteria
3–5's browser-visible halves (mid-flow toggle, identical URL, browser Back
popping one screen, confirm/cancel round in single-column).

**Gate**

All seven acceptance criteria hold objectively AND the fresh
`check-all.sh` is green AND the browser demo drive passes. A single escape
hatch, any mode/screen notion inside the declaration or scheduler modules,
renderer-local navigation state or a second history mechanism, a parity
spec that skips steps of the walk, a coverage dip, or a `scripts/` diff
fails the ticket.

## Considerations

- **Sequencing vs. ticket 10**: the hard `depends_on` is ticket 09 (the
  renderer seam types this ticket compiles against), but the parity proof
  needs ticket 10's multi-column renderer as landed. Drive order already
  puts 10 first; if 10 slips, this ticket blocks rather than substituting
  ticket 09's crude demo renderer as the parity counterpart — parity
  against a throwaway proves nothing.
- **Seam gaps flow upstream**: if the seam from ticket 09 turns out to
  lack something the screen derivation needs (e.g. an explicit parent
  position), amend the scheduler there in this branch — do not
  reverse-engineer it renderer-side. A fresh `check-all.sh` after any such
  amendment is the arbiter.
- **Mode persistence is deferred**: the mode value is in-memory app state
  here. Persisting a user's choice (localStorage, following ticket 04's
  scheme-persistence pattern) waits for a real consumer — revisit trigger:
  ticket 20 admin-ui-on-scheduler choosing a default mode for small screens.
  The D16 caution to respect when that day comes (transcribed from the
  decision record so it need not be looked up): **D16 — `--vp-*` migration:
  "Clean cutover to `--pm-*` (breaking-changes-OK), except the
  theme-persistence localStorage key `vp-appearance` is preserved so
  visitors' theme choices survive."** The lesson for a future mode key: a
  persisted-preference storage key is a compatibility surface — pick the key
  name deliberately and do not rename it casually, exactly as `vp-appearance`
  was grandfathered through the `--pm-*` cutover. Low impact here because
  nothing is persisted in this ticket.
- **Automatic mode selection deferred**: a media-query-driven default
  (narrow viewport → single-column) is deliberately out of scope; mode
  stays an explicit value the app or user sets. The `Mode` type leaves
  room; revisit with plggpress adoption (tickets 07/20).
- **Confirmation screen vs overlay**: step 1 records the choice per
  ticket 09's tenet (g) resolution. The two modes MAY differ in structure
  (multi-column overlay, single-column dedicated screen) — parity is
  reachability and model equality, not identical DOM.
- **Ticket 13 will rewrite the example**: keep the demo-entry wiring
  small and disposable; the declarative rewrite of `app.ts` (and the
  phase-4 line-count-reduction gate) belongs there.
- **Ubiquitous language**: "mode", "screen", and "back target" enter the
  project vocabulary here — one word per concept across types, specs,
  README, and commit messages.

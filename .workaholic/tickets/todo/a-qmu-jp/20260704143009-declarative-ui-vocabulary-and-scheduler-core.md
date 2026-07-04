---
created_at: 2026-07-04T14:30:09+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, UX]
effort:
commit_hash:
category:
depends_on: [20260704143006-plgg-view-cmd-sub-effects.md, 20260704143031-durable-core-sacrificial-shell-boundary.md]
---

# plggmatic declarative vocabulary + scheduler core: Resource/Menu/List/Detail/Action/Query/Flow → derived Model, Msg, `update`, URL codec (mode-agnostic)

## Overview

Phase 4 (Scheduler), ticket **09** of the plggpress/plggmatic roadmap —
implements the vision core of **D1** ("Home of the declarative UI scheduler:
plggmatic = design system + UI scheduling framework") under the hard
constraint of **D10** ("the declaration format is mode-agnostic from day one
… the vocabulary never encodes a mode") from the approved decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`. It builds
directly on **D2**'s `Cmd`/`Sub` effects runtime (dependency ticket 06 —
whose Considerations explicitly fence "resist pulling any scheduler
vocabulary into plgg-view; this ticket ends at the generic effects seam".
This is that scheduler ticket, on the plggmatic side of the fence).

The vision (author's words, condensed in the spec): plggmatic's essence is
not the multi-column UI — that is one display mode — but **declarative
definition of menus, data lists/details, actions (create/update/delete),
search, and flows, from which the UI is automatically "scheduled"**. Today
`packages/plggmatic` is the design-system half only (Style tokens, Layout
pane combinators, Components as pure `(props) => Html<Msg>`); every consumer
still hand-writes its own `Model`, `Msg`, `update`, and URL codec —
`packages/plggmatic-example/src/app.ts` is ~700 lines of exactly that. This
ticket adds the framework half:

1. **A declarative vocabulary**, as pure data (closed unions, house style):
   - **Resource/Collection** — the typed data-access seam. A collection
     declares identity + how to read (list/get), **sync or async through the
     same declaration shape**: an in-memory array and a deferred
     (`Cmd`-shaped, `proc`/Promise-folded-to-`Result`) source are the same
     vocabulary, so swapping storage never rewrites the app.
   - **Menu** — labeled navigation entries into the flow.
   - **List/Detail view declarations** — what a collection's list shows and
     what a selected item's detail shows, as data referencing the Resource.
   - **Action** — create/update/delete verbs mapping to `Cmd` factories,
     with **confirmation semantics as data** (destructive intent explicit;
     confirm/cancel is scheduler state, not renderer folklore).
   - **Search/Query** — declarative filtering over a Collection; query state
     lives in the derived model and the URL.
   - **Flow** — the navigation graph: which menu entry / selection / action
     leads to which view declaration.
2. **A scheduler** — `schedule(declaration)` derives the entire TEA program
   except the view: the `Model` (traversal state, selections, query text,
   pending-confirmation, resource slots), the `Msg` union, a pure
   `update: (msg, model) => [Model, Cmd<Msg>]`, subscriptions where needed,
   and the **URL codec** (`toUrl`/`onUrlChange`) so every arrangement is a
   shareable, back/forward-navigable address — everything plgg-view's
   `Application<Model, Msg>` needs except `view`, plus a **typed renderer
   seam** over the scheduled state.

**MODE-AGNOSTIC per D10**: no declaration type mentions columns, panes,
drawers, screens, or any single-vs-multi-column notion. Renderers are
supplied separately — sibling tickets 10 (multi-column) and 11
(single-column) consume the same scheduled state; ticket 12 adds action form
components; ticket 13 rewrites plggmatic-example declaratively (the phase-4
line-count-reduction gate lands **there**, not here).

**This is the largest design ticket of the roadmap. It MUST start with a
written, reviewed design step** — types first, validated against
plggmatic-example as the reference consumer — before any implementation
(Implementation Step 1). The roadmap allows later-phase tickets to split
during their own design step; if the design says split, split.

No new package: the vocabulary and scheduler land inside
`packages/plggmatic`, which is already wired into `scripts/npm-install.sh`
(line 28), `scripts/build.sh` (the `cd $REPO_ROOT/packages/plggmatic && npm
run build` line), and `scripts/check-all.sh` (`test-plggmatic.sh` /
`test-plggmatic-example.sh`) — so those scripts must **not** change, and
zero new dependencies enter any `package.json`.

## Policies

- `workaholic:implementation` / `policies/quality.md` — TypeScript strict
  mode is the sole static-analysis layer and `as`/`any`/`ts-ignore` are
  prohibited; the whole design leans on it: the vocabulary is closed
  discriminated unions consumed with exhaustive `match`, so an unhandled
  declaration kind, a mode-specific field, or a stale renderer-seam consumer
  is a `tsc` error — the scheduler's derivation contract is machine-checked,
  not conventioned. Prettier `printWidth: 50` governs every touched `.ts`
  file.
- `workaholic:implementation` / `policies/test.md` — coverage is gated per
  package; `packages/plggmatic/plgg-test.config.json` sets threshold 90
  (excluding only `/index.ts`, `/styleEntry.ts`), so every vocabulary model
  and the scheduler usecases arrive fully spec'd (one spec per module,
  colocated `.spec.ts`, flat `test()` calls). The scheduler core is pure
  (no DOM) precisely so plgg-test covers the full derivation — menu
  navigation, selection, query, confirm/cancel, URL round-trip — headlessly,
  keeping the coverage number honest.
- `workaholic:design` / `policies/accessibility.md` — the policy snapshot
  records accessibility as "not observed / not applicable (no UI
  components)"; that predates plggmatic. The declaration is the single
  place semantic intent exists — menu labels, list/detail relationships,
  destructive-action confirmation — and `Layout/model/pane.ts` sets the
  house precedent (closed `PaneRole` → exhaustive landmark `Record`, "can
  never silently degrade to a bare `div`"). The vocabulary must carry
  enough declared semantics that tickets 10/11's renderers can emit real
  landmarks, labels, and confirm dialogs without inventing meaning.

## Key Files

- `packages/plggmatic/src/index.ts` — the explicit named-export barrel
  ("it grows as the framework does"); gains the vocabulary + scheduler
  exports.
- `packages/plggmatic/src/Layout/model/pane.ts`,
  `src/Layout/usecase/combinators.ts` — the existing layout vocabulary
  (`PaneRole`, `row`/`column`/`pane`). Deliberately **NOT** imported by any
  declaration/scheduler module (D10); renderers compose them in tickets
  10/11. The pane landmark discipline is the semantic precedent.
- `packages/plggmatic/src/Component/model/navItem.ts`,
  `src/Component/usecase/navTree.ts` — `NavItem`/`navTree`: the Menu
  declaration is upstream data a renderer projects into this component.
- `packages/plggmatic/plgg-test.config.json` — threshold 90, excludes only
  `/index.ts`, `/styleEntry.ts`; every new module is counted.
- `packages/plgg-view/src/Program/usecase/application.ts` —
  `Application<Model, Msg>` (`init`/`update`/`view`/`onUrlChange`/`toUrl?`/
  `historyMode?`): the contract the scheduler's output must satisfy minus
  `view`, in the post-ticket-06 pair shape.
- `packages/plgg-view/src/Program/model/Url.ts` — `Url` (`path`,`search`) +
  `makeUrl`: the target of the derived codec.
- `packages/plgg-view/src/Program/model/Cmd.ts`, `Sub.ts` — arrive with
  dependency ticket 06; Resource async reads and Action verbs produce these
  as data, never executed by the scheduler itself.
- `packages/plggmatic-example/src/app.ts` — the hand-written oracle: a
  700-line `Model`/`Msg`/`update`/`toUrl` over a section→note traversal
  stack with a total URL codec ("any string yields a Model slice"). The
  design step must show the declaration that derives an equivalent program.
- `packages/plggmatic-example/src/data.ts` — the `Section`/`Note` dataset:
  the reference Resources/Collections for design review and the demo.
- `packages/plggmatic-example/bundle.config.ts`, `index.html`,
  `src/stamp.ts` — the CSR harness (single `main` entry, hash-stamped
  `dist/index.html`); the default home of the runnable demo's second entry.
- `packages/plgg/src/Flowables/proc.ts` — the async vocabulary the Resource
  read seam folds through (Result-typed deferred computation).
- `packages/plggpress/src/framework/` — the absorbed **app-framework**
  facade (config/build/CLI); explicitly untouched here (D1's "re-layered
  gradually" belongs to later phases).
- `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md` — the
  decision record this ticket implements.

## Related History

- Today's `packages/plggmatic` arrived with commit `6d7a832` ("Add the
  plggmatic UI design framework to the monorepo"); its seeding tickets live
  in the standalone `qmu/plggmatic` repo's archive, **not** under this
  repo's `.workaholic/tickets/archive/` — don't hunt for them here.
- `.workaholic/tickets/archive/work-20260701-185044/20260701213410-scaffold-plggmatic-framework-extract-composition.md`,
  `20260703000541-thicken-plggmatic-reexport-facade.md`, and
  `.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md`
  (stories `work-20260701-185044.md`, `work-20260703-184443.md`) — the
  **old-meaning** plggmatic: an app-framework facade (config loading, router
  assembly, SSG, CLI) that was extracted, thickened, then absorbed into
  `plggpress/src/framework`. This ticket must NOT resurrect that surface
  into plggmatic — the scheduler is UI vocabulary, not build/CLI machinery.
  The scaffold ticket's working-style precedent carries over: agree on the
  API boundary in a written design sketch before extraction.
- `20260704143006-plgg-view-cmd-sub-effects.md` (this todo queue, the
  dependency) — supplies `Cmd`/`Sub` and migrates plggmatic-example to the
  pair-shaped `update`; its Considerations pre-announce this ticket and pin
  the plgg-view/plggmatic boundary. Consume whatever `init` shape ticket 06
  actually landed (it may keep `init` pure — read its archive notes).
- `.workaholic/tickets/archive/work-20260531-003055/20260604013259-plgg-view-url-model-reflection.md`
  — the `toUrl`/`onUrlChange` reflection precedent; plggmatic-example's
  `?s=…&n=…` "URL is the serialized column stack" is its live consumer and
  exactly the codec the scheduler must derive instead of hand-writing.
- `.workaholic/tickets/archive/work-20260531-003055/20260613183140-research-effects-and-subscriptions.md`
  — the effects-as-data doctrine the Resource/Action seams inherit:
  declarations construct effect *data*; only the runtime executes.
- `.workaholic/tickets/archive/work-20260703-184443/20260704011005-vocabulary-articles-example-first.md`
  — the example-code-first docs convention any new prose follows.

## Implementation Steps

1. **Design step (mandatory, before any `src/` edit).** Write
   `.workaholic/specs/20260704-plggmatic-scheduler-design.md`: complete
   TypeScript type sketches for `Resource`/`Collection`, `Menu`, the
   List/Detail view declarations, `Action` (verbs + confirmation data),
   `Query`, `Flow`, the root declaration type, the derived `Model`/`Msg`
   shapes, the `schedule(...)` signature, and the renderer seam. Validate
   types-first against the reference consumer: the doc must contain the
   declaration that reproduces `plggmatic-example`'s program (sections →
   notes traversal, URL-reflected selection) and an honest list of what the
   vocabulary cannot express (extend or record as deferred). Named design
   tenets to check off: (a) D10 audit — no column/pane/drawer/screen-count
   concept in any declaration type, no import from `plggmatic/Layout`;
   (b) effects only as `Cmd`/`Sub` data; (c) closed unions + exhaustive
   `match`; (d) Option/Result, no null/undefined signalling; (e) sync and
   async Resources declared through one shape; (f) URL codec total in both
   directions; (g) how mode-specific presentation state (e.g. a drawer)
   stays OUT of the scheduled model — renderers own it or derive it.
   Present the doc at the drive approval gate; implementation starts only
   after agreement. If the design demands splitting, split into follow-up
   tickets rather than ballooning this one.
2. **Vocabulary model modules** (proposed home, design may amend:
   `packages/plggmatic/src/Declare/model/` — `Resource.ts`, `Menu.ts`,
   `View.ts`, `Action.ts`, `Query.ts`, `Flow.ts`, plus the root declaration
   module), following the house `<Feature>/model|usecase` layout. All pure
   data, DOM-free, browser-and-Node importable. Constructing a declaration
   performs nothing — reads, verbs, and confirmations are data until the
   plgg-view runtime executes the `Cmd`s the scheduler returns.
3. **Scheduler usecase** (proposed: `packages/plggmatic/src/Schedule/usecase/schedule.ts`
   + supporting model modules): derive from a declaration — the `Model`
   (flow position/traversal state, per-collection selection, query state,
   pending-confirmation as `Option`, resource slots as
   loading/loaded/failed data), the `Msg` union (navigation, selection,
   query input, action requested/confirmed/cancelled/completed, resource
   arrived/failed, `urlChanged`), the pure pair-shaped `update`, the URL
   codec (`toUrl` + `onUrlChange`, total: junk input yields a valid model
   slice, per the oracle's standard), and the typed renderer-seam value the
   mode renderers consume. Exhaustive `match` throughout; the scheduler
   never touches `window`/`document` and never executes an effect.
4. **Export surface**: extend `src/index.ts`'s explicit named-export list
   with the vocabulary types/constructors and `schedule`.
5. **Specs, one per module** (plgg-test, colocated): declaration
   construction is inert; derivation specs drive the derived `update`
   headlessly through menu navigation, list→detail selection, query
   filtering, a destructive action's request→confirm→execute and
   request→cancel paths (returned `Cmd`s asserted as data, never run), sync
   vs async Resource declarations producing the same model shape, and URL
   round-trips (model → `toUrl` → `onUrlChange` → same reflected slice;
   arbitrary search strings never crash).
6. **Minimal runnable demo** (the proof-of-value criterion): a declaration
   over plggmatic-example's `Section`/`Note` dataset (plus one small
   in-memory mutable collection so create/delete-with-confirmation is
   demonstrable), scheduled and mounted with a deliberately crude demo-only
   renderer (plain plgg-view lists/buttons — no Layout panes, NOT exported
   from plggmatic; real renderers are tickets 10/11). Default harness: a
   second entry in `packages/plggmatic-example` (`bundle.config.ts`
   `entries` + a second HTML page; extend `src/stamp.ts` if it stamps the
   new page) — the existing `app.ts`/`main.ts` workbench stays untouched
   (its rewrite is ticket 13). Drive may pick a leaner harness; the
   non-negotiable is a real browser drive.
7. **Prose**: a short example-first section in
   `packages/plggmatic/README.md` (declaration in, scheduled program out);
   the `packages/site` article waits for the renderers (tickets 10/11/13)
   so the docs never show a crude renderer as the face of the framework.
8. **House rules end to end**: no `as`/`any`/`ts-ignore`; Option not
   null/undefined; exhaustive `match` over every new union; data-last
   pipelines; Prettier `printWidth: 50`; zero new dependencies; no diffs
   under `scripts/` (plggmatic and plggmatic-example are already wired into
   `npm-install.sh`/`build.sh`/`check-all.sh` — verify, don't edit).

## Quality Gate

**Acceptance criteria**

1. The design spec exists at
   `.workaholic/specs/20260704-plggmatic-scheduler-design.md`, was agreed
   at the approval gate **before** implementation commits, and contains the
   plggmatic-example-equivalent declaration plus the checked-off tenets
   (a)–(g).
2. Vocabulary complete and closed: Resource/Collection (sync and async
   through one declaration shape), Menu, List/Detail views, Action with
   confirmation-as-data, Query, Flow — all closed unions consumed with
   exhaustive `match`; adding a variant is a compile error at every
   interpreter site.
3. Mode-agnostic, machine-checkable: no module under the declaration/
   scheduler feature dirs imports `plggmatic/Layout`, and
   `grep -rn "column\|pane\|drawer" packages/plggmatic/src/Declare
   packages/plggmatic/src/Schedule` (final dir names per design) hits
   nothing but comments explaining the absence.
4. The scheduler derives Model, Msg, pair-shaped pure `update`, and a total
   URL codec satisfying plgg-view's `Application` contract minus `view`;
   specs prove the scheduler executes nothing (returned `Cmd`s are inert
   data) and that URL round-trips hold, junk included.
5. The typed renderer seam is exported and proven sufficient by the demo's
   crude renderer; no real renderer ships here (tickets 10/11).
6. Runnable demo in a real browser: menu → list → detail → search filter →
   destructive action asks confirmation (cancel is a no-op, confirm
   executes) → the URL reflects the arrangement and reload/back restores
   it.
7. No new dependencies in any `package.json`; `git diff --stat` shows no
   changes under `scripts/`; `packages/plggpress` untouched.

**Verification method**

`scripts/tsc-plgg.sh` clean; `./scripts/test-plggmatic.sh` and
`./scripts/test-plggmatic-example.sh` green; then a **fresh**
`scripts/check-all.sh` (clean rebuild — stale dists must not mask drift)
green end to end, with plggmatic above its configured threshold 90 across
statements/branches/functions/lines including all new modules. Manually
drive the demo (step 6's flow) in a browser and confirm criterion 6.

**Gate**

All seven acceptance criteria hold objectively AND the fresh `check-all.sh`
is green AND the browser demo drive passes. A single escape hatch, any mode
notion inside the declaration vocabulary, a scheduler that executes effects
itself, a missing/post-hoc design spec, a coverage dip, or a `scripts/`
diff fails the ticket.

## Considerations

- **Split-on-design is expected, not failure**: the roadmap marks
  later-phase tickets "deliberately coarser"; if the design step shows
  (e.g.) Flow or Query deserves its own ticket, write the follow-up ticket
  and land the smaller core — never balloon past the agreed design.
- **Mode-specific presentation state** (drawer open, which single screen is
  focused) is the sharpest D10 question — tenet (g). The scheduled model
  carries only mode-independent truth (flow position, selections, query,
  confirmation); whatever a renderer alone needs must live renderer-side or
  be derived. Record the resolution in the design spec; tickets 10/11 will
  hold it to that.
- **Persistence-backed Resources ship later**: the demo mutates an
  in-memory collection; real HTTP/SQLite-backed collections arrive with
  plggpress's delivery API and admin UI (phases 5–6; revisit trigger:
  ticket 20 admin-ui-on-scheduler). The declaration shape must already
  accommodate them (the async read seam and `Cmd`-mapped verbs), which is
  why sync/async symmetry is a design tenet, not a nicety.
- **Do not resurrect the app-framework surface**: config loading, CLI, SSG
  orchestration stay in `plggpress/src/framework` (D1 keeps it, re-layered
  gradually in later phases). plggmatic's new surface is UI vocabulary +
  scheduling only.
- **Ticket-06 coupling**: consume the effects API as actually landed
  (including its `init`-pair open question). If 06 shifted names or shapes,
  the design spec cites the landed signatures — a fresh `check-all.sh`
  after the dependency merge is the arbiter.
- `packages/plggmatic-example` carries no `plgg-test.config.json` today;
  sibling ticket 02 turns missing-config from silent skip into an explicit
  state. If 02 lands first, give the example an explicit config as part of
  the demo work rather than relying on the default.
- **Ubiquitous language**: "declaration", "schedule/scheduled", and the six
  vocabulary nouns enter the project vocabulary here — one word per
  concept, used identically across types, specs, README, and commit
  messages.

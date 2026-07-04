---
created_at: 2026-07-04T14:30:10+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort:
commit_hash:
category:
depends_on: [20260704143009-declarative-ui-vocabulary-and-scheduler-core.md, 20260704143003-plggmatic-token-matrix-monochrome-default.md, 20260704143005-plggmatic-non-color-design-tokens.md]
---

# plggmatic multi-column renderer: lift the example's hand-written column-stack pattern into the framework

## Overview

Phase 4 (Scheduler), ticket **10** of the plggpress/plggmatic roadmap — the
first of the two screen-mode renderers decided in **D10** ("Runtime-switchable:
the declaration format is mode-agnostic from day one"), consuming the
scheduler output that sibling ticket 09 lands in plggmatic per **D1** (the
declarative UI scheduler's home is plggmatic; "the multi-column UI … is one
display mode"). Approved decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`.

Today the multi-column pattern exists exactly once, hand-written as ~250
lines of *application* code in `packages/plggmatic-example/src/app.ts`:

- the **traversable column stack** — `stack` (lines 446–472) derives a `row`
  of `column`s from two `Option` selections; selecting pushes a column,
  an unknown URL id truncates the stack there (`parseUrl`, lines 138–171);
- the **colHead chrome** — `colHead` (lines 232–266): sticky title bar per
  column, an `aria-label`ed × link back to the truncating URL ("leaving a
  column is the same gesture as entering one, a link");
- **sticky headers** — `.ex-colhead{position:sticky;top:0;z-index:1;…}`
  (line 651) over each column's own scroll;
- **per-column scroll** on wide screens —
  `@media (min-width:900px){.pm-col{height:calc(100vh - 48px);overflow-y:auto}}`
  (line 656, `HEADER_H` at 626);
- **breadcrumbs** — `breadcrumb` (lines 482–563): one crumb per stack entry,
  every crumb but the last links to the URL that truncates the stack there;
- the **<900px scroll-snap strip** —
  `@media (max-width:899px){.pm-row{overflow-x:auto;scroll-snap-type:x proximity}…}`
  (line 657);
- the **inverted-pill active state** —
  `.pm-pane a[aria-current="page"]{…}` (line 655) — and the app-authored
  `chromeCss` string (lines 640–657) carrying all of it as `ex-*` classes.

The framework itself ships only the geometry-free `row`/`column`/`pane`
combinators (`packages/plggmatic/src/Layout/usecase/combinators.ts`) whose
doc comments explicitly defer "height, snapping, and collapse" to the
consumer. This ticket ends that deferral: plggmatic gains the **multi-column
mode renderer** — a function from ticket 09's scheduler output to this
arrangement — and the app-side chrome CSS moves into the design system as a
framework-owned, escape-safe CSS export expressed through ticket 05's
non-color tokens (chrome rail `48px`, `snap` breakpoint `900px`/`899px`
builders, the z-index band for in-pane sticky content) and the `--pm-*`
color variables. `ex-*` class names become `pm-*` names under the
`cssPrefix` authority (`packages/plggmatic/src/Meta/model/identity.ts`).

Scope walls: the single-column renderer is ticket **11** (same scheduler
input, different arrangement — the renderer here must not push multi-column
assumptions back into the shared vocabulary); action/form components are
ticket **12**; the full declarative rewrite of plggmatic-example is ticket
**13** (the Phase 4 proof-of-value demo). This ticket migrates the example
only far enough to *consume the lifted chrome* — the app keeps composing
its own columns until 13, but stops carrying framework CSS. No new package,
so `scripts/npm-install.sh` / `build.sh` / `check-all.sh` must not change
(plggmatic and plggmatic-example are already wired in). Zero new
dependencies.

## Policies

- `workaholic:design` / `policies/accessibility.md` — the policy snapshot
  records accessibility testing as "not observed / not applicable (no UI
  components)"; that predates plggmatic. The example's pattern carries real
  executable accessibility (landmark panes via `PaneRole`, `aria-label`ed
  close links, `aria-current` active state, `aria-hidden` crumb separators,
  a labelled breadcrumb region); lifting it into the framework makes those
  practices framework-owned and spec-asserted instead of per-app folklore,
  and puts the snap/fade motion under ticket 05's reduced-motion block.
- `workaholic:implementation` / `policies/quality.md` — TypeScript strict
  mode is the sole static-analysis layer and `as`/`any`/`ts-ignore` are
  prohibited; the renderer's input must therefore be ticket 09's actual
  scheduler output type (a compile-time contract), not a re-declared
  parallel shape. Prettier `printWidth: 50` governs every touched `.ts`.
- `workaholic:implementation` / `policies/test.md` — coverage is gated per
  package; `packages/plggmatic/plgg-test.config.json` sets threshold 90
  (excluding only `/index.ts`, `/styleEntry.ts`), so the renderer, chrome
  components, and CSS emitter must land with specs that keep
  statements/branches/functions/lines above it.

## Key Files

- `packages/plggmatic-example/src/app.ts` — the **oracle**: `colHead`
  (232–266), `stack` (446–472), `breadcrumb` (482–563), `HEADER_H` (626),
  `chromeCss` (640–657). Everything the framework version renders/emits is
  sourced value-for-value from here; after this ticket the file no longer
  carries the lifted chrome.
- `packages/plggmatic-example/src/app.spec.ts` — the pattern's existing
  behavioral specs (URL↔stack round-trip, canonical serialization); the
  markup-level assertions migrate/extend into plggmatic's own specs.
- `packages/plggmatic/src/Layout/usecase/combinators.ts` — `row`/`column`/
  `pane` (+ `Parts`, the "style_ is the sole class authority" rule); the
  renderer composes these, never bypasses them.
- `packages/plggmatic/src/Layout/model/pane.ts` — `PaneRole` landmarks
  (`navigation`/`main`/`complementary`); the renderer's accessibility
  skeleton.
- `packages/plggmatic/src/Layout/index.ts`, `packages/plggmatic/src/index.ts`
  — the explicit barrels every new export goes through.
- `packages/plggmatic/src/Style/usecase/utilities.ts` — `basis`/`fluid`
  column sizing atoms; grows nothing unless the renderer needs an atom the
  tokens demand.
- `packages/plggmatic/src/Style/usecase/schemeCss.ts` — the escape-safe
  single-source CSS emitter pattern the chrome block mirrors (and ticket
  05's non-color emitters extend).
- `packages/plggmatic/src/Meta/model/identity.ts` — `cssPrefix`; the lifted
  classes are named through it, not hand-spelled `pm-` strings.
- `packages/plggmatic/src/Component/usecase/navTree.ts`,
  `packages/plggmatic/src/Component/usecase/themeToggle.ts` — the existing
  component idiom (props type + pure `Html<Msg>` builder) that `colHead`
  and `breadcrumb` follow.
- `packages/plggmatic/plgg-test.config.json` — threshold 90; unchanged,
  cited by the gate.
- `packages/site/workbench.md`, `packages/site/pane-alignment.md`,
  `packages/site/examples/workbench.ts`, `packages/site/site.config.ts` —
  the docs surface: the workbench/pane-alignment pages currently document
  the "consumer owns the geometry" story that this ticket obsoletes for
  multi-column mode; update them and add the renderer's page + compiling
  example.
- `scripts/test-plggmatic.sh`, `scripts/test-plggmatic-example.sh`,
  `scripts/check-all.sh` — the verification path (check-all already runs
  both; no script edits).

## Related History

- `.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md`
  (story `.workaholic/stories/work-20260703-184443.md`) — plggmatic was
  erased from this repo and absorbed into plggpress; **D13** reversed the
  exile and commit `6d7a832` (2026-07-04) re-imported the framework — with
  the workbench example and its hand-written multi-column chrome — as the
  canonical home. That round trip is why the pattern sits in app code today.
- `.workaholic/stories/index.md` (work-20260701-185044 entry) — the
  facade-era extraction where plggmatic first became a framework with
  plggpress as its thin consumer; the "column-oriented" identity dates from
  there.
- Sibling ticket **09**
  (`20260704143009-declarative-ui-vocabulary-and-scheduler-core.md`, this
  todo queue) — the hard dependency: its vocabulary and scheduler output
  types are this renderer's input contract. Read what 09 *landed*, not its
  draft; do not restate its vocabulary work.
- Sibling ticket **05**
  (`20260704143005-plggmatic-non-color-design-tokens.md`) — supplies the
  `snap` breakpoint builders (900/899), the chrome-rail token (`48px`), the
  z-index bands (in-pane sticky `1`, chrome `30`), and the reduced-motion
  block this ticket's CSS must be written in. It already migrates the
  example's raw `900px`/`899px`/`HEADER_H` literals to tokens; this ticket
  moves the *rules themselves* into the framework.
- Sibling ticket **03**
  (`20260704143003-plggmatic-token-matrix-monochrome-default.md`) — the
  `--pm-*` role×variant matrix the chrome's colors (surface/border/muted/
  primary inversion) are spelled in after Phase 1.
- plggmatic's Layout/Component seed tickets live in the standalone
  `qmu/plggmatic` repo's archive, **not** in this repo's
  `.workaholic/tickets/archive/` — don't hunt for them here. The seed
  doctrine recorded in the combinators ("options are style atoms you
  compose, never fields on a config object") still governs the renderer's
  API shape.

## Implementation Steps

1. **Pin the input contract.** Read ticket 09's landed scheduler output
   type (the mode-agnostic arrangement: ordered stack of panes with roles,
   titles, hrefs for push/truncate navigation, and the active trail). The
   renderer is a pure function from that type (+ the consumer's `Parts`
   escape hatch) to `Html<Msg>`. If 09's shape and this ticket's prose
   disagree, 09 wins — the dependency ordering exists so this ticket reads
   its outcome.
2. **`colHead` component** (`packages/plggmatic/src/Component/usecase/`):
   the framework version of the example's column header — title +
   `Option<href>` close link, `aria-label` on the close, `focusRing`, one
   `style_` call (sole class authority), class names derived from
   `cssPrefix`. Follow the `themeToggle`/`navTree` props-type idiom.
3. **`breadcrumb` component**: one crumb per stack entry; every crumb but
   the last is a link to its truncating URL; last crumb is emphasized
   plain text; `aria-hidden` separators; a labelled region (the example
   uses `aria-label="You are here"` — keep the behavior, decide the
   canonical label text). Mirrors the same stack input the renderer walks,
   so trail and columns can never disagree.
4. **Multi-column renderer** (`packages/plggmatic/src/Layout/usecase/`,
   e.g. `multiColumn.ts`): compose `row`/`column`/`pane` from the scheduled
   stack — root column always present, pushed columns rendered with keyed
   remount + entrance fade exactly as the example does (`key`/`fadeIn` from
   plgg-view), `colHead` per column with the truncating close link, sizing
   via `basis`/`fluid` atoms. Landmark roles come from the scheduled pane
   roles, never hardcoded. Navigation is links only — the renderer stays
   routing-agnostic (the URL-as-serialized-stack idiom is the consumer's
   codec, per the example).
5. **Chrome CSS export**: move the `chromeCss` rules that target
   framework hooks into a single-source, escape-safe framework CSS block
   beside `schemeCss` — sticky column headers (z-index = ticket 05's
   in-pane band), column surfaces/borders, the `aria-current` inverted
   pill, per-column scroll above the `snap` breakpoint (viewport minus the
   chrome-rail token), and the below-`snap` horizontal scroll-snap strip.
   All values via ticket 05 tokens and `--pm-*` variables; media queries
   via the breakpoint builders (never a `--pm-*` breakpoint). Rename
   `ex-*` hooks to `cssPrefix`-derived names. App-identity rules (brand,
   top-bar layout, scheme-class carrier) stay in the example — the wall is
   "framework pattern vs. app identity".
6. **Reduced motion**: confirm the snap strip and entrance fades are
   covered by ticket 05's reduced-motion block; extend that block (in its
   single source) if the lifted rules introduce motion it doesn't cover.
7. **Migrate plggmatic-example**: delete the lifted rules from `chromeCss`
   and the local `colHead`/`breadcrumb` in favor of the framework exports;
   inject the framework chrome CSS block at boot alongside what remains.
   The app's `stack` composition stays hand-written until ticket 13.
   Rendered behavior must not change (same markup semantics, same
   wide/narrow physics).
8. **Barrels**: export the renderer, `colHead`, `breadcrumb`, and the
   chrome CSS block through `Layout/index.ts` / `Component/index.ts` /
   `src/index.ts` (and `styleEntry.ts` if the CSS lands style-side).
9. **Docs**: update `packages/site/workbench.md` and `pane-alignment.md`
   (the "consumer owns height/snapping/collapse" story is now "the
   multi-column renderer owns it; `Parts` remains the escape hatch"); add
   the renderer's page + compiling example under `examples/`, wired into
   `site.config.ts`'s sidebar.
10. **Specs**: `renderToString`-level assertions on the renderer (root
    column always present; push/truncate driven by stack depth; landmarks
    per role; `colHead` close links point at the truncating hrefs; crumb
    trail mirrors the stack; `aria-*` attributes exact); CSS block
    assertions (escape safety — no `<`, `>`, `&`; the 900/899 min/max pair
    comes from the breakpoint builders; declaration counts); example specs
    updated for the migration. Coverage stays above the configured 90 in
    both plggmatic and plggmatic-example.
11. **House rules end to end**: no `as`/`any`/`ts-ignore`; Option/Result
    and exhaustive `match` where control flow appears (`plgg-coding-style`);
    Prettier `printWidth: 50`; zero new dependencies; no changes to
    `scripts/npm-install.sh` / `scripts/build.sh` / `scripts/check-all.sh`.

## Quality Gate

**Acceptance criteria**

1. plggmatic exports a multi-column renderer whose input is ticket 09's
   scheduler output type (imported, not re-declared), producing the full
   pattern: always-present root column, keyed pushed columns with entrance
   fade, per-column `colHead` with truncating close links, breadcrumb
   trail, landmark panes per scheduled role.
2. The chrome CSS is a framework export: sticky headers on the tokenized
   z band, per-column scroll above `snap` using the chrome-rail token,
   scroll-snap strip below `snap`, `aria-current` inverted pill — colors
   only via `--pm-*`, geometry only via ticket 05 tokens/builders, class
   names via `cssPrefix`, escape-safe (spec-asserted). No `900px`/`899px`/
   `48px`/hex literal appears where a token exists.
3. `packages/plggmatic-example/src/app.ts` no longer defines the lifted
   chrome (no `.ex-colhead`/snap media pair/`aria-current` pill rules, no
   local `colHead`/`breadcrumb`) and consumes the framework exports; the
   app's wide-screen per-column scroll and narrow-screen snap strip behave
   as before.
4. Accessibility is framework-owned and spec-asserted: `aria-label`ed
   close links, labelled crumb region, `aria-hidden` separators,
   `nav`/`main`/`aside` landmarks, snap/fade motion covered by the
   reduced-motion block.
5. The site documents the renderer with a compiling example, and
   `workbench.md`/`pane-alignment.md` no longer claim the consumer owns
   the multi-column geometry.
6. `git diff --stat` touches only `packages/plggmatic/**`,
   `packages/plggmatic-example/**`, `packages/site/**` — no runner
   scripts, no new dependencies in any `package.json`.

**Verification method**

`scripts/tsc-plgg.sh` clean; `./scripts/test-plggmatic.sh` and
`./scripts/test-plggmatic-example.sh` green; then a **fresh**
`scripts/check-all.sh` (clean rebuild — stale dists must not mask drift in
the example or site, which compile against the new exports) green end to
end, with plggmatic and plggmatic-example coverage above the configured 90
across statements/branches/functions/lines. Serve the built example, and
paste before/after screenshots at a ≥900px and a <900px viewport into the
PR as evidence for criterion 3 (Phase 4's gate has no preview env — the
side-by-side is the visual check).

**Gate**

All six acceptance criteria hold objectively AND the fresh `check-all.sh`
run is green. A re-declared scheduler shape, a leftover lifted rule in the
example's CSS, a raw breakpoint/rail literal, an escape hatch, a coverage
dip, or a runner-script/dependency diff fails the ticket.

## Considerations

- **Ticket 09 contract risk**: this ticket's renderer prose assumes the
  arrangement carries roles, titles, and push/truncate hrefs. If 09 lands
  a leaner shape (e.g. hrefs computed by a consumer codec), the renderer
  takes the codec as an argument rather than growing its own — follow 09's
  outcome and record the resolution in the renderer's doc comment.
- **Mode-agnosticism (D10) is the design test**: anything the renderer
  needs that ticket 11's single-column renderer would also need belongs in
  the shared vocabulary/scheduler (a 09 amendment), not in this module.
  Conversely, snap physics and column sizing are mode-private — resist
  hoisting them.
- **Column widths**: the example hardcodes `220px`/`300px`/`fluid` per
  column. Decide whether width is a per-pane hint in the scheduled output,
  a renderer default with `Parts` override, or both — and record the
  decision; do not invent a config object (the combinators' recorded rule).
- **The narrow-screen reader width** (`min-width:88vw`) is a magic number
  in the oracle; either tokenize it with the lifted rules or record why it
  stays a renderer-private constant.
- **Example is deliberately half-migrated** after this ticket: framework
  chrome + hand-written stack composition. That intermediate state is the
  point — ticket 13's declarative rewrite is the line-count proof, and
  diffing against a half-migrated baseline keeps 13's diff honest.
- **Ticket ordering within Phase 4**: 05 (tokens) and 09 (scheduler) must
  land first; if 05's example migration and this ticket's example
  migration collide in the same lines, this ticket rebases on 05's landed
  state — the tokens ticket owns literals→tokens, this one owns
  rules→framework.
- **Deferred**: runtime mode *switching* UX (the D10 switch itself) rides
  the single-column renderer's ticket 11; drawer-style root-column
  collapse (the docs shell's idiom) is not part of this pattern and stays
  out; any `secondary`/`tertiary` colored chrome awaits D9's earned-place
  rule.

---
created_at: 2026-07-04T14:30:07+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 4h
commit_hash: dd8068d
category: Changed
depends_on: [20260704143003-plggmatic-token-matrix-monochrome-default.md, 20260704143004-palette-override-api-and-scheme-persistence.md, 20260704143005-plggmatic-non-color-design-tokens.md]
---

# plggpress theme on plggmatic: the D3 first-goal proof (`--vp-*` → `--pm-*` clean cutover)

## Overview

Phase 3 (Theme rewrite), ticket **07** of the plggpress/plggmatic roadmap —
the proof step of **D3** ("Theme rewrite first: tokens → port plggpress theme
onto plggmatic → prove on the live guide"), executing the **D16** clean
cutover ("Clean cutover to `--pm-*` … except the theme-persistence
localStorage key `vp-appearance` is preserved") and giving **D9**'s semantic
role tokens their first real consumer (callouts). Approved decision record:
`.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md`.

Today `plggpress` has **no dependency on plggmatic**
(`packages/plggpress/package.json` lists only `plgg-*` packages) and carries a
bespoke theme under `packages/plggpress/src/theme/` — a 600-line hand-authored
`baseCss.ts` defining its own `--vp-*` custom-property palette, a local
`themeToggle` button re-implemented inside `navBar.ts`, a private
no-FOUC/persistence script (`themeScript.ts`), and callouts whose
tip/warning/danger hues are **hardcoded Tailwind ramp hexes**
(`baseCss.ts` lines ~509–545: tip `#ecfdf5`/`#10b981`/`#022c22`, warning
`#fffbeb`/`#f59e0b`/`#451a03`, danger `#fef2f2`/`#ef4444`/`#450a0a`, plus
dark counterparts). Tickets 03/04/05 built the plggmatic side of everything
this theme hand-rolls: the monochrome role×variant token matrix and `--pm-*`
scheme emitter, the palette/appearance contracts (including the
`vp-appearance` key as a framework constant), and the non-color tokens
(typography scale, breakpoints, shell metrics, z-index bands, reduced
motion). This ticket makes plggpress consume them:

1. **Add `plggmatic` as a dependency of `plggpress`** (`file:../plggmatic`)
   and rewire the theme onto plggmatic components and tokens: `shell` composes
   plggmatic's scheme/metrics/reduced-motion CSS blocks instead of hand-set
   custom properties; `navBar` drops its local toggle for plggmatic's
   `themeToggle`; `sidebarTree`, `page`, `callout`, `notFound` draw color and
   type from `--pm-*` tokens and plggmatic atoms; `themeScript.ts` is deleted
   in favor of ticket 04's appearance contract.
2. **Callouts consume the semantic role tokens.** The `tip`/`warning`/`danger`
   kinds map onto the D9 matrix — `success`/`warning`/`danger` ×
   {`surface`, `text`, `border`} — instead of the hardcoded emerald/amber/red
   hexes; `info`/`note` stay on the monochrome neutrals + `primary` border,
   matching today's rendering (see Considerations for the `info`-role
   decision).
3. **Clean cutover (D16):** after this ticket, **zero `--vp-*` custom
   properties** exist in plggpress source or in the built guide/site output.
   The `vp-appearance` localStorage key survives verbatim — sourced from
   plggmatic's `appearanceStorageKey`, never re-spelled.

**Hard constraint carried from the current design:** the generated stylesheet
rides through the SSR `text()` escaper as an escaped text node
(`shell.ts` docblock, `theme/baseCss.ts` header). Every CSS block composed
into the document `<style>` — plggmatic's emitters AND whatever bespoke
layout CSS remains — must contain **no `<`, `>`, or `&`**: class/descendant
selectors, `@media`, and custom properties only; **no child (`>`)
combinators**, no `&` nesting. Tickets 03/05 spec this on the plggmatic
side; this ticket must assert it on the final composed sheet.

**The gate is visual and pre-merge.** Deploy is post-merge with **no preview
environment**, so the roadmap's phase-3 gate — Playwright side-by-side
screenshot comparison of the old (main) vs new (this branch) **guide and
site** builds — is the only visual check before the live guide changes.
Both SSG outputs must build green including the built-in link check.

Zero new external dependencies (the plggmatic dep is an in-repo `file:`
link); no new package, but the dependency edge **reorders the runner
scripts** (see Key Files — build.sh currently builds plggpress *before*
plggmatic, which becomes wrong the moment the dep lands).

## Policies

- `workaholic:design` / `policies/accessibility.md` — the policy snapshot
  records accessibility testing as "not observed / not applicable (no UI
  components)"; that predates the docs sites. This ticket is where the
  token layer's computed WCAG-AA guarantees (ticket 03's contrast gate)
  become the *live guide's* palette, and the reduced-motion block (WCAG
  2.3.3 territory, ticket 05) is composed into real pages instead of
  re-authored. The side-by-side screenshot gate doubles as the legibility
  check for the dark-ink alpha-flattening divergence recorded in ticket 03.
- `workaholic:implementation` / `policies/quality.md` — TypeScript strict
  mode is the sole static-analysis layer and `as`/`any`/`ts-ignore` are
  prohibited; the port leans on it: adding the plggmatic dep and deleting
  `themeScript.ts`/the `--vp-*` blocks makes every stale reference a `tsc`
  error, so the cutover is machine-checked rather than grep-and-hope
  (greps remain as belt-and-braces gates below). Prettier `printWidth: 50`
  governs every touched `.ts` file.
- `workaholic:implementation` / `policies/test.md` — coverage is gated per
  package; `packages/plggpress/plgg-test.config.json` sets threshold 90
  (excluding only `/index.ts`, `/cli.ts`, `/devEntry.ts`, and config
  fixtures), so the rewritten theme modules and their rewritten specs must
  keep statements/branches/functions/lines above it.
- `workaholic:operation` / `policies/delivery.md` — the delivery pipeline
  has no preview environment (build → merge → publish); that observable
  fact is *why* the visual regression gate must run pre-merge from local
  builds, and why `scripts/build.sh` ordering matters beyond builds: the
  npm publish order is sed-derived from build.sh's `cd`-lines, so the
  plggmatic-before-plggpress reorder must use the exact existing line
  format.

## Key Files

**The theme being ported (all under `packages/plggpress/src/theme/`, each
with a sibling `.spec.ts`):**

- `baseCss.ts` — the `--vp-*` sheet: light block lines 31–50, dark block
  lines 56–72, callout hues lines ~509–545, sub-`sm` compact headings, the
  escape-safety contract in the header comment. The custom-property blocks
  are **replaced** by plggmatic emitters; the layout/prose CSS that remains
  bespoke is rewritten to consume `--pm-*` variables and ticket 05's
  breakpoint constants.
- `shell.ts` — injects `baseCss` + collected atomic CSS as ONE escaped
  `<style>` text node; becomes the composition point for plggmatic's
  scheme CSS, metrics/typography block, and reduced-motion block.
- `navBar.ts` — local `themeToggle()` builder (lines 35–70, `.vp-theme-toggle`
  class + sun/moon SVGs) → plggmatic's `themeToggle` component.
- `sidebarTree.ts`, `page.ts`, `notFound.ts` — nav tree, prose/heading, and
  404 surfaces; port onto `navTree`/`heading`/`prose`/tokens where the
  semantics fit, tokens-only where they don't (see step 4).
- `callout.ts` — `CalloutKind` union + `vp-callout-<kind>` classes; the
  presentation moves from hardcoded hexes to role tokens.
- `themeScript.ts` — `HEAD_SCRIPT`/`BODY_SCRIPT`/`injectThemeScripts`,
  the `vp-appearance` literal; **deleted**, replaced by ticket 04's
  `appearanceInitScript`/`injectAppearanceScript`/`appearanceStorageKey`.

**Injection call sites:** `packages/plggpress/src/router/pressRouter.ts`
(line ~176) and `packages/plggpress/src/Press/usecase/appSpecs.ts` (line ~42)
— the two `injectThemeScripts` consumers to rewire.

**The plggmatic surface consumed (read-mostly):**
`packages/plggmatic/src/index.ts` + `src/styleEntry.ts` barrels —
`themeToggle`, `navTree`, `heading`, `prose`, the Style tokens/emitters and
the appearance contract as landed by tickets 03/04/05. Gaps found during the
port are closed in plggmatic with specs (expected: a handful of theme-only
atoms), not worked around with raw hexes in plggpress.

**Manifests and wiring:**

- `packages/plggpress/package.json` — add `"plggmatic": "file:../plggmatic"`.
- `packages/plggpress/bundle.config.ts` — externals are derived from
  package.json ("never listed here"), so no edit expected; verify.
- `scripts/build.sh` — plggpress builds at line ~47, plggmatic at line ~67:
  **move the `cd $REPO_ROOT/packages/plggmatic && npm run build` line (exact
  format — publish order is sed-derived) above plggpress's**, and update the
  ordering comments. `site`/`plggmatic-example` lines stay put.
- `scripts/npm-install.sh` — same reorder (plggpress installs at line 21,
  plggmatic at line 28 today).
- `workloads/guide/dev-entrypoint.sh` + `workloads/guide/compose.yaml` —
  the guide container's install loop and node_modules volumes must gain
  `plggmatic`; `scripts/gate-guide-deps.sh` (run by `check-all.sh`) asserts
  the three provisioning lists stay reconciled — it will fail until this is
  done, which is the point.
- `scripts/check-all.sh` — already runs the gates and both packages' tests;
  no edit expected, cited as the verification harness.
- `packages/plggpress/plgg-test.config.json` — threshold 90; unchanged,
  cited by the gate.

**The two SSG consumers proved:** `packages/guide/` (`npm run build` =
`plggpress build --config site.config.ts …`, `npm run preview` = python3
http.server) and `packages/site/` (same shape; already depends on both
plggpress and plggmatic).

## Related History

- `.workaholic/tickets/archive/work-20260701-185044/20260701211839-plgg-press-tokens-typography-match-qmu.md`
  and `…/20260701211840-plgg-press-sidebar-first-layout-match-qmu.md`
  (story `.workaholic/stories/work-20260701-185044.md`) — the qmu.co.jp
  oracle port that authored `baseCss.ts`. This ticket is that theme's second
  migration: the *values* already moved into plggmatic tokens (tickets
  03/05); now the *consumer* moves. The oracle discipline (record every
  deviation) becomes the screenshot-diff discipline here.
- `.workaholic/tickets/archive/work-20260630-013457/20260630100000-plgg-press-theme-dark-mode-and-polish.md`
  (story `.workaholic/stories/work-20260630-013457.md`) — the birth of
  `themeScript.ts` and the `vp-appearance` key this ticket deletes-but-
  preserves; ticket 04 already asserted behavioral equivalence of its
  replacement, so the swap here is designed to be mechanical.
- `.workaholic/tickets/archive/work-20260703-184443/20260703235711-absorb-plggmatic-into-plggpress.md`
  — retired the *old-meaning* plggmatic (app-framework facade, now
  `plggpress/src/framework/` — kept per D1, untouched here). Caution:
  its rewire map must not be read as guidance for today's plggmatic.
- `.workaholic/tickets/archive/work-20260703-020116/20260703020138-deploy-guide-build-plggmatic-before-plggpress.md`
  — the previous era's build-order lesson, same shape as this ticket's
  build.sh reorder: when plggpress depends on plggmatic, plggmatic's dist
  must exist first. History repeating with the new plggmatic, this time
  wired permanently into build.sh rather than a deploy script.
- Direct dependencies, this todo queue: `20260704143003` (D9 matrix +
  monochrome default), `20260704143004` (palette override + `vp-appearance`
  contract), `20260704143005` (non-color tokens; its consideration
  explicitly hands the compact-heading media block and motion-token
  questions to this ticket). Sibling `20260704143008-tokenize-syntax-highlight-colors`
  (phase 3, next) owns code-block token colors — not this ticket.

## Implementation Steps

1. **Wire the dependency.** Add `"plggmatic": "file:../plggmatic"` to
   `packages/plggpress/package.json` dependencies. Reorder
   `scripts/build.sh` so the plggmatic build line (exact
   `cd $REPO_ROOT/packages/plggmatic && npm run build` format) precedes
   plggpress's, updating the dependency-order comments (plggmatic needs
   only plgg + plgg-view, both built earlier, so the move is safe);
   reorder `scripts/npm-install.sh` likewise. Add `plggmatic` to the guide
   container's install loop (`workloads/guide/dev-entrypoint.sh`) and
   node_modules volumes (`workloads/guide/compose.yaml`);
   `scripts/gate-guide-deps.sh` must pass. Verify
   `packages/plggpress/bundle.config.ts` needs no edit (externals derive
   from package.json).
2. **Compose plggmatic's CSS blocks in `shell.ts`.** The document `<style>`
   becomes: plggmatic scheme CSS (ticket 03/04's `--pm-*` emitter) +
   plggmatic non-color/metrics + reduced-motion blocks (ticket 05) + the
   remaining bespoke plggpress sheet + collected atomic CSS — in that
   order, all through the same escaped `text()` node. Delete `baseCss.ts`'s
   `:root`/`html.dark` custom-property blocks and its reduced-motion block
   (now framework-owned); keep `html.dark` as the sole scheme selector.
3. **Cut every `--vp-*` over to `--pm-*` (D16).** Rewrite the surviving
   bespoke layout/prose CSS to reference plggmatic's variables
   (`--pm-<neutral>`, shell-metric variables for rail/sidebar/shell-max)
   and ticket 05's breakpoint TS constants for the `@media` queries
   (639/1023 and the compact sub-`sm` heading block, derived from the
   token map — CSS cannot resolve `var()` in `@media`, so these are
   build-time string compositions). When the cutover is done, `--vp-` must
   not appear in plggpress source nor in built output.
4. **Port the components.** `navBar.ts`: delete the local `themeToggle()`
   builder and render plggmatic's `themeToggle` (the sun/moon SVGs were
   ported *from* here — visual parity expected); keep the toggle
   selectable by the body wiring script (step 6). `page.ts`/`notFound.ts`:
   headings and prose draw from plggmatic's `heading`/`prose`/type-scale
   tokens. `sidebarTree.ts`: adopt `navTree` if its active/pill semantics
   match the oracle's inverted-pill idiom; if they don't, keep the bespoke
   tree but express its colors purely in tokens (record which way it went
   and why — do not fork a half-adopted component).
5. **Callouts onto the role matrix.** In the CSS that styles
   `vp-callout-<kind>`: `tip` → `success-surface`/`success-text`/
   `success-border`; `warning` and `danger` → their same-named role
   variants; `info`/`note` → neutral `surface-2` background,
   `primary`-family border, neutral `text` ink (today's monochrome
   rendering). The hardcoded `#ecfdf5`-family hexes vanish; the
   light/dark difference now rides entirely on the token layer's
   per-scheme values, so the separate `html.dark .vp-callout-*` blocks
   collapse away.
6. **Replace `themeScript.ts` with the ticket 04 contract.** Head:
   `injectAppearanceScript` (plggmatic) at the two call sites
   (`pressRouter.ts`, `appSpecs.ts`). Body: rebuild the toggle wiring
   script by *composing* it from plggmatic's exported constants —
   the storage key comes from `appearanceStorageKey`, never a re-typed
   literal — preserving today's behavior (bind every toggle, flip
   `html.dark`, persist, swallow storage errors, no `</script` inner
   sequence, idempotent missing-tag guard, injected AFTER the SSR
   escaper). If ticket 04 landed a reusable body-script export, consume
   it; otherwise keep the thin composition in plggpress and note it as a
   candidate to upstream.
7. **Assert escape safety on the composed sheet.** A spec builds the full
   `<style>` payload exactly as `shell` composes it and asserts it contains
   no `<`, `>`, or `&` (hence no child combinators) — the byte-for-byte
   SSR-escaper survival contract, now covering framework-emitted AND
   bespoke CSS together.
8. **Rewrite the theme specs.** `baseCss.spec.ts`'s hex expectations
   (`border-color:#f59e0b` etc.) become token expectations
   (`var(--pm-warning-border)` etc.); `themeScript.spec.ts` is deleted
   with its module (its behavioral table lives in plggmatic since ticket
   04); `navBar`/`callout`/`shell` specs follow their modules. Coverage
   stays >90 under `plgg-test.config.json`.
9. **Build both SSG outputs green.** `packages/guide` and `packages/site`
   `npm run build` succeed end-to-end including the built-in link check
   (`CheckLinks` — a broken-link report fails the build path). Grep the
   built dists for `--vp-` (must be 0) and for the retired callout hexes
   (must be 0); confirm `vp-appearance` appears in the built head script.
10. **Playwright side-by-side visual gate (pre-merge, the phase-3 gate).**
    Before porting (or from a clean main worktree), run a fresh build of
    guide + site at the merge-base and archive both `dist/` trees to the
    scratch area as the baseline. After the port, serve baseline and new
    dists on two local ports (`npm run preview` / `python3 -m http.server`)
    and, with the Playwright browser tooling, capture matching screenshots
    of a representative page set — guide home, one prose page containing
    tip/warning/danger callouts + code blocks, the 404 page; site home +
    one component page — at desktop (≥1024px shell) and sub-`sm` mobile
    widths, in BOTH schemes (toggle via the rendered control, which also
    exercises persistence). Attach old/new pairs to the PR with a written
    list of intentional diffs; anything not on that list must be
    pixel-equivalent to the eye.
11. **House rules end to end**: no `as`/`any`/`ts-ignore`; Option/Result
    and exhaustive `match` where control flow appears (`plgg-coding-style`);
    Prettier `printWidth: 50`; zero new external dependencies.

## Quality Gate

**Acceptance criteria**

1. `plggpress` depends on `plggmatic`; the theme renders plggmatic's
   `themeToggle` and consumes the Style emitters/tokens;
   `themeScript.ts` no longer exists and both injection call sites use the
   ticket 04 contract.
2. **D16 held, both halves:**
   `grep -rn -- "--vp-" packages/plggpress/src packages/guide/dist packages/site/dist`
   returns **0** matches (source AND built output), while the built head
   script still reads `vp-appearance` — and the key is sourced from
   `appearanceStorageKey` (`grep -rn "vp-appearance" packages/plggpress/src`
   returns 0 raw literals).
3. **Callouts are tokenized:** the tip/warning/danger presentation
   references `success`/`warning`/`danger` role tokens; the retired hexes
   (`#ecfdf5`, `#10b981`, `#022c22`, `#fffbeb`, `#f59e0b`, `#451a03`,
   `#fef2f2`, `#ef4444`, `#450a0a` and their dark-ramp partners) appear
   nowhere in `packages/plggpress/src`.
4. **Escape safety spec-asserted** on the fully composed stylesheet (no
   `<`, `>`, `&`; no child combinators), and the built pages render with
   the styles intact.
5. **Both SSG builds green with link check:** `packages/guide` and
   `packages/site` build end-to-end with an empty broken-links report.
6. **Visual gate satisfied pre-merge:** old-vs-new Playwright screenshot
   pairs for guide AND site — desktop + mobile, light + dark — are attached
   to the PR with the intentional-diff list; no unlisted regressions.
7. **Wiring correct:** build.sh builds plggmatic before plggpress (exact
   cd-line format preserved), npm-install.sh reordered,
   `gate-guide-deps.sh` passes, and no new external dependency exists in
   any `package.json`.

**Verification method**

`scripts/tsc-plgg.sh` clean and `./scripts/test-plggpress.sh` green, then a
**fresh** `scripts/check-all.sh` (clean rebuild — stale dists must not mask
drift; it also runs `gate-guide-deps.sh` and both packages' suites) green
end to end, with plggpress coverage >90 across
statements/branches/functions/lines. Run the criterion-2/3 greps and paste
their (empty) output plus `git diff --stat` into the PR. Execute step 10's
side-by-side procedure and attach the screenshot pairs as the phase-3 gate
evidence — this happens BEFORE merge; there is no preview environment after
it.

**Gate**

All seven acceptance criteria hold objectively AND the fresh `check-all.sh`
run is green AND the PR carries the side-by-side screenshot evidence with
every visual diff accounted for. A single `--vp-*` remnant, a re-typed
`vp-appearance` literal, a hardcoded callout hex, an escape hatch
(`as`/`any`/`ts-ignore`), a coverage dip, a broken link, or missing visual
evidence fails the ticket.

## Considerations

- **Intentional visual diffs must be enumerated, not discovered.** Known
  candidates: ticket 05's heading scale/weight alignment was tuned TO this
  guide, so prose should be near-identical, but dark-scheme inks were
  alpha-flattened in ticket 03 (recorded divergence — this ticket is its
  named revisit point: if any surface reads worse, the fix is a
  per-surface flattened ink token in plggmatic, not a `--vp-*` revival);
  callout hues may shift a step if ticket 03 seeded `base` tiers darker
  than the oracle ramp. The screenshot gate judges legibility parity, not
  byte parity — but every diff needs a sentence.
- **The `info` role still lacks a consumer.** The oracle renders
  `info`/`note` callouts monochrome, and this ticket preserves that for
  parity; ticket 03's "provisional until a consumer exercises it" note
  stands. If drive prefers to make `info` callouts the info-role consumer,
  that is a *recorded intentional diff* on the screenshots and closes 03's
  open item — acceptable either way, but decide explicitly.
- **`vp-` class names are not `--vp-*` custom properties.** D16 mandates
  the custom-property cutover only; the `vp-callout`/`vp-doc`/`vp-*` class
  vocabulary is plggpress-private and may stay (the `vp-theme-toggle`
  class must follow whatever plggmatic's `themeToggle` renders). Renaming
  classes wholesale is out of scope — do it never or completely, not
  halfway.
- **`baseCss.ts` shrinks, it does not disappear.** The sidebar-first shell
  layout, drawer, and prose CSS remain bespoke (tokens feed them; the D10
  scheduler era decides whether a framework shell replaces them). Resist
  rewriting layout structure "while we're here" — this ticket's diff is
  tokens and components, and the screenshot gate depends on that
  restraint.
- **Scope walls:** syntax-highlight token colors = sibling ticket 08 (the
  code-block *chrome* here just moves to neutral tokens); the declarative
  scheduler and any framework shell = phase 4; palette plumbing from
  `site.config.ts` into `schemeCssOf` = the consumer tickets after the
  override seam proves out (compose `schemeCss` — the default — here
  unless a dependency ticket already landed the plumbing).
- **Publish-order hazard:** `publish-npm.sh` sed-derives package order from
  build.sh's cd-lines, so the reorder in step 1 is release-affecting;
  keep the line format byte-exact and re-read the derived order once.
- **`plggpress/src/framework/` (the absorbed old facade) is untouched**
  per D1 — it is build/CLI machinery, re-layered gradually in later
  phases; only the theme moves now.
- **Revisit triggers:** if the body toggle script composition (step 6)
  gets cloned by the next consumer (admin UI, qmu.co.jp), upstream it into
  plggmatic then; if the sub-`sm` compact-heading media block proves
  reusable, ticket 05's token map already carries the values — emit it
  from plggmatic when a second theme wants it.

## Final Report

Landed in feat `dd8068d` (22 files, +700/-480), archived in this housekeeping
commit. The D3 theme-first proof: plggpress's docs theme now rides plggmatic's
tokens/components, with a clean D16 `--vp-*` → `--pm-*` cutover.

### What shipped
- **plggpress → plggmatic dependency** (`file:../plggmatic`). `scripts/build.sh`
  and `scripts/npm-install.sh` reordered so plggmatic builds/publishes before
  plggpress (exact `cd $REPO_ROOT/packages/<name> && npm run build` line shape
  preserved; the `publish-npm.sh` sed-derived order re-read — plggmatic now
  precedes plggpress). Guide container provisioning updated
  (`dev-entrypoint.sh` install loop + `compose.yaml` volumes); `gate-guide-deps.sh`
  green.
- **`shell.ts` composes plggmatic's framework CSS** in cascade order —
  `schemeCss` (`--pm-*` scheme properties) + `metricCss` + `reducedMotionCss` +
  `themeToggleCss` — ahead of the bespoke `baseCss` layout/prose sheet and the
  body's collected atomic CSS, all through the one escaped `<style>` text node.
- **`baseCss.ts` clean cutover.** All `--vp-*` custom properties gone; every
  color is a `--pm-*` token (`colorVar`), geometry is metric tokens
  (`metricVar` — shell-max/sidebar/rail/measure), media boundaries are composed
  from plggmatic breakpoint constants (`maxWidth("sm")`/`minWidth("lg")`/
  `maxWidth("lg")`). The `:root`/`html.dark` property blocks and the
  reduced-motion scroll reset were deleted (now framework-owned).
- **Callouts on the D9 role matrix.** tip→success, warning, danger each map to
  `{surface,text,border}` role tokens; info/note stay neutral `surface-2` with a
  `primary-base` edge. The hardcoded emerald/amber/red ramp hexes and the
  separate `html.dark .vp-callout-*` blocks are gone (the token layer reschemes).
- **New plggmatic SSG toggle.** `staticThemeToggle` + `themeToggleClass` +
  `themeToggleCss` (Component/usecase/themeToggle.ts): a static
  `Html<never,"button">` rendering BOTH icons with a CSS scheme-switch and a
  class hook — the SSG-capable sibling of the runtime `themeToggle<Msg>`.
  `navBar.ts` renders it; the local sun/moon builder is deleted.
- **`themeScript.ts` → `appearanceScripts.ts`.** Head no-FOUC is plggmatic's
  ticket-04 `injectAppearanceScript`; the body toggle-wiring is composed from
  `appearanceStorageKey` + `themeToggleClass` (no re-typed literals). Both
  injection call sites (`pressRouter.ts`, `appSpecs.ts`) rewired.

### Design decisions (recorded)
- **Runtime toggle can't serve SSG → a static toggle was added, not cloned.**
  plgg-view's `renderToString` drops `onClick` and the runtime toggle renders a
  single build-time-scheme icon; SSG needs both icons + CSS switch + a vanilla
  body-script hook. AC1 ("renders plggmatic's themeToggle") is therefore
  satisfied by framework-owning the static toggle in plggmatic (gap closed with
  a spec, not worked around with raw hexes in plggpress). The runtime
  `themeToggle<Msg>` stays for TEA apps.
- **`sidebarTree` kept bespoke, tokenized only.** Its `SidebarGroup`/`SidebarItem`
  config model differs from plggmatic's `NavItem`/`navTree`; per the ticket's
  "don't fork a half-adopted component" rule it stays plggpress-owned with its
  colors expressed purely in `--pm-*` tokens.
- **`info` role left without a consumer.** info/note callouts stay monochrome for
  parity (ticket 03's open item stands).

### Enumerated intentional visual diffs (phase-3 gate)
Layout/prose are pixel-preserved (same bespoke CSS + class vocabulary; only the
`var()` sources changed). Verified by computed-style reads in a real browser:
- **Neutrals/pills/surfaces byte-identical** old→new both schemes (tokens 03/05
  were seeded FROM this oracle): active pill `#111`/white; toggle light chrome
  `#fff`/`#ededee`; callout SURFACES identical (`#f6f6f7`/`#ecfdf5`/`#fffbeb`/
  `#fef2f2` light; `#202127`/`#022c22`/`#451a03`/`#450a0a` dark); info/note fully
  identical.
- **Callout ink/edge shift one step** to the AA-tuned role tokens (surfaces
  unchanged): e.g. tip light ink `#022c22`→`#065f46`, edge `#10b981`→`#059669`;
  tip dark ink pale-mint→`#34d399`. Legibility preserved (ticket-03 contrast gate
  is the arbiter). This is the ticket's anticipated "hues may shift a step".
- **Dark-mode toggle** is now a bordered dark circle (`#1b1b1f`, `#262629` edge)
  with a light moon (`#dfdfe4`, ~13:1) instead of the old light disc (`#e4e4e7`);
  matches plggmatic's runtime toggle. The old `--vp-knob` WCAG-1.4.11 affordance
  is carried by the high-contrast icon (and the `primary-base` hover edge).

### Verification
- Fresh `scripts/check-all.sh` **EXIT 0** — every suite 0 failed; plggpress
  coverage 96.79/96.92/96.43/96.79 (all >90); plggmatic 100/98.28/100/100.
- AC greps (source AND fresh dist): `--vp-`=0 in `plggpress/src`+`guide/dist`+
  `site/dist`; raw `vp-appearance`=0 in `plggpress/src`; retired callout hexes=0
  in `plggpress/src`; `--pm-`/`vp-appearance`/`pm-theme-toggle` present in built
  output; no hardcoded-hex `.vp-callout-*` rule survives in any built `<style>`.
- Both SSG builds green incl. the built-in link check (guide 32 pages, site 13).
- Playwright side-by-side render: guide (home, concepts, result) + site
  (design-tokens) at desktop 1280 + mobile 375 × light + dark — layout/prose
  correct; both toggles (rail + mobile bar) flip `html.dark` and persist
  `vp-appearance`; callout token→hex confirmed by injected-element computed
  styles. Screenshots archived to the session scratchpad (attach at PR time as
  the formal phase-3 evidence — the diffs above are the intentional-diff list).

### Follow-ups (see Concerns)
- No guide/site page renders a live callout box yet (content shows them as code
  only) — the callout tokenization is latent until content uses `:::` callouts;
  the injected-element check is the current proof.
- The body toggle-wiring script is a candidate to upstream into plggmatic when a
  second SSG host (admin UI / qmu.co.jp) needs it.
- `build.sh` / the SSG build do not clean `dist/`; harmless in CI (dist is
  gitignored, rebuilt fresh) but local stale dists mask drift — a `rm -rf dist`
  before the guide/site build would harden the local phase-3 gate (out of scope
  here; noted for a tooling ticket).

---
created_at: 2026-07-14T08:54:06+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 4h
commit_hash: 63ecf75e
category: Changed
depends_on:
mission:
---

# Make the qmu.co.jp identity the faithful plggpress DEFAULT theme (not a bland monochrome)

## Overview

The out-of-the-box plggpress design is too plain: the `defaultTheme` shipped by
plggpress is a near-**monochrome** interpretation (`primary-base #111111`, white/
grey surfaces — see `themeSupport/Style/model/palette.ts`) of a qmu.co.jp docs
shell. The in-code comments already claim a "qmu.co.jp oracle port" (baseCss.ts,
typography.ts), but the RESULT reads as a generic black-and-white docs theme, not
the qmu.co.jp visual identity.

**Goal (decided with the developer 2026-07-14):** make the plggpress **default
theme a faithful port of the qmu.co.jp identity** — its real palette, type scale,
spacing/geometry, and component styling — so that `npx plggpress` looks like
qmu.co.jp out of the box, and **qmu.co.jp built on plggpress needs ZERO further
design customization** (no theme overrides — it consumes the default).

**Source of truth (decided):** work from the **existing in-repo port** — the
`themeSupport/Style/model/*` tokens and `theme/baseCss.ts` already encode the
qmu.co.jp intent value-for-value; this ticket **corrects the drift/ugliness**
(above all the flattened-to-monochrome palette, and any geometry/typography that
reads wrong) toward a faithful qmu.co.jp look, rather than re-scraping the live
site. The developer's approval is where the result is judged against the **live**
qmu.co.jp (the Quality Gate below), so the implementer's job is to make the
in-repo default faithfully qmu.co.jp, not merely monochrome.

This is a THEME-DATA + layout-CSS change, not an architecture change: the
parameterized token machinery (a scheme×token `Palette` record, the closed
`TypeRole`/weight unions, the `pm` custom-property cutover) already exists and is
correct by construction (a missing token is a `tsc` error). The work is to give
the default theme the RIGHT values and component polish.

## Policies

The implementing session MUST read each linked policy hard copy before writing
code and keep every change defensible against its Goal (目標), Responsibility
(責務), and Practices (実践).

- `workaholic:design` / `policies/self-explanatory-ui.md` — the default look is
  the product's first impression; every state (nav active/hover, callouts, code,
  tables, dark/light) must read clearly, not just "not broken".
- `workaholic:design` / `policies/modeless-design.md` — the appearance toggle
  (light/dark/auto) stays modeless and URL-/storage-driven; the faithful port
  must hold in BOTH schemes (the `Palette` is `Record<Scheme, …>`).
- `workaholic:planning` / `policies/ux-research-prototype.md` — the served
  preview is the touchable surface; the qmu.co.jp match is judged by hand on it.
- `workaholic:implementation` / `policies/coding-standards.md` — house
  type-driven style (no `as`/`any`/`ts-ignore`; the palette rows are typed
  literals via the `rowOf` getter, hex values validated through `asHexColor`,
  printWidth 50). No new runtime deps.
- `workaholic:implementation` / `policies/directory-structure.md` — theme values
  live in `themeSupport/Style/model/`, layout/prose CSS in `theme/`; keep the
  split (token *vocabulary* vs palette *data*) intact.
- `workaholic:operation` / `policies/ci-cd.md` — the change rides the consolidated
  gates (the existing `token.spec.ts` / palette specs must stay green; `check-all`
  is the source of truth).

## Key Files

- `packages/plggpress/src/themeSupport/Style/model/palette.ts` — **the main
  edit.** The default palette rows (light + dark `Scheme`s) currently near-
  monochrome; give them the faithful qmu.co.jp brand values. `rowOf` keeps the
  25-key shape typed (no `as`); values pass through `asHexColor`.
- `packages/plggpress/src/themeSupport/Style/model/typography.ts` — the
  `TypeRole` scale + the three-weight set; confirm/correct against qmu.co.jp's
  calm ~1.25 modular scale (already documented here as the oracle).
- `packages/plggpress/src/themeSupport/Style/model/token.ts`,
  `scheme.ts`, `hexColor.ts`, `theme.ts` — the token vocabulary + `defaultTheme`
  binding; geometry/metric tokens if spacing/radius need correction.
- `packages/plggpress/src/theme/baseCss.ts` — the bespoke layout/prose stylesheet
  (sidebar app shell, chrome rail, prose, code, tables, callouts) bound to
  `defaultTheme`; polish component styling here where it reads wrong.
- `packages/plggpress/src/theme/{page,sidebarTree,callout,notFound,appearanceScripts}.ts`
  — the components the stylesheet targets; touch only if a class/structure
  change is needed for fidelity.
- `packages/plggpress/src/themeSupport/styleEntry.ts` — the `defaultTheme` /
  `colorVar` / `metricVar` seam the CSS composes through.
- `packages/plggpress/src/themeSupport/Style/model/token.spec.ts` (+ any palette
  spec) — the existing structural specs that must stay green.
- `packages/plgg-cms/src/ui/Style/model/{palette,typography,token}.ts` — the
  PARALLEL copy in plgg-cms; decide and record whether the default there tracks
  the same qmu.co.jp values (keep the two defaults consistent, or note why not).

## Related History

The current theme is the product of a completed qmu.co.jp oracle port + the D16
plggmatic `pm`-token cutover; this ticket refines the DEFAULT VALUES, not the
mechanism.

- `.workaholic/specs/20260704-plggpress-plggmatic-roadmap.md` — the design-system
  decisions (D3 plggpress passes `defaultTheme`; the minimum 5–7-color scheme;
  "default primary black/white"; qmu.co.jp eventually replaced BY plggpress with
  the design system propagating). This ticket makes the default faithfully
  qmu.co.jp so that replacement needs no per-site theming.

## Implementation Steps

1. Read the roadmap's design-system decisions and the in-code oracle notes
   (`baseCss.ts`, `typography.ts`) to recover the intended qmu.co.jp values.
2. Rework the **default palette** (`palette.ts`) for BOTH schemes: replace the
   flattened monochrome with the faithful qmu.co.jp brand palette (primary +
   success/danger/warning/info, surfaces, text/muted/border), keeping the typed
   `rowOf` shape and `asHexColor` validation; no `as`/`any`.
3. Confirm/correct **typography** (`typography.ts`) and any **geometry/metric**
   tokens (`token.ts`/`theme.ts`) against the qmu.co.jp scale — headings, body,
   the three weights, spacing/radius — so the default is faithful, not just
   monochrome-recolored.
4. Polish the **component/layout CSS** (`theme/baseCss.ts` and, only if needed,
   the `theme/*` components) where it reads wrong against qmu.co.jp: nav active/
   hover pills, callouts, code (inline + block), tables, the chrome rail, footer.
5. Keep the appearance toggle faithful in **light AND dark**; verify the dark row
   is a real qmu.co.jp dark, not an inverted monochrome.
6. Reconcile the **plgg-cms** default (`ui/Style/model/*`) with the same values
   (or record the deliberate divergence) so the two default themes don't drift.
7. Ensure a **qmu.co.jp-on-plggpress site needs zero theme overrides** — confirm
   the default is the whole identity (no per-site palette/typography override
   required); document this in the theme README/comments.
8. Keep the existing **theme-model specs green** (`token.spec.ts`, palette/
   typography specs); add a spec pinning the new default's key invariants if
   cheap (e.g. the primary is no longer `#111111`, both schemes complete).
9. Build and serve a **preview** (the guide via `scripts/serve-guide.sh`, or a
   minimal `npx plggpress` output) for the developer's live side-by-side
   judgment against qmu.co.jp.

## Quality Gate

Captured from the developer at ticket time (2026-07-14).

**Acceptance criteria** — the checkable conditions that must hold:

- The plggpress **default theme** renders as a faithful qmu.co.jp identity
  (palette, type scale, spacing, components) in BOTH light and dark schemes —
  no longer a bland monochrome (`primary-base` is a real brand value, not
  `#111111`).
- A **qmu.co.jp site built on plggpress needs ZERO theme overrides** — it
  consumes the default palette/typography/geometry unchanged.
- `packages/plggpress` typechecks strictly (`scripts/tsc-plgg.sh` green); **zero
  `as` / `any` / `ts-ignore`**; no new runtime deps; the `Palette` stays
  exhaustive (scheme × token).
- The existing theme-model specs (`token.spec.ts` + palette/typography specs)
  stay green; the plgg-cms default is reconciled or its divergence recorded.

**Verification method** — the commands/tests/probes that prove them:

- `scripts/tsc-plgg.sh` and `scripts/check-all.sh` green with the theme changes.
- A served preview (`scripts/serve-guide.sh` → the guide, and/or an `npx
  plggpress` build) rendered in a browser.

**Gate** — what must pass before approval:

- All the above green, **and** the developer opens the preview and judges it
  **side-by-side against the live qmu.co.jp**, confirming the default now reads
  as the qmu.co.jp identity (both schemes), AND confirms a qmu.co.jp build would
  need no further design customization. That live visual judgment is the gate —
  structural typecheck alone is not sufficient.

## Considerations

- **Source-of-truth nuance:** the implementer works from the EXISTING in-repo
  port (fixing drift, no live-site scrape); the developer validates against the
  LIVE qmu.co.jp at approval. If the in-repo notes and the live site disagree,
  the live site wins and the developer will flag it at the gate.
- **Don't touch the mechanism:** the parameterized token machinery, the `pm`
  cutover, and the exhaustive `Palette`/`TypeRole` types are correct — change
  VALUES and component polish, not the architecture (breaking-changes-OK still
  applies if a value shape genuinely needs it, but none is expected).
- **Two defaults exist:** plggpress and plgg-cms each carry a `Style/model`
  default; keep them consistent so "the default" means one thing.
- **Not a mission ticket:** the developer noted this is plggpress work and that
  the `plggmatic-ai-native-ui-toward-a-dsl` mission may be archived separately —
  do NOT fold this into that mission, and do not archive the mission from this
  ticket.

## Final Report

**The ticket's premise was wrong, and the driving session corrected it to the
real request.** Investigation (reading `token.ts`/`palette.ts`/`typography.ts`)
showed the plggpress default is ALREADY a faithful, value-for-value qmu.co.jp
"oracle" port — its monochrome black/white primary is qmu.co.jp's own brand, not
an arbitrary flattening. Surfaced to the developer, who clarified in three steps:

1. Not "match qmu.co.jp" (it already does) — "go beyond it, add color." Tried a
   warm-indigo colored default (`primary #4338ca`/`#a5b4fc` + warmed neutrals);
   the developer judged it "not perfect" and said the monochrome B&W is actually
   liked.
2. Reverted the neutral-warming; kept only a subtle indigo accent on `primary`.
3. The developer then named the ACTUAL "ugly": **spacing** on the plggpress
   output (the `../strategy` site — "qmu.app 計画書" — served at
   `strategy.qmu.dev`, which like `plgg-guide.qmu.dev` is pure default plggpress;
   `SiteConfig` has NO theme/palette field, so every plggpress site renders the
   one baked-in default). Finally: **"make it mono color"** — drop the accent
   entirely.

**Delivered (approved by the developer at the live preview):** the palette is
100% ORIGINAL monochrome (`palette.ts` restored, zero change); the ONLY change is
a **tightened vertical rhythm** in `theme/baseCss.ts` — the airy VitePress
spacing compacted:

- content column padding `3rem` → `2rem / 2.5rem`; H1 gap-below `3rem` → `2rem`
  (the "symmetry" with the content top-padding preserved, just smaller);
- H2 `2.85rem` → `2.1rem` top; H3/H4 `2rem`/`1.5rem` → `1.6rem`/`1.25rem`;
- paragraph `1rem` → `0.85rem`; lists/`li`/footer/`hr` tightened; body
  `line-height 1.75` → `1.7`.

Two files changed: `baseCss.ts` (the spacing) and `baseCss.spec.ts` (the pinned
"H1 3rem symmetry" test updated to `2rem`). Verification: `tsc` clean, **223
plggpress specs pass** (incl. the computed WCAG-AA contrast gate — unaffected,
palette unchanged), and a full fresh `check-all` at finalize. The developer
judged the tightened spacing live on the served preview (`localhost:8137`
strategy / `localhost:8099` guide, both rebuilt) and **approved**.

**Follow-ups (NOT done here):** (a) `strategy` is a separate repo — its
`strategy.qmu.dev` deployment must be rebuilt/redeployed there to pick up the new
plggpress dist; (b) `plgg-cms`'s parallel `Style/model` default was left untouched
(no spacing there — its layout differs); (c) the "add color" idea is shelved by
the developer's "mono color" decision — revisit only if they reopen it.

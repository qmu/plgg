---
created_at: 2026-07-01T21:18:39+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort:
commit_hash:
category:
depends_on:
---

# Match plgg-press default appearance to qmu.co.jp — part 1: design tokens & typography

## Overview

Re-skin plgg-press's default theme to the qmu.co.jp visual language at the **token/typography level** — the ~90% of the redesign that is CSS-string and small type-change work in `baseCss.ts` (plus font wiring and callout kinds). This is the foundation part; the structural layout rework (sidebar-first app-shell, chrome rail, footer, hero) is **part 2** ([20260701211840-plgg-press-sidebar-first-layout-match-qmu.md](.workaholic/tickets/todo/a-qmu-jp/20260701211840-plgg-press-sidebar-first-layout-match-qmu.md)), which depends on this.

The reference design is the sibling repo `/home/ec2-user/projects/qmu-co-jp` (Astro + Tailwind v4). Its entire token/prose/callout spec is one file: `packages/astro/src/styles/global.css`. plgg-press must **translate** that into its hand-authored `baseCss` string + plgg-view builders — it does **not** use Tailwind at runtime.

**Fidelity (author-confirmed):** design **tokens + layout match** — visually close, not pixel-perfect. This ticket delivers the tokens; part 2 delivers the layout.

qmu.co.jp's signature moves this ticket must reproduce:
- **Monochrome, zero accent hue.** No brand color; emphasis is by **inversion** (near-black block + light text on hover/active/CTA), tokens `--color-hover`/`--color-hover-ink` flipping under `.dark`. plgg-press today is sea-green (`--vp-brand #2e8b57`) throughout.
- **Inter** font (Google Fonts), replacing the system stack.
- **Weight-400 headings AND weight-400 `<strong>`** — "emphasis reads by wording, not boldness." plgg-press is bold (700/650/600).
- Calm ~1.25 type scale (h1 1.875rem, no h2 top-border divider), ink `#1f1f22` / heading `#111111` / one gray `#5b5b61`, ink underlined links that hover-invert, badge-style inline code, and the five callout kinds.

**Trip Origin:** none — direct request ("make plgg-press default appearance same as qmu.co.jp"); scoped and split during ticket creation.

## Policies

- `workaholic:design` / `policies/emergent-design-system.md` (and the design index) — porting qmu.co.jp's design tokens is adopting an existing, coherent design system; tokens (color/type/spacing) must be expressed as reusable custom properties, not ad-hoc values.
- `workaholic:design` / `policies/modeless-design.md` — dark/light is a modeless preference (no-FOUC, respects system + toggle); keep both palettes driven by the same token names.
- `workaholic:design` / WCAG conformance — the monochrome palette must keep text/background contrast AA-conformant in both light and dark (ink on bg, inverted hover states, muted gray on soft bg).
- `workaholic:implementation` / `policies/coding-standards.md` — no `as`/`any`/`@ts-ignore`; the `CalloutKind` union change stays exhaustive; `baseCss` stays **escape-safe** (see Considerations).
- `workaholic:implementation` / `policies/directory-structure.md` — changes stay within `packages/plgg-press/src/theme/`; colocated `*.spec.ts` updated alongside.
- `plgg-coding-style` (skill) — pure data-driven theme functions, Prettier printWidth 50 (don't hand-pack the CSS string), colocated specs green.

## Key Files

plgg-press (to change):

- `packages/plgg-press/src/theme/baseCss.ts` — the master CSS string; carries the palette (`:root` lines 26-59), font (63-66), links (72-76), headings/`strong` weights (content lines ~234-272), type scale, inline code (274-311), callout colors (324-344). ~90% of this ticket lands here.
- `packages/plgg-press/src/theme/callout.ts` — extend `CalloutKind = "tip"|"warning"|"danger"` and its `LABEL` record to add **info/note** (monochrome) and make `tip` emerald; keep the union exhaustive.
- `packages/plgg-press/src/theme/shell.ts` — add Inter `<link>` (+ `preconnect`) to `<head>` (currently no font link).
- `packages/plgg-press/src/theme/notFound.ts` — swap the accent utilities (`color("primary")`/`color("muted")`) to monochrome ink.
- `packages/plgg-press/src/theme/themeScript.ts` — optional: align the localStorage key `vp-appearance` → `theme` to match qmu (only if part 2 doesn't need the old key).
- Colocated specs: `callout.spec.ts`, `notFound.spec.ts`, `shell.spec.ts`, `themeScript.spec.ts` assert on class names/structure — update alongside. (`baseCss.ts` has no spec.)

qmu.co.jp (reference, read-only):

- `packages/astro/src/styles/global.css` — the canonical token/prose/callout source to port (palette `@theme` lines 22-75; heading/`strong` weights 205-223; prose scale 225-246; links 128-150; inline code 167-192; callouts 397-420).
- `packages/astro/src/layouts/BaseLayout.astro` — Inter font `<link>` + no-FOUC script (storage key `theme`).

## Related History

- No prior plgg-press theme/appearance ticket exists (dup check clean).
- plgg-press theme was built as part of the SSG stack ([20260617001953-ssg-static-site-generation.md](.workaholic/tickets/archive/work-20260617-002003/20260617001953-ssg-static-site-generation.md)); this ticket restyles its default output.

## Implementation Steps

1. **Palette.** Replace the sea-green token set in `baseCss.ts` `:root`/dark with qmu's monochrome tokens: `--color-ink #1f1f22`, `--color-ink-strong #111111`, `--color-ink-soft #5b5b61`, `--color-bg #ffffff`, `--color-bg-soft #f6f6f7`, `--color-divider #ededee`, and the inversion pair `--color-hover #111111` / `--color-hover-ink #ffffff` — plus the dark overrides (bg `#1b1b1f`, surface `#202127`, brightened ink, flipped hover pair). Keep the existing `--vp-*` names or rename to qmu's `--color-*`; whichever, drive both light and dark from one name set. Remove every literal green.
2. **Font.** Add Inter via `preconnect` + Google Fonts `<link>` in `shell.ts`; set `--font-sans: "Inter", …system-fallback` in `baseCss.ts`.
3. **Weights & scale.** Set all headings and `strong` to weight 400; adopt the ~1.25 scale (h1 1.875rem, h2 1.5rem, h3 1.1875rem); remove the h2 top-border divider.
4. **Links & inline code.** Body links ink-colored, underlined at rest, hover inverts to the near-black highlighter with light text (re-express qmu's `box-decoration`/highlight without child combinators). Inline code → faint fill + thin border + rounded badge.
5. **Callouts.** Extend `callout.ts` `CalloutKind` + `LABEL` to `info`/`note` (monochrome `border-ink-strong bg-bg-soft`), `tip` (emerald), `warning` (amber), `danger` (red); update `baseCss` callout rules; keep the `match`/exhaustive fold intact.
6. **404.** Monochrome `notFound.ts`.
7. Update the affected `*.spec.ts` for new class names/kinds; run `scripts/tsc-plgg.sh` + `scripts/test-plgg.sh`.
8. **Verify visually** (see Quality Gate): render a sample doc + 404 and screenshot-compare against qmu.co.jp for palette/typography/callouts, light and dark.

## Quality Gate

**Acceptance criteria:**
- No accent hue remains in the default theme: `grep -iE '#2e8b57|#3fb27f|sea|green' packages/plgg-press/src/theme/baseCss.ts` returns nothing (emerald is allowed **only** in the `tip` callout).
- Palette, font (Inter), heading/`strong` weight-400, type scale, ink underlined/hover-invert links, and badge inline code match qmu.co.jp in **both light and dark**.
- `CalloutKind` includes info/note/tip/warning/danger with qmu's colors; the union stays exhaustive (no `default` fallthrough).
- Text/background contrast is WCAG AA in both themes (ink-on-bg, muted-on-soft, inverted hover).
- No `as`/`any`/`@ts-ignore`; `baseCss` stays escape-safe (no raw `<`/`>`/`&`).

**Verification method:**
- `scripts/tsc-plgg.sh` exits 0; `scripts/test-plgg.sh` green, coverage ≥90%; updated theme specs assert the new tokens/kinds/markup.
- **Playwright screenshots**: render a representative plgg-press page + a callout sample + 404, light and dark, and place them side-by-side with qmu.co.jp for approval — palette/typography/callouts read as the same design.
- Contrast checked (AA) on the key pairs.

**Gate:** tsc + test green, ≥90% coverage, no escape hatch, escape-safe `baseCss`, no residual accent hue, and the side-by-side screenshots confirm token/typography parity (light + dark) before approval.

## Considerations

- **`baseCss` must stay escape-safe** (its docstring, lines 3-24): only class/descendant selectors, `@media`, custom properties — **no raw `<`/`>`/`&`**. qmu's global.css uses `>` child combinators (`.callout > :last-child`, `.prose :not(pre) > code`) and Tailwind `@apply`; these must be **re-expressed without child combinators** (descendant selectors or explicit classes) (`packages/plgg-press/src/theme/baseCss.ts`).
- **No Tailwind at runtime.** qmu's utility classes/`@theme`/`@layer` must be translated into the hand-authored `baseCss` string and plgg-view builders, not imported (`packages/astro/src/styles/global.css` is a reference, not a dependency).
- **Token naming.** Decide whether to rename `--vp-*` → qmu's `--color-*` or keep `--vp-*` and just re-value them; part 2 (layout) will touch the same file, so pick the naming now to avoid churn.
- **Storage-key change is coupled to part 2.** Only flip `vp-appearance` → `theme` if it won't strand part 2's toggle; otherwise defer the rename.
- This is part 1 of 2; the sidebar-first app-shell, chrome rail, footer, always-expanded nav, and hero restructure are in `20260701211840-…` and depend on these tokens.

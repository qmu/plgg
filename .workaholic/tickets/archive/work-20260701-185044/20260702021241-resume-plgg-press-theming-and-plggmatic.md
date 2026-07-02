---
created_at: 2026-07-02T02:12:41+09:00
author: a@qmu.jp
type: housekeeping
layer: [UX, Domain]
effort:
commit_hash:
category:
depends_on:
---

# RESUME: finish plgg-press theming (211839/211840) then plggmatic (213410–412)

## Overview

Resumption checkpoint after a long `/drive` session. **Branch `work-20260701-185044`, HEAD `0cf0383`, working tree clean (everything committed).** A fresh `/drive` should read this, then work the five still-open todo tickets in the order below. This ticket is a **map**, not new work — do not implement *this* ticket; drive the real tickets it points to, then archive this resume note.

**11 of 16 queued tickets were resolved this session** (8 fully implemented + green; 3 decided under a design principle). The five that remain are the two plgg-press theming tickets and the three plggmatic tickets.

## Session decisions to carry forward (these are settled — honor them)

1. **Principle (a) — brand at boundaries, not author-facing inputs.** A `Box` brand (`Str`/`U16`/`Float`/…) is applied ONLY where an untrusted value crosses a boundary (parsed request, network response, config decode). Developer-typed literals and ergonomic config APIs stay plain (`serve({ port: 3000 })`, `fadeIn(220)`, `env("KEY")`). Branding a literal is a **no-op box** that only adds friction. This decided 013300/013301/013303 (see their archived Final Reports).
2. **proc option 2 (211838, DONE).** `proc` structurally adds `Defect`; the chosen resolution was to accept `… | Defect` through the domain and fold it **once at the CLI edge** (`messageOf`/`render` — every error variant shares `content.message`). Array folds, transactions (commit/rollback), edge folds, and fs Promise chains are legitimately **not** `proc` and were kept.
3. **Vendor-neutrality / self-contained theme (211839).** plgg-press's theme deliberately emits **no external stylesheet** (enforced by `shell.spec`). Do **not** add a Google Fonts `<link>`. Inter is named in the font stack for local use only; the system fallback + monochrome palette + weight-400 carry the match. Keep `baseCss` **escape-safe** (no raw `<`/`>`/`&`, no `>` child combinators).
4. **New foundation combinators now exist** (use them, don't re-hand-roll): `defineVariant` (Contextuals), `refinedBrand` (Grammaticals), `Ordering`/`compare`/`comparing`/`sortBy` (Abstracts/Servables + Functionals), `foldThrown` (Exceptionals).

## Remaining work, in order

### 1. `20260701211839-plgg-press-tokens-typography-match-qmu.md` — FINISH (tokens WIP done)

**Done + committed (`0cf0383`):** `baseCss.ts` palette re-valued to qmu monochrome (zero hue: `--vp-brand:#111`, `--vp-text:#1f1f22`, muted `#5b5b61`, `--vp-bg-alt/#f6f6f7`, `--vp-divider/#ededee`, added `--vp-hover`/`--vp-hover-ink`, `--vp-shadow:none`; dark overrides). Headings + `strong` → `font-weight:400`; type scale h1 1.875 / h3 1.1875; dropped h2 top-border. Font stack prefers local Inter. plgg-press **84 passed**.

**Remaining to close 211839:**
- **Callouts** (`packages/plgg-press/src/theme/callout.ts` + `baseCss` `.vp-callout-*`): extend `CalloutKind` from `tip|warning|danger` to add `info`/`note` (monochrome: `border`≈`--vp-brand`, `bg`≈`--vp-bg-alt`); make `tip` emerald. Keep the `match` fold exhaustive (no `default`). Update `callout.spec.ts`.
- **Links** (`baseCss` `.vp a`): rest = ink + underline; hover = inverted highlighter (`background:var(--vp-hover); color:var(--vp-hover-ink)`), re-expressed WITHOUT `>` child combinators.
- **Inline code** (`baseCss` `.vp-doc code`): badge look — faint fill + thin border + rounded (already `--vp-inline` fill; add `border:1px solid var(--vp-border)`).
- **404** (`notFound.ts`): swap accent `color("primary")`/`("muted")` to monochrome ink.
- **Storage-key** (`themeScript.ts`): optional — align `vp-appearance` → `theme` (only if it won't strand 211840's toggle).
- **Quality gate (visual):** the ticket REQUIRES a Playwright side-by-side vs qmu.co.jp (light+dark). Build the guide (`scripts/…`/`plgg-press build` in `packages/guide`) or run `plgg-press dev`, screenshot with the Playwright plugin, and eyeball palette/typography/callouts. **This step needs a human at the screen** — the user said they will resume and confirm the visual match.

### 2. `20260701211840-plgg-press-sidebar-first-layout-match-qmu.md` — NOT STARTED

Structural rework (top-header → sidebar-first app-shell): `page.ts`, `navBar.ts`→48px chrome rail (toggle+GitHub bottom), `sidebarTree.ts` (drop `<details>` collapse → always-expanded, wordmark at top, inverted-pill active via `--vp-hover`), `homeHero.ts` (left-align, eyebrow, weight-400 name, no CTA, flat `bg-alt` cards), `baseCss` `.vp-nav`/`.vp-layout`/`.vp-sidebar`→`h-screen` independent-scroll app-shell + centered footer, responsive drawer below lg. Reference: `/home/ec2-user/projects/qmu-co-jp/packages/astro/src/layouts/DocsLayout.astro` + `components/react/{SidebarTree,ThemeToggle}.tsx`, `SiteFooter.astro`, `pages/index.astro`. **TOC is out of scope** (deferred). Land the lg+ shell first, then the mobile drawer. Same Playwright visual gate.

### 3–5. plggmatic `20260701213410` (scaffold+extract), `213411` (reimplement plgg-press on plggmatic), `213412` (rename plgg-press→plggpress)

**Blocked until 211839+211840 land** (the qmu theme must be finished on the current plgg-press so the reimplementation carries it forward verbatim — the "theme-first, carry over" decision). Drive them last, in the `depends_on` chain order (213410 → 213411 → 213412). Their tickets already carry full detail; note the plggmatic `depends_on` list references the whole original backlog — most is now archived, so only the two theming tickets gate them.

## Key Files

- `packages/plgg-press/src/theme/{baseCss.ts,callout.ts,notFound.ts,shell.ts,themeScript.ts}` — 211839 remaining.
- `packages/plgg-press/src/theme/{page.ts,navBar.ts,sidebarTree.ts,homeHero.ts}` + `baseCss.ts` layout section — 211840.
- `/home/ec2-user/projects/qmu-co-jp/packages/astro/src/{styles/global.css,layouts/DocsLayout.astro,components/…}` — the read-only design reference.

## Quality Gate

**Acceptance for this resume ticket** (it is a pointer; "done" = the work handed off cleanly):

- The five referenced tickets are correctly prioritized (211839 → 211840 → plggmatic 213410→411→412) and a fresh `/drive` can act on them without re-deriving context.
- The four carried decisions above are honored by the resuming session (verifiable: no Google Fonts link added; brands only at boundaries; proc/Defect at the CLI edge; combinators reused).
- Verification of the current baseline: `git log --oneline -1` is `0cf0383`; `scripts/test-plgg-press.sh` is 84 passed; `git status` clean.

**Gate:** resuming session reads this, drives 211839 to completion (incl. the human-confirmed Playwright visual match), then 211840, then plggmatic — and archives THIS note once 211839 is picked up.

## Considerations

- **Visual gate needs the user.** 211839/211840 acceptance is a screenshot comparison against qmu.co.jp; the user explicitly said "I'll resume" to drive/confirm that. Don't self-approve the visual match.
- **`baseCss` escape-safety** is load-bearing — every new selector must avoid `<`/`>`/`&` (the `shell` SSR escaper is the only gate). qmu's `>` child combinators must be re-expressed as descendant selectors.
- **Don't re-open 013300/013301/013303** — they are decided under principle (a) and archived; reviving a blanket brand sweep would contradict the settled decision.
- This session's per-package WIP-commit style is intentional; continue it for the large theming/framework tickets so progress stays protected across sessions.

---
created_at: 2026-07-06T18:32:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 2h
commit_hash: 08710546
category: Added
depends_on: []
---

# Demo 2 — Color scheme: a runnable proof of the token-driven light/dark reschemer

## Overview

Fill the `/demo/2` slot (currently a stub) with **Demo 2 — Color scheme**: a small **runnable app** that demonstrates plggmatic's second pillar — the **light/dark color scheme driven by design tokens**. Each numbered demo isolates one pillar; this one isolates color. The app renders a **live reschemer**: the framework's own `themeToggle` component wired to `applyScheme`/`decideScheme`, and a grid of **semantic-token swatches** (`--pm-surface`, `--pm-text`, `--pm-border`, primary/danger roles, …) plus a few components (button variants) that all rescheme together when the single `html.dark` class flips — the visible proof of the framework's two rules: **one class reschemes everything**, and **nothing renders state by color alone**. It complements the [`/color-scheme`](/color-scheme) and [`/design-tokens`](/design-tokens) doc pages (which explain the tokens) by making the rescheme interactive.

Authored like the forms showcase: a self-contained plgg-view `sandbox` program, a new `demo2.html`, nested into the served site at `/example/demo2.html`. The `/demo/2` page is rewritten from stub to a real explanation linking to the running app.

## Decisions (recorded from the Quality-Gate interrogation)

1. **Topic:** Demo 2 = the color-scheme pillar (Demo 1 = pane alignment, Demo 3 = scheduler query + derived URL codec).
2. **Form:** real app + explanation page — a new CSR bundle under `/example/`, with `/demo/2` explaining and linking to it.
3. **Non-duplication:** the site chrome's own dark-mode toggle is plggpress's; this demo exercises **plggmatic's** framework scheme system (`themeToggle`, `applyScheme`, `decideScheme`, the `--pm-*` tokens) as a standalone proof with token swatches — which no existing page shows interactively.
4. **Quality gate:** `packages/site` `npm run check` + `packages/plggmatic-example` `npm test` + browser interaction (see `## Quality Gate`).

## Policies

- `workaholic:design` / `self-explanatory-ui` — the swatches must be self-labelling (token name + its live value) so the reader learns the token vocabulary from the demo itself; the `/demo/2` page says what it proves before linking.
- `workaholic:design` / `modeless-design` — the toggle is a direct control; the demo has no hidden mode; reachable via sidebar, catalog, and page link.
- `workaholic:planning` / `accessibility-first` — the demo is the standing proof that state is not signalled by color alone (WCAG 2.2): every swatch/label carries text, active/selected states carry a non-color cue, and contrast holds in both schemes (the framework already ships a contrast spec — do not regress it).
- `workaholic:planning` / `terminology` — one word per concept: use Token and Scheme exactly as the framework does (light/dark sets of token values are Schemes); no "theme"/"palette" synonym drift in the UI or prose.
- `workaholic:implementation` / `coding-standards` — plgg house style; no `as`/`any`/`ts-ignore`; printWidth 50; follow `plgg-coding-style`.
- `workaholic:implementation` / `directory-structure` — source under `src/demo2/`, shell + entry beside the existing pair.

## Key Files

- `packages/plggmatic-example/src/demo2/colorSchemeDemo.ts` — **new**: the `Sandbox<Model, Msg>` program. Renders the framework `themeToggle` (from `plggmatic`) and a swatch grid built from the semantic tokens exported by `plggmatic/style` (`schemes`, `colorVar`/`metricVar`, the `--pm-*` names). Model holds the current scheme; toggling dispatches a `Msg` and (via `cmdEffect` or the boot seam) calls `applyScheme`. Pattern reference: `src/forms/formsDemo.ts` and the boot wiring in `src/main.ts` (`decideScheme`/`applyScheme`/`appearanceStorageKey`).
- `packages/plggmatic-example/src/demo2/colorSchemeDemo.spec.ts` — **new**: plgg-test spec asserting the toggle update flips the model's scheme and the view renders a labelled swatch per token. Mirror `src/forms/formsDemo.spec.ts`.
- `packages/plggmatic-example/src/demo2-main.ts` — **new**: CSR entry mirroring `src/forms-main.ts`/`src/main.ts` — inject `metricCss + schemeCss` (+ page css), run the `applyScheme(decideScheme(...))` boot, mount the `sandbox`.
- `packages/plggmatic-example/demo2.html` — **new**: HTML shell mirroring `forms.html`.
- `packages/plggmatic-example/bundle.config.ts` — **edit**: add `{ name: "demo2", input: "demo2-main.ts" }`.
- `packages/plggmatic-example/src/stamp.ts` — **edit**: add `["demo2.html", "demo2.js"]` to `pages`.
- `packages/site/demo/2.md` — **edit**: replace the stub with a real page (what it proves — the scheme pillar, token swatches, one-class rescheme, nothing-by-color-alone) and a link to `/example/demo2.html` (`.html` → dead-link-gate-exempt via `isAssetPath`).

## Implementation steps

1. Author `src/demo2/colorSchemeDemo.ts` + spec (sandbox program), reusing the scheme-boot pattern from `src/main.ts` and the token exports from `plggmatic/style`.
2. Add `src/demo2-main.ts` and `demo2.html`; wire the `bundle.config.ts` and `stamp.ts` entries.
3. `npm run build` in `packages/plggmatic-example`; confirm `dist/demo2.{html,js}` and the stamped script URL.
4. Rewrite `packages/site/demo/2.md` (the `Demo 2` sidebar leaf already exists).
5. Rebuild site, re-nest the example into `packages/site/dist/example/`, refresh 5182, verify in a browser.

No `scripts/build.sh`, `site.config.ts`, or plggpress change.

## Quality Gate

Approval in `/drive` requires **all** of:

1. `packages/plggmatic-example$ npm test` green (tsc + plgg-test; the new spec passes).
2. `packages/site$ npm run check` green (examples tsc + plggpress build incl. dead-link checker; the `/demo/2` → `/example/demo2.html` link resolves).
3. Browser interaction on the 5182 preview, after rebuilding example + site and re-nesting:
   - `/example/demo2.html` renders the swatch grid and the framework `themeToggle`;
   - toggling flips light↔dark: every swatch, label, and sample component reschemes from the single `html.dark` class (verify the class flips in the DOM);
   - every state cue remains legible without color (text/labels present); contrast holds both ways;
   - no new console errors beyond the known `favicon.ico` 404;
   - `/demo/2` renders the explanation and its link opens the running demo.

## Out of scope / Notes

- Changing the framework's token values or contrast rules (this demo displays them, it does not redefine them).
- The plggpress site chrome's own toggle (separate concern; untouched).
- No production deploy; local 5182 preview only.

## Final Report

Implemented as specified — a `sandbox` reschemer served under `/example/`.

- New: `src/demo2/colorSchemeDemo.ts` (the sandbox program: framework `themeToggle`, a swatch grid over every token grouped Neutrals + the five semantic roles, the toggle `Msg` flipping the model scheme and an `applyScheme` `cmdEffect` seam; a `makeProgram(initial)` factory so the mount seeds the model from the boot-decided scheme), `src/demo2/colorSchemeDemo.spec.ts` (3 SSR specs), `src/demo2-main.ts` (CSR entry with the framework appearance boot), `demo2.html` (shell).
- Edited: `bundle.config.ts` (+`demo2`), `src/stamp.ts` (+`demo2.html`), `packages/site/demo/2.md` (stub → real page linking to `/example/demo2.html`).
- **Enabling framework change (additive):** exported the token-vocabulary arrays `neutrals`, `semanticRoles`, `variants` from `plggmatic/Style` and the `plggmatic/style` subpath — the swatch grid groups by these. Additive only (no value/type change); plggmatic's own suite stays green (170 passed, coverage gate > 90%).
- **Deviation from the ticket:** dropped the two sample buttons. Browser check exposed that the shared `demoCss` `.pm-btn-primary` pairs `primary-base` fill with `primary-text` ink (light-on-light / dark-on-dark → invisible label in both schemes — a pre-existing demoCss contrast bug). Rather than ship a WCAG failure or edit shared demoCss (used by the forms demo), the 25-token swatch grid is the whole proof; each swatch carries its name, so nothing reads by color alone. (Pre-existing `.pm-btn-primary` contrast left as a separate concern.)
- **Test-DOM note:** the in-house DOM has no `document.documentElement` and no `createElementNS`, so the spec asserts on the SSR `renderToString(view(...))` output (swatch count = `colors.length`, token names present, aria-label seeding) and the pure reducer (scheme flip + `applied` no-op); the real `html.dark` flip is browser-verified.
- Quality gate passed: `plggmatic-example` `npm test` green — tsc + plgg-test, **18 passed** (3 new). `packages/site` `npm run check` green — examples tsc + plggpress build (19 pages), dead-link gate green. Browser-verified on the 5182 preview: all 25 labelled swatches render; the `themeToggle` flips light↔dark and every `var(--pm-*)` swatch reschemes from the single class; 0 console errors/warnings. `/demo/2` renders and its "Run demo 2" link opens the app.

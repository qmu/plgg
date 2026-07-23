---
created_at: 2026-07-06T18:31:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 2h
commit_hash: dfbc4154
category: Added
depends_on: []
---

# Demo 1 — Pane alignment: a runnable proof of the column/pane/alignment primitives

## Overview

Fill the `/demo/1` slot (currently a stub from the archived index ticket) with **Demo 1 — Pane alignment**: a small **runnable app** that demonstrates plggmatic's first pillar — the **column-oriented pane alignment system** — with the raw layout combinators (`row`, `column`, `pane`/`navPane`/`mainPane`/`asidePane`) composed by hand, *not* through the scheduler. Where the workbench (`/example/`) combines all three pillars into one real app, each numbered demo isolates **one pillar** as the smallest runnable proof. This one isolates geometry: a live `nav | main | aside` three-pane layout the reader can fold and resize (collapse the nav, collapse the aside, switch a track between a fixed `basis(...)` and `fluid`), so the semantics the [`/pane-alignment`](/pane-alignment) and [`/multi-column`](/multi-column) doc pages describe are visible and interactive.

The demo is authored the same way as the existing forms showcase (`src/forms/`): a self-contained plgg-view `sandbox` program (no URL needed), mounted from a new `demo1.html` beside the built bundle, nested by `scripts/build.sh` into the served site at `/example/demo1.html`. The `/demo/1` doc page is rewritten from stub to a real explanation that links to the running app.

## Decisions (recorded from the Quality-Gate interrogation)

1. **Topic:** Demo 1 = the pane alignment pillar (one demo per pillar; Demo 2 = color scheme, Demo 3 = scheduler query + derived URL codec).
2. **Form:** real app + explanation page — a new CSR bundle in `packages/plggmatic-example` served under `/example/`, with `/demo/1` explaining it and linking to it.
3. **Non-duplication:** uses the **raw** `row`/`column`/`pane` combinators hand-composed (the workbench reaches the same geometry only via `schedule` + `multiColumn`); this demo shows the primitives directly, which no existing page does interactively.
4. **Quality gate:** `packages/site` `npm run check` + `packages/plggmatic-example` `npm test` + browser interaction (see `## Quality Gate`).

## Policies

- `workaholic:design` / `self-explanatory-ui` — the demo must make its own controls obvious: a reader lands on `/example/demo1.html` and can tell what each fold/resize toggle does without a manual; the `/demo/1` page states what the demo proves before linking to it.
- `workaholic:design` / `modeless-design` — folding/resizing are direct toggles, no hidden mode; reachable from the sidebar (Demos → Demo 1), the catalog, and the page link.
- `workaholic:planning` / `accessibility-first` — the panes must render as real `nav`/`main`/`aside` landmarks (the combinators already do this); the demo is the visible proof that the accessibility skeleton comes from the layout primitives, and it must stay WCAG-legible (never signal a folded/active state by color alone).
- `workaholic:planning` / `terminology` — one word per concept: use the framework's own words (Column, Pane, Alignment) in the UI labels and the page prose; do not introduce synonyms.
- `workaholic:implementation` / `coding-standards` — plgg house style throughout: Option not null, Result not throw, exhaustive `match`, no `as`/`any`/`ts-ignore`; Prettier printWidth 50; follow the `plgg-coding-style` skill.
- `workaholic:implementation` / `directory-structure` — the demo source lives under `src/demo1/` mirroring `src/forms/`; the HTML shell and `-main.ts` entry sit beside the existing pair.

## Key Files

- `packages/plggmatic-example/src/demo1/paneAlignmentDemo.ts` — **new**: the `Sandbox<Model, Msg>` program (init/update/view) using `row`/`column`/`pane`/`navPane`/`mainPane`/`asidePane` from `plggmatic`, with toggles for nav-collapse, aside-collapse, and fixed-basis vs `fluid` tracks. Model is one immutable record; every change is a `Msg`; `update`/`view` pure. Pattern reference: `src/forms/formsDemo.ts`.
- `packages/plggmatic-example/src/demo1/paneAlignmentDemo.spec.ts` — **new**: plgg-test spec asserting the update transitions (e.g. toggling nav-collapse flips the model; view renders the `<nav>`/`<main>`/`<aside>` landmarks). Mirror `src/forms/formsDemo.spec.ts`.
- `packages/plggmatic-example/src/demo1-main.ts` — **new**: CSR entry mirroring `src/forms-main.ts` — inject `metricCss + schemeCss` (+ a small page stylesheet) and mount the `sandbox`.
- `packages/plggmatic-example/demo1.html` — **new**: HTML shell mirroring `forms.html` (`<div id="root">`, `<script type="module" src="./demo1.js">`).
- `packages/plggmatic-example/bundle.config.ts` — **edit**: add `{ name: "demo1", input: "demo1-main.ts" }` to `entries`.
- `packages/plggmatic-example/src/stamp.ts` — **edit**: add `["demo1.html", "demo1.js"]` to `pages` (this is also what copies the shell into `dist/`).
- `packages/site/demo/1.md` — **edit**: replace the stub with a real page — what the demo proves (the alignment pillar, raw combinators, landmark semantics), and a link to the running app at `/example/demo1.html` (root-absolute link is dead-link-gate-exempt because the final segment has a `.html` extension — `isAssetPath` in `plggpress/CheckLinks`). Keep any `ts` code fence's twin under `packages/site/examples/` if one is added; a prose+link page needs no twin.

## Implementation steps

1. Author `src/demo1/paneAlignmentDemo.ts` (sandbox program) + its spec, following the `src/forms/` pattern and the `plgg-coding-style` skill.
2. Add `src/demo1-main.ts` and `demo1.html`; wire the `bundle.config.ts` entry and the `stamp.ts` `pages` entry.
3. `cd packages/plggmatic-example && npm run build` — confirm `dist/demo1.html` + `dist/demo1.js` and a stamped `src="./demo1.js?v=<hash>"`.
4. Rewrite `packages/site/demo/1.md`; add nothing to the sidebar (the `Demo 1` leaf already exists).
5. Rebuild the site and re-nest the example (`npm run build` in `packages/site`, then the `scripts/build.sh` copy of `plggmatic-example/dist/.` into `packages/site/dist/example/`), refresh the 5182 preview, and verify in a browser.

No `scripts/build.sh` change (the `/example/` copy already nests the whole example dist); no `site.config.ts` change (the leaf exists); no plggpress change.

## Quality Gate

Approval in `/drive` requires **all** of:

1. `packages/plggmatic-example$ npm test` green — `tsc --noEmit` + `plgg-test src` (the new spec passes; coverage is exempt for this private demo app per `plgg-test.config.json`, but the spec must still pass).
2. `packages/site$ npm run check` green — examples tsc + plggpress build incl. the dead-link checker (proves the `/demo/1` → `/example/demo1.html` link resolves under the asset-path exemption and nothing else broke).
3. Browser interaction on the 5182 preview (`plggmatic-guide.qmu.dev` / `localhost:5182`), after rebuilding example + site and re-nesting:
   - `/example/demo1.html` renders the three-pane layout; the DOM shows real `<nav>`, `<main>`, `<aside>` landmarks;
   - collapsing the nav and the aside visibly folds them and is reversible; switching a track between fixed `basis` and `fluid` visibly changes the geometry;
   - dark-mode renders legibly; no new console errors beyond the known `favicon.ico` 404;
   - `/demo/1` renders the explanation and its link opens the running demo.

## Out of scope / Notes

- The scheduler/`multiColumn` path (that's the workbench and, for query+URL, Demo 3); form controls (that's the forms showcase and Demo 2 touches scheme, not forms).
- No production deploy; verification is the local 5182 preview only.

## Final Report

Implemented as specified — a `sandbox` demo built from the raw layout combinators, served under `/example/`.

- New: `src/demo1/paneAlignmentDemo.ts` (the sandbox program: `row`/`column`/`navPane`/`mainPane`/`asidePane`, nav track cycling `basis("180px")`→`basis("320px")`→`fluid`, panes collapsed by omission), `src/demo1/paneAlignmentDemo.spec.ts` (4 DOM specs), `src/demo1-main.ts` (CSR entry), `demo1.html` (shell).
- Edited: `bundle.config.ts` (+`demo1` entry), `src/stamp.ts` (+`demo1.html` page), `packages/site/demo/1.md` (stub → real page linking to `/example/demo1.html` and cross-linking pane-alignment/multi-column/workbench/catalog).
- Quality gate passed: `plggmatic-example` `npm test` green — tsc + plgg-test, **15 passed** (4 new), the demo1 program at 100% coverage. `packages/site` `npm run check` green — examples tsc + plggpress build (19 pages), dead-link gate green (the `/example/demo1.html` link passes via the asset-path `.html` exemption). Browser-verified on the 5182 preview: three real `nav`/`main`/`aside` landmarks render; collapsing the aside reflows the fluid main; cycling the nav to `fluid` splits the row with main; dark-mode legible; only the known `favicon.ico` 404 in console. `/demo/1` renders and its "Run demo 1" link opens the app.

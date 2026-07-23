---
created_at: 2026-07-06T20:18:20+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 2h
commit_hash: 9ecef1dc
category: Changed
depends_on: []
---

# Replace Demo 1 (pane alignment) with a contract-dev business-management-system menu, laid out from scratch

## Overview

Pivot Demo 1 from the pane-alignment showcase to the **first step of a new running theme**: a business-management system for a **contract software-development company (受託開発)**. This step delivers **the menu, declared from scratch** — plggmatic's `menu([menuEntry(...)])` as pure data — with the eight top-level sections such a company needs, rendered by the scheduler as the system's navigation. Later steps flesh out each section's collection (real lists, detail, actions); this ticket lays out the menu and makes it navigable.

**Decided menu (Core 8, English labels):**
`Dashboard · Projects · Clients · Estimates & Contracts · Timesheets · Invoices · Members · Reports`

**Location:** `packages/plggmatic-example` (`@plggmatic/example`) — the private consumer package where `demo1.html` and the demo build/nest wiring already live (NOT `packages/example`, which is the unrelated `@plgg/example` To-Do tutorial). The demo consumes the published `plggmatic` package exactly as an external user would.

## Decisions (recorded from the Quality-Gate interrogation)

1. **Scope = the menu only, this step.** Eight `menuEntry`s declared as data and rendered as the root navigation. Each entry is backed by a **minimal collection** (a short placeholder/sample list) so the menu is clickable and navigable; the real per-section data/detail/actions are follow-up steps.
2. **Replace, not add.** Demo 1's pane-alignment program, spec, and page content are **retired** and replaced (the user said 置き換え). The `/demo/1` slot, the `demo1` bundle entry, and the `/example/demo1.html` nesting are reused.
3. **Labels in English**, matching the English guide site (the labels also quietly prove plggmatic renders a real app's nav from a declaration).
4. **URL-aware mount.** Mount with `application` (not `sandbox`) so selecting a menu section reflects to the address bar and deep-links — consistent with how the system will grow.
5. **Quality gate:** `packages/site` `npm run check` + `packages/plggmatic-example` `npm test` + browser (menu renders as a nav landmark, every section navigable, selection reflects to the URL). See `## Quality Gate`.

## Policies

- `workaholic:planning` / `terminology` — one word per concept for the domain nav: `Projects` (受託案件), `Clients` (取引先), `Timesheets` (工数), etc. — fixed labels, no synonyms drifting across steps as the system grows.
- `workaholic:design` / `self-explanatory-ui` — the menu is the system's front door; a reader must grasp the whole business-management surface from the eight labels alone.
- `workaholic:design` / `modeless-design` — every section reachable directly from the menu, each a deep-linkable URL; no hidden mode.
- `workaholic:planning` / `accessibility-first` — the scheduler renders the menu as a real `nav` landmark with labelled entries and `aria-current` on the active section; keep that (it falls out of the declaration).
- `workaholic:implementation` / `coding-standards` — the whole program is pure data through `declare`; the derived `Model`/`Msg`/`update`/URL codec are never hand-written. No `as`/`any`/`ts-ignore`; Prettier printWidth 50; follow `plgg-coding-style`.
- `workaholic:implementation` / `directory-structure` — the new source lives under `src/demo1/` (replacing the pane-alignment files); the shell + entry keep the `demo1` names.
- `project_sacrificial_architecture` — apt framing for this demo: the app is a disposable declaration over a durable framework; a contract-dev shop's system is exactly the "regenerate the app, keep the domain" case.

## Key Files

- `packages/plggmatic-example/src/demo1/bizMenuDemo.ts` — **new** (replaces `paneAlignmentDemo.ts`): the `declare({ title, menu, collections })` — `menu([...8 menuEntry])` plus eight minimal `collection<T>` stubs (each `id`, `title`, `toRow`, `source: sync(...)` with a few sample rows), `schedule(...)`, and an `Application` view drawn by `multiColumn`. Pattern reference: `src/declaration.ts` + `src/app.ts` (trim to a nav-first, data-light shape).
- `packages/plggmatic-example/src/demo1/bizMenuDemo.spec.ts` — **new** (replaces `paneAlignmentDemo.spec.ts`): assert the derived program — the root view renders the eight menu labels as a `nav` landmark, and selecting a section drives the URL (`scheduled.toUrl`) to `?c=<section>`. Mirror `src/app.spec.ts`.
- `packages/plggmatic-example/src/demo1-main.ts` — **edit**: mount with `application` (URL-aware) + the scheme boot; inject `metricCss + schemeCss + chromeCss + demoCss` (multi-column chrome).
- `packages/plggmatic-example/demo1.html` — **edit**: retitle to the business-management menu demo.
- `packages/plggmatic-example/src/demo1/paneAlignmentDemo.ts`, `paneAlignmentDemo.spec.ts` — **delete**.
- `packages/plggmatic-example/bundle.config.ts`, `src/stamp.ts` — the `demo1` entry/page stay (comment updated to the new subject).
- `packages/site/demo/1.md` — **rewrite**: h1 + intro, `## Run Demo` (link to `/example/demo1.html`), `## What's so plggmatic` (the whole nav is a declaration — menu as data, scheduler derives the program). Keep the `Run Demo` / `What's so plggmatic` structure; no catalog back-link.

## Implementation steps

1. Author `src/demo1/bizMenuDemo.ts`: `declare` with the eight `menuEntry`s and eight minimal `collection` stubs (a couple of representative sample rows each so navigation shows content), `schedule`, and the `application` view via `multiColumn`; export `scheduled` for the spec.
2. Author `src/demo1/bizMenuDemo.spec.ts` (nav labels + `toUrl` on select).
3. Update `src/demo1-main.ts` to `application(app)` with the scheme boot; retitle `demo1.html`.
4. Delete the two `paneAlignmentDemo.*` files; update the `bundle.config.ts` / `stamp.ts` comments (entries unchanged).
5. Rewrite `packages/site/demo/1.md`.
6. Build `packages/plggmatic-example`, rebuild `packages/site`, re-nest `dist/example`, refresh the 5182 preview, verify in a browser.

No plggpress change, no `scripts/build.sh` change (the `/example/` nesting already copies the whole example dist), no `site.config.ts` change (the `Demo 1` leaf stays).

## Quality Gate

Approval in `/drive` requires **all** of:

1. `packages/plggmatic-example$ npm test` green — tsc + plgg-test (the new spec passes; coverage exempt for this private demo but the spec must pass).
2. `packages/site$ npm run check` green — examples tsc + plggpress build incl. the dead-link checker (`/demo/1` → `/example/demo1.html` resolves via the `.html` asset exemption; no dangling links after the rewrite).
3. Browser on the 5182 preview, after rebuilding example + site and re-nesting:
   - `/example/demo1.html` renders the eight menu labels (Dashboard … Reports) as a real `<nav>` landmark;
   - selecting a section reflects to the address bar (`?c=<section>`), shows that section's (placeholder) content, and marks the active entry (`aria-current`);
   - a deep link (`?c=projects`) opens that section directly;
   - dark-mode legible; no new console errors beyond the known `favicon.ico` 404;
   - `/demo/1` renders with the `Run Demo` + `What's so plggmatic` sections and its link opens the app.

## Out of scope / Notes

- The real per-section data, detail views, filters, and create/update/delete actions (Projects list, Timesheets entry, Invoice generation, …) — follow-up steps, one section (or a few) at a time, each replacing a stub.
- The pane-alignment demo is retired by decision 2; if it should return, it is a separate ticket (the alignment pillar is still documented at `/pane-alignment` and `/multi-column`).
- Demos 2 (color scheme) and 3 (scheduler query) are untouched this step.

## Final Report

Implemented as specified — Demo 1 is now the contract-dev business-management system's menu, declared from scratch and mounted with `application`.

- New: `src/demo1/bizMenuDemo.ts` (`declare` with `menu([...8 menuEntry])` + eight `collection` stubs built by mapping a `SECTIONS` table, `schedule`, an `application` view via `multiColumn`), `src/demo1/bizMenuDemo.spec.ts` (4 specs: nav renders the eight labels, `openMenu` drives `toUrl` to `?c=projects`, deep-link opens a section, drill shows placeholder rows). Deleted the two `paneAlignmentDemo.*` files.
- Edited: `src/demo1-main.ts` (mount with `application` + scheme boot + chrome CSS), `demo1.html` (retitle), `bundle.config.ts` (comment); `stamp.ts` entry unchanged. `packages/site/demo/1.md` rewritten (Run Demo + What's so plggmatic, with a `menu([...])` code fence) and a compile-checked twin `packages/site/examples/bizMenu.ts` added.
- **Framework bug fixed (the demo surfaced it):** the multi-column chrome painted the `aria-current` inverted pill (and the close/crumb hover pills) as `color: primary-text` on `background: primary-base`. Under the monochrome default `primary-text` ≈ `primary-base` in *both* schemes (light #111/#111, dark #f4f4f4/#f4f4f4), so **the active menu label was invisible** (black-on-black). Verified live: before = `color rgb(17,17,17)` on `bg rgb(17,17,17)`; after = `rgb(255,255,255)` on `rgb(17,17,17)`. Fixed `chromeCss.ts` to use the neutral `surface` ink — the on-fill label the `base` variant documents. This also fixes the workbench (`/example/`) and Demo 3, whose active nav pills had the same defect. plggmatic suite stays green (170 passed, coverage gate held); the chromeCss spec asserts the selector, not the colour, so no spec change.
- Quality gate passed: `packages/plggmatic-example` `npm test` green — **23 passed** (4 new, demo1 program 100%). `packages/site` `npm run check` green — examples tsc (incl. the new `bizMenu.ts` twin) + plggpress build (19 pages), dead-link gate green. Browser-verified on the 5182 preview: the eight sections render as a real `<nav>` landmark; selecting a section reflects to `?c=<section>`, shows its placeholder rows, and marks the active entry with a now-legible white-on-black pill; deep link `?c=projects` opens directly; 0 console errors/warnings. `/demo/1` renders with Run Demo + What's so plggmatic and its link opens the app.
- Retired: the pane-alignment demo (per decision 2); the alignment pillar stays documented at `/pane-alignment` and `/multi-column`.

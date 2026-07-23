---
created_at: 2026-07-06T18:33:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 4h
commit_hash: f400ef70
category: Added
depends_on: []
---

# Demo 3 — Scheduler query + derived URL codec: the smallest deep-linkable scheduled program

## Overview

Fill the `/demo/3` slot (currently a stub) with **Demo 3 — Scheduler query + derived URL codec**: a small **runnable app** that isolates plggmatic's third pillar — the **declarative scheduler** — down to its most quotable property: **the URL is the derived, canonical, total codec**. The demo is the *smallest* `schedule(declare(...))` program that proves it — one flat, filterable collection with a `query` box — mounted with plgg-view's URL-aware `application` (not `sandbox`). Typing in the query reflects to `?q=…`; selecting a row reflects to `?c=…&p=…`; a deep link reproduces the exact slice; browser back/forward walk the history — all from the codec `schedule(...)` **derives**, with no hand-written parsing. Where the workbench (`/example/`) shows the full multi-level drill-down, this demo strips it to a single level so the query→URL reflection is the whole point.

Authored like the workbench mount (`src/main.ts` uses `application`): a scheduled program, a new `demo3.html`, nested into the served site at `/example/demo3.html`. The `/demo/3` page is rewritten from stub to a real explanation linking to the running app, and (optionally) asserting the derived `toUrl` in a spec the way `app.spec.ts` does.

## Decisions (recorded from the Quality-Gate interrogation)

1. **Topic:** Demo 3 = the scheduler's query + derived URL codec (Demo 1 = pane alignment, Demo 2 = color scheme).
2. **Form:** real app + explanation page — a new CSR bundle under `/example/`, with `/demo/3` explaining and linking to it.
3. **Non-duplication vs the workbench:** the workbench proves the scheduler through a full sections→notes→reader drill-down; **Demo 3 is deliberately one flat collection + a query**, the minimal program whose entire behaviour is query/selection→URL reflection. It exists to make the "URL is the derived codec" claim legible in isolation, not to re-show the workbench.
4. **URL-aware mount:** use `application` (owns the address bar), not `sandbox` — this is the one demo that needs the URL.
5. **Quality gate:** `packages/site` `npm run check` + `packages/plggmatic-example` `npm test` (including a `toUrl` assertion) + browser deep-link/back-forward interaction (see `## Quality Gate`).

## Policies

- `workaholic:design` / `modeless-design` — the address bar is the single source of truth for the slice; no hidden UI mode. The demo is the proof that every reachable state is a URL (deep-linkable) and reversible (back/forward), reachable via sidebar, catalog, and page link.
- `workaholic:design` / `self-explanatory-ui` — surface the live URL (or describe it on `/demo/3`) so the reader sees the reflection happening; the page states what it proves before linking.
- `workaholic:planning` / `accessibility-first` — the query input is labelled; selection carries `aria-current` (the scheduler already emits it); results announce via the framework's existing semantics — do not regress them.
- `workaholic:planning` / `terminology` — one word per concept: Collection, Query, Scene, Codec as the framework names them; no "search"/"route" synonym drift.
- `workaholic:implementation` / `coding-standards` — plgg house style; no `as`/`any`/`ts-ignore`; printWidth 50; follow `plgg-coding-style`. The declaration is pure data through `declare`; the derived `Model`/`Msg`/`update`/codec are never hand-written.
- `workaholic:implementation` / `directory-structure` — source under `src/demo3/`, shell + entry beside the existing pair.
- `workaholic:implementation` / `objective-documentation` — the `/demo/3` page describes the codec the program actually derives; assert the real `toUrl` in the spec (as `app.spec.ts` pins the workbench's) rather than restating behaviour in prose alone.

## Key Files

- `packages/plggmatic-example/src/demo3/queryUrlDemo.ts` — **new**: the declaration + wired program. `declare({ menu, collections: [collection<Item>({ id, title, toRow, source: sync(...), query: query("...") })] })`, `schedule(...)`, and an `Application` view drawn by `multiColumn` (or `singleColumn`). Export the `scheduled` program so the spec can assert `scheduled.toUrl`. Pattern reference: `src/app.ts` + `src/declaration.ts` (trim to one collection).
- `packages/plggmatic-example/src/demo3/queryUrlDemo.spec.ts` — **new**: plgg-test spec asserting the derived URL codec directly — `scheduled.toUrl(model)` for a queried/selected slice, and that a deep-link URL parses back to that slice (total in both directions). Mirror `src/app.spec.ts`.
- `packages/plggmatic-example/src/demo3-main.ts` — **new**: CSR entry mirroring `src/main.ts` — inject css, run the scheme boot, mount with `application` (URL-aware).
- `packages/plggmatic-example/demo3.html` — **new**: HTML shell mirroring `index.html`/`forms.html`.
- `packages/plggmatic-example/bundle.config.ts` — **edit**: add `{ name: "demo3", input: "demo3-main.ts" }`.
- `packages/plggmatic-example/src/stamp.ts` — **edit**: add `["demo3.html", "demo3.js"]` to `pages`.
- `packages/site/demo/3.md` — **edit**: replace the stub with a real page (what it proves — the derived, total URL codec; query→`?q`, selection→`?c&p`; deep-link + back/forward) and a link to `/example/demo3.html` (`.html` → dead-link-gate-exempt).

## Implementation steps

1. Author `src/demo3/queryUrlDemo.ts` (declaration + `schedule` + `application` view) and its spec, trimming `src/declaration.ts`/`src/app.ts` to a single flat collection with a query; assert `scheduled.toUrl` like `app.spec.ts`.
2. Add `src/demo3-main.ts` (using `application`, per `src/main.ts`) and `demo3.html`; wire the `bundle.config.ts` and `stamp.ts` entries.
3. `npm run build` in `packages/plggmatic-example`; confirm `dist/demo3.{html,js}` and the stamped script URL.
4. Rewrite `packages/site/demo/3.md` (the `Demo 3` sidebar leaf already exists).
5. Rebuild site, re-nest the example into `packages/site/dist/example/`, refresh 5182, verify deep-linking + back/forward in a browser.

No `scripts/build.sh`, `site.config.ts`, or plggpress change.

## Quality Gate

Approval in `/drive` requires **all** of:

1. `packages/plggmatic-example$ npm test` green — tsc + plgg-test, **including** the `scheduled.toUrl` round-trip assertion (a queried+selected model serializes to the expected `?c=…&p=…&q=…`, and that URL parses back to the same slice).
2. `packages/site$ npm run check` green — examples tsc + plggpress build incl. dead-link checker; `/demo/3` → `/example/demo3.html` resolves.
3. Browser interaction on the 5182 preview, after rebuilding example + site and re-nesting:
   - `/example/demo3.html` renders the list + query box; typing filters the list and updates the address bar to `?q=…`; selecting a row updates it to `?c=…&p=…`;
   - loading a deep link (`/example/demo3.html?c=…&p=…&q=…` directly) reproduces the exact filtered/selected slice;
   - browser Back reverses the last query/selection change; Forward reapplies it;
   - dark-mode legible; no new console errors beyond the known `favicon.ico` 404;
   - `/demo/3` renders the explanation and its link opens the running demo.

## Out of scope / Notes

- Multi-level drill-down, create/delete actions, confirmation dialogs (those are the workbench and the forms showcase); Demo 3 is intentionally one flat collection + a query.
- No production deploy; local 5182 preview only.

## Final Report

Implemented as specified — the smallest scheduled program, mounted with `application`, served under `/example/`.

- New: `src/demo3/queryUrlDemo.ts` (one flat `collection` with a `query`, `schedule(declaration)`, an `Application` view drawn by `multiColumn` plus a live "derived URL" bar reading `scheduled.toUrl(model).search`), `src/demo3/queryUrlDemo.spec.ts` (4 codec specs asserting the derived `toUrl`), `src/demo3-main.ts` (CSR entry mounting with `application` + the appearance boot), `demo3.html` (shell).
- Edited: `bundle.config.ts` (+`demo3`), `src/stamp.ts` (+`demo3.html`), `packages/site/demo/3.md` (stub → real page linking to `/example/demo3.html`).
- **Behaviour pinned honestly:** driving `select` after a query *clears* the filter (a drill resets the level's filter), so a selected slice serializes to `?c=items&p=moss` (no `&q`). The spec therefore asserts query-alone (`?c=items&q=mo`) and selection-alone (`?c=items&p=moss`) separately, plus the round-trip and that a deep link `?c=items&p=fern&q=fer` parses back to path `[fern]` + query `fer` (the codec is total on parse even for the query+selection combination the live drive doesn't produce). No hand-written parsing — `scheduled.toUrl` is the derived codec.
- Quality gate passed: `plggmatic-example` `npm test` green — tsc + plgg-test, **23 passed** (4 new, asserting the derived `toUrl` directly per the ticket). `packages/site` `npm run check` green — examples tsc + plggpress build (19 pages), dead-link gate green. Browser-verified on the 5182 preview: typing the filter reflects to `?c=items&q=mo` and narrows the list; selecting drills to `?c=items&p=moss` and clears the filter; the deep link `?c=items&p=fern&q=fer` reproduced the exact filtered+selected slice (filter box "fer", one-row list, fern detail); **browser back restored the previous slice via popstate**; the live derived-URL bar tracked every change; 0 console errors/warnings. `/demo/3` renders and its "Run demo 3" link opens the app.

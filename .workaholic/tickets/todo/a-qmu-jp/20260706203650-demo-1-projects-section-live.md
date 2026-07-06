---
created_at: 2026-07-06T20:36:50+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 2h
commit_hash: d7ad9f81
category: Changed
depends_on: []
---

# Demo 1 step 2 — bring the Projects section to life (filterable list → detail → milestones drill)

## Overview

Building on step 1 (the eight-section menu declared from scratch), make the **Projects** section — the core of a contract-dev (受託開発) business — a **real** part of the demo while the other seven stay stubs. Projects becomes a **filterable list** with a **rich detail view** (client, contract type, status, period, budget, lead) and a **child drill to Milestones** (each project's delivery phases). This is the next layer of plggmatic on real data: `collection` + `query` + detail `field`s + `child` drill, all still pure declaration — no hand-written `Model`/`Msg`/`update`/router.

## Decisions

1. **Depth-first on Projects.** One section made real (list + query + detail + child), not all eight shallowly — Projects is the contract-dev core and best shows the drill-down. The other seven sections keep their step-1 placeholder rows.
2. **Child = Milestones.** A project's delivery phases (受託案件のマイルストーン: e.g. 要件定義 / 設計 / 実装 / 検収), each with a due and a status — the natural child for contract work (phases tie to acceptance/billing). Uses `sync((path) => milestonesFor(path[0]))`, the workbench `notesOf` pattern.
3. **Rich detail fields on a project row.** `makeRow(id, label, [field("Client", …), field("Contract", …), field("Status", …), field("Period", …), field("Budget", …), field("Lead", …)])` — the detail column shows them.
4. **No create/update/delete actions yet.** The action layer (Add project, etc.) is a later step; this step is list/detail/query/child so it stays reviewable.
5. **Quality gate:** `packages/site` `npm run check` + `packages/plggmatic-example` `npm test` + browser (Projects filters, drills to detail and milestones, URL reflects each level). See `## Quality Gate`.

## Policies

- `workaholic:planning` / `terminology` — consistent domain words: Project, Client, Milestone, Status; no synonym drift from step 1's menu labels.
- `workaholic:design` / `self-explanatory-ui` — the detail fields and milestone list must read on their own; a viewer understands a project's shape without a legend.
- `workaholic:design` / `modeless-design` — each level (list, filtered list, selected project, selected milestone) is a deep-linkable URL; back/forward walk them; the query filters in place.
- `workaholic:planning` / `accessibility-first` — the drill renders real landmarks + `aria-current` + a labelled breadcrumb from the declaration (already the framework's behaviour); keep it.
- `workaholic:implementation` / `coding-standards` — pure data through `declare`; `sync((path) => …)` for the child source is a pure function of the drill path; Option/Result, no `as`/`any`/`ts-ignore`; Prettier printWidth 50; follow `plgg-coding-style`.
- `project_sacrificial_architecture` — the section grows by editing the declaration + data, never a hand-written program; the durable core is the domain data + the framework.

## Key Files

- `packages/plggmatic-example/src/demo1/bizMenuDemo.ts` — **edit**: give the `projects` collection a `query`, a `child: "milestones"`, and a richer `toRow` (detail `field`s); add real project data; add a `milestones` collection (`sync((path) => milestonesFor(path[0]))`) with milestone data + its own detail fields. The `menu` and the other seven stub collections are unchanged. Pattern reference: `src/declaration.ts` (`notesOf`, `child`, `query`, `field`) and `src/data.ts` (typed domain data).
- `packages/plggmatic-example/src/demo1/bizMenuDemo.spec.ts` — **edit/extend**: assert the Projects drill via the derived codec/scene — `openMenu("projects")` then `select` a project reflects to `?c=projects&p=<id>`; a query narrows the list; the child milestones load for the selected project; a deep link `?c=projects&p=<id>` reproduces the project detail.
- `packages/site/demo/1.md` — **edit**: a short line in "What's so plggmatic" noting Projects is now a real, filterable list → detail → milestones drill (the other sections still placeholder), and that it grew by editing the declaration, not a rewrite. Keep the Run Demo / What's so plggmatic structure; the `menu([...])` fence + its `examples/bizMenu.ts` twin stay.
- `packages/plggmatic-example/demo1.html`, `src/demo1-main.ts`, `bundle.config.ts`, `src/stamp.ts` — no change (same bundle/entry).

## Implementation steps

1. In `bizMenuDemo.ts`: define `Project` and `Milestone` types + data; make `projects` a filterable collection with detail fields and `child: "milestones"`; add the `milestones` collection with a path-keyed `sync` source. Keep the other seven stubs.
2. Extend the spec for the Projects drill (query narrows, select reflects to `?c=projects&p=…`, milestones load, deep link round-trips).
3. Touch up `packages/site/demo/1.md` (one line on Projects being live).
4. Build `packages/plggmatic-example`, rebuild `packages/site`, re-nest `dist/example`, refresh the 5182 preview, verify in a browser.

No plggmatic change expected (the chrome fix already landed); no plggpress / `scripts/build.sh` / `site.config.ts` change.

## Quality Gate

Approval in `/drive` requires **all** of:

1. `packages/plggmatic-example$ npm test` green — tsc + plgg-test (new/updated specs pass).
2. `packages/site$ npm run check` green — examples tsc + plggpress build incl. the dead-link checker.
3. Browser on the 5182 preview, after rebuilding example + site and re-nesting:
   - opening **Projects** shows the real project list; the **filter** narrows it and reflects to `?c=projects&q=…`;
   - selecting a project shows its **detail fields** (client, contract, status, period, budget, lead) and reflects to `?c=projects&p=<id>`;
   - the project **drills to its Milestones** (child column), each with its fields; selecting one reflects to `?c=projects&p=<id>/<milestone>`;
   - a **deep link** (`?c=projects&p=<id>`) reproduces the project slice; back/forward walk the levels;
   - the active pill/breadcrumb are legible (post-chrome-fix); dark-mode legible; no new console errors beyond the known `favicon.ico` 404;
   - the other seven sections still open to their step-1 placeholder rows.

## Out of scope / Notes

- Create/update/delete actions for Projects (and any section) — a later step.
- Making the other six sections real (Clients, Timesheets, Invoices, Members, Reports, Dashboard) — later steps, one at a time.
- Demos 2 (color scheme) and 3 (scheduler query) untouched.

## Final Report

(To be filled by /drive.)

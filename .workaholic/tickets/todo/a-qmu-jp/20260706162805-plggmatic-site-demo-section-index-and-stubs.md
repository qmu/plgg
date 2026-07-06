---
created_at: 2026-07-06T16:28:05+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 1h
commit_hash: bfe7518a
category: Added
depends_on: []
---

# Add a `/demo` section to the plggmatic site: an index catalog page plus three numbered demo stubs

## Overview

The plggmatic documentation site (`packages/site`, @plggmatic/site, plggpress-built) presents its examples today as two un-numbered artifacts: the Field Notes workbench (running app nested at `/example/`, documented at `/workbench`) and the forms showcase (`/example/forms.html`, documented at `/forms`). This ticket **restarts the examples presentation**: it adds a new **`/demo` section** whose index markdown page catalogs **plggmatic demos 1, 2, 3** — three **net-new** demos that will be authored in follow-up tickets. The index page and the section scaffolding come first; the demo content comes later.

Because plggpress's build-time dead-link checker fails the build on any root-absolute internal link to a route no page emits, the index cannot link to `/demo/1..3` unless those routes exist — so this ticket also ships **three minimal stub pages** (`demo/1.md`, `demo/2.md`, `demo/3.md`) that honestly state the demo is not yet built. The existing `/workbench` and `/forms` entries **stay where they are** and get cross-linked from the catalog.

## Decisions (recorded from the Quality-Gate interrogation)

1. **Demos 1–3 are all net-new.** None of them is a re-slotting of the Field Notes workbench or the forms showcase; those remain the "existing examples" and the numbered demos are new work arriving in follow-up tickets. The stubs carry placeholder titles ("Demo 1" …) until each follow-up defines its subject.
2. **Stub pages ship in this ticket.** `demo/1.md`, `demo/2.md`, `demo/3.md` are created now so the index's links are live and the dead-link gate stays green. Per objective-documentation, each stub states plainly that the demo is a placeholder pending a follow-up ticket — no aspirational prose describing behavior that does not exist.
3. **Existing sidebar entries stay, cross-linked.** "Example: the workbench" (Guide, `/workbench`) and "Forms & actions" (Components, `/forms`) keep their current slots; the `/demo` index cross-links to both as the existing examples (multiple reachability paths, modeless).
4. **Quality gate = `npm run check` + browser verification** (see `## Quality Gate`).

## Policies

- `workaholic:planning` / `terminology` — one word per concept: the site's own index page says plggmatic "holds to one word per concept." The new section introduces **Demo** as the term for the numbered catalog entries; do not let it blur into the existing **example** (the tutorial/workbench framing) — the index prose should draw that line explicitly (demos = the numbered catalog; the workbench and forms showcase remain "examples" until any future ticket says otherwise).
- `workaholic:design` / `self-explanatory-ui` — the `/demo` index is the catalog's front door: a reader landing there must understand without a manual that it lists the plggmatic demos, what state each is in (stub vs live), and how to reach each one.
- `workaholic:design` / `modeless-design` — every demo stays reachable through multiple paths (sidebar group, catalog links, cross-links from/to workbench & forms) with no mode to traverse.
- `workaholic:planning` / `accessibility-first` — the catalog is also the machine-navigable index into the demos for AI agents; plain markdown links, meaningful link text, no reliance on color or layout alone.
- `workaholic:implementation` / `objective-documentation` — stubs and index describe only what exists; the build's dead-link gate is the mechanical half of that contract.
- `workaholic:implementation` / `directory-structure` — use the directory form: `demo/index.md` → `/demo/`, `demo/1.md` → `/demo/1/` etc., so follow-up tickets add children under `demo/` without restructuring (mirrors the `components/` precedent).
- `workaholic:implementation` / `coding-standards` — `site.config.ts` edit stays pure `SiteConfigInput` data through the `defineSite` boundary caster; no `as`/`any`/`ts-ignore`; Prettier printWidth 50, never hand-packed.

## Key Files

- `packages/site/demo/index.md` — **new**: the `/demo` catalog page (H1, purpose prose, links to `/demo/1`, `/demo/2`, `/demo/3`, cross-links to `/workbench` and `/forms`).
- `packages/site/demo/1.md`, `demo/2.md`, `demo/3.md` — **new**: minimal honest stubs ("Demo N — placeholder; this demo arrives in a follow-up ticket", link back to `/demo`).
- `packages/site/site.config.ts` — **edit**: add a `{ text: "Demos", items: [...] }` sidebar group using the local `leaf()` helper — `leaf("Overview", "/demo")` plus `leaf("Demo 1", "/demo/1")` … `leaf("Demo 3", "/demo/3")`. printWidth 50 wrapping like the neighboring groups.
- `packages/site/workbench.md`, `packages/site/forms.md` — **optional small edit**: one cross-link line each pointing readers to the `/demo` catalog (safe once the route exists).
- `packages/site/index.md` — authoring convention reference (H1 + root-absolute internal links); optionally add a one-line pointer to `/demo` from the home page.
- `packages/plggpress/src/CheckLinks/usecase/checkLinks.ts` — read-only constraint: internal root-absolute links must resolve to discovered routes; extension-less non-routes (like `/example/`) are flagged — do **not** author `[…](/example/)` links.
- `packages/plgg-server/src/Ssg/usecase/writeStatic.ts` — read-only: route mapping (`demo/index.md` → `/demo/`, `demo/1.md` → `/demo/1/`).
- `packages/site/package.json` — `npm run check` = examples tsc + plggpress build (the gate to run).

## Implementation steps

1. Create `packages/site/demo/index.md`: H1 "Demos", prose explaining the catalog (numbered plggmatic demos, their stub/live state), a list linking Demo 1/2/3, and a short "existing examples" paragraph cross-linking `/workbench` and `/forms`.
2. Create the three stubs `demo/1.md`, `demo/2.md`, `demo/3.md` with honest placeholder content and a link back to `/demo`.
3. Wire the sidebar: add the "Demos" group to `packages/site/site.config.ts` after "Guide" (or after "Components" — pick the slot that reads best in the rendered sidebar and say why in the commit).
4. Add the cross-link lines to `workbench.md` / `forms.md` (and optionally `index.md`).
5. Run `npm run check` in `packages/site`; then rebuild and refresh the 5182 preview (serve `packages/site/dist`) and verify in a browser.

Pure content + config data change: no plggpress code, no `scripts/build.sh` change (no new app bundle is nested), no `plggmatic-example` change.

## Quality Gate

Approval in `/drive` requires **all** of:

1. `packages/site$ npm run check` green — examples tsc **and** `plggpress build` including the dead-link checker (proves `/demo`, `/demo/1..3` routes exist and every authored link resolves).
2. Browser verification on the local preview (rebuild dist, serve on 5182 as currently wired to `plggmatic-guide.qmu.dev`):
   - `/demo/` renders the catalog with the H1, the three numbered demo links, and the cross-links to `/workbench` and `/forms`;
   - the sidebar shows the "Demos" group on every page, with correct active-item highlighting when on `/demo/*`;
   - each of `/demo/1/`, `/demo/2/`, `/demo/3/` renders its stub and links back to `/demo`;
   - dark-mode toggle still renders the new pages legibly;
   - no new console errors (the pre-existing `favicon.ico` 404 is known and out of scope).
3. Edge cases: links authored root-relative (`/demo/1`, not hardcoded base) so DOCS_BASE/GitHub-Pages base-prefixing keeps working through plggpress's href resolver; no root-absolute link to `/example/` anywhere in the new pages.

## Out of scope / Notes

- The actual demo 1 / demo 2 / demo 3 content (what each demonstrates, any new running app bundles, `scripts/build.sh` nesting or `stamp.ts` entries) — three follow-up tickets, one per demo, each replacing its stub.
- Renaming or moving `/workbench`, `/forms`, or the `/example/` app mount — explicitly kept as-is by decision 3.
- `packages/site/README.md` currently describes the examples-twin and `/example/` nesting; it only needs touching if the follow-ups change the framing — not this ticket.
- The `/demo` index carries no ```ts code fences, so no `examples/` twin is needed; if a stub gains a fence later, its twin must land with it.

## Final Report

(To be filled by /drive.)

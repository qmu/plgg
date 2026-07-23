---
created_at: 2026-07-08T13:31:14+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 1h
commit_hash: f3da65e1
category: Changed
depends_on:
mission:
---

# Verify and commit the Demo 1 section-navigation + search flow

## Overview

Resumption checkpoint. A long interactive design pass reworked Demo 1
(`packages/plggmatic-example`, the `/example/demo1.html` page) into a
text-link sidebar with a per-section navigation flow. The code is written
and **currently live** (built into `packages/site/dist/example` and served
on `plggmatic-guide.qmu.dev/example/demo1.html`, live bundle hash
`demo1.js?v=7ebba0f9`), but it is **uncommitted** and the last change
batch has **not been re-verified** (tsc/tests/browser) or committed.

The task for `/drive`: verify the working tree is green and correct, then
commit it. Do NOT re-implement — the code is done; confirm and commit.

Baseline commit is `f5805102` ("Restyle Demo 1 navigation into a text-link
sidebar"). Everything since is in the working tree (6 modified files).

## Policies

- `workaholic:implementation` / `policies/coding-standards.md` — the repo
  bans `as` / `any` / `@ts-ignore`; Prettier printWidth is 50. Any fixes
  must stay within these.
- `workaholic:implementation` / `policies/machine-checkable-gaps.md` —
  treat `scripts/tsc-plgg.sh` + `scripts/test-plgg.sh` (>90% coverage gate)
  as the correctness gate before committing.
- `workaholic:operation` / `policies/ci-cd.md` — commit only through
  `scripts/commit.sh` (the off-policy raw-`git commit` gate blocks
  prefixed/over-long subjects); amend the trailer to
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` after.

## Key Files (all currently MODIFIED / uncommitted)

- `packages/plggmatic-example/src/demo1/bizMenuDemo.ts` — the demo app.
  Generalized the Clients flow to a per-section flow for **clients AND
  projects**: a "<Section> Menu" sub-menu column (Add / Search) inserted
  after the main menu via `multiColumnWith`'s `afterMenu`; list hidden
  until search/selection; Add form column; a **Search Condition** form
  (Keyword + Status + Search submit) → on submit a **Results** column
  filtered by keyword+status. Search Condition column hides once a record
  is selected (`p=<id>`). Column stack is a pure function of URL params
  (`c`, `add`, `search`, `submitted`, `kw`, `st`, `p`). Result rows carry a
  secondary detail line (clients: Status·Contact; projects: Status·Client)
  and distinct wrapper classes `bo-search-condition` / `bo-results`.
- `packages/plggmatic-example/src/demo1-main.ts` — all Demo 1 CSS lives in
  the `pageCss` template. Monochrome inverse palette, text-link sidebar
  (`.pm-menu-body li a`), selected = inverse fill hugging text, hover =
  inverse, flat form (`.pm-form` transparent/no border/no padding),
  outlined `.pm-btn-primary` (inverse on hover), fixed-width columns:
  menu 190 / add-form 380 / `bo-search-condition` 260 / `bo-results` 340,
  `.bo-hidelist` hides the section list until search, result-row detail
  classes `.bo-result-name` / `.bo-result-meta`.
- `packages/plggmatic/src/Render/usecase/multiColumn.ts` — (committed in
  `f5805102`) `afterMenu` slot + `HeaderLink.active` + `listActions`.
- `packages/plggmatic/src/Schedule/usecase/scene.ts` — top-level section
  list level now carries a `back` = menu-only URL, so every section's
  second column shows a close ✕ (fixes "Dashboard has no close").
- `packages/plggmatic/src/Render/usecase/multiColumn.spec.ts`,
  `packages/plggmatic-example/src/demo1/bizMenuDemo.spec.ts`,
  `packages/plggmatic/src/Schedule/usecase/schedule.spec.ts` — spec updates
  for the above.

## Steps (verify → commit; no new implementation)

1. Rebuild the framework then re-run the gates from repo root:
   - `cd packages/plggmatic && npm run build` (the example imports plggmatic
     from its built `dist`, so this must precede a clean example typecheck),
     then back to root.
   - `bash scripts/tsc-plgg.sh` — must be clean, and confirm no
     `as`/`any`/`ts-ignore` were introduced.
   - `bash scripts/test-plgg.sh` — all pass, coverage >90% (grep the output
     for failures/coverage; the tail can hide the pass/fail line).
   - NOTE: gates passed after the first Codex batch (#1/#3/#4) but were
     **not re-run** after the second batch (#2 hide-condition-on-select,
     #3 url-state, #6 wider/detailed results). This is the main gap to close.
2. Browser-verify on the served page (local `http://127.0.0.1:5182/example/demo1.html`
   is nginx serving `site/dist/example`; public is the same behind Cloudflare
   Access). Force light via `localStorage.setItem('vp-appearance','light')`
   then check:
   - bare `?c=clients` and `?c=projects` → only **Menu + <Section> Menu**
     (list hidden), other sections (dashboard, …) show their list + a close ✕.
   - Search X → **Search Condition** form (Keyword + Status + outlined
     Search) → submit → **Results** column (wider than Condition; rows show
     name + secondary meta line).
   - Selecting a result → **Search Condition disappears**; visible stack
     `Menu | <Section> Menu | Results | Detail`.
   - Deep link `?c=projects&search=1&submitted=1&kw=cobalt&st=Any&p=cobalt`
     reconstructs `Menu | Project Menu | Results | Detail` with
     "Cobalt mobile app" selected.
3. If any check fails, fix minimally (clean-typed, Prettier 50) and re-run
   step 1.
4. Commit via `scripts/commit.sh` (do not archive here; `/drive` archives).
   Suggested subject (≤50, no prefix): "Add Demo 1 per-section search flow".
   Then amend the trailer to Claude Opus 4.8.

## Considerations / gotchas

- **Hot-dev watcher**: `node <scratchpad>/hotdev.mjs` (currently RUNNING) is
  the local hot-reload — it watches `plggmatic-example/src` + `plggmatic/src`,
  rebuilds, copies `dist` into `site/dist/example`, and injects a poll into
  the served HTML so the browser auto-refreshes. It is NOT part of the repo;
  it lives in the session scratchpad. A fresh session must re-create/re-run
  it (or just build+copy by hand) — see the build+copy chain in step 1 plus
  `command cp -rf packages/plggmatic-example/dist/. packages/site/dist/example/`.
- The public host is behind **Cloudflare Access** — unauthenticated `curl`
  returns an auth challenge, not the page; verify via local `:5182` instead.
- `plgg-bundle` writes a content-hashed `?v=` into the HTML on `stamp`; a
  no-op touch keeps the same hash (expected).
- Do NOT touch `packages/site` beyond the nested `dist/example` copy; the
  canonical publish is `scripts/build.sh`.
- The design is deliberately monochrome/text-link; keep it if editing CSS.

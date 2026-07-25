---
created_at: 2026-07-23T00:40:50+09:00
author: a@qmu.jp
type: housekeeping
layer: [UX]
effort: 2h
commit_hash:
category: Changed
depends_on: [20260723004000-adopt-plggmatic-column-layout.md, 20260723004040-voice-realtime-assistant.md]
mission: plggpress-column-layout-and-voice-ai-editing
---

# Guide: plggpress column layout and the voice-editing dev workflow

## Overview

Document the new plggpress in the plgg guide so a developer opening the
guide reaches it: what the column-oriented horizontal layout is, and
how the voice-editing dev loop works (with `OPENAI_API_KEY`), including
the live URL and the local `plggpress dev` command.

## Key files

- `packages/guide/` — the plgg guide site (see the guide build in
  check-all notes; guide dead-link check is `cd packages/guide && npm
  run build`).
- `packages/plggpress/README.md` — keep the package README in sync
  with the new capabilities.

## Approach

- Add a guide page (or extend the existing plggpress page) covering:
  the column-oriented horizontal layout (what it is, the qmu B&W
  aesthetic, "depth does not consume the viewport"), the `build` vs
  `dev` commands, and the voice-editing workflow — set
  `OPENAI_API_KEY`, run `plggpress dev`, talk to the assistant, edits
  land on disk and hot-reload.
- Include the live URL if one is exposed via the qmu-dev tunnel, and
  the exact local dev command.
- Cross-link from the guide's plgg-family index so the page is
  reachable.

## Quality Gate

- **Acceptance:** the guide builds with no dead links (`cd
  packages/guide && npm run build` clean) and contains a plggpress
  page documenting the column layout and the voice-editing dev
  workflow with the local `plggpress dev` command; the package README
  matches.
- `./scripts/check-all.sh` green.

## Policies

- `workaholic:design` / objective-documentation — the page describes
  observable behaviour (columns, hot reload, the dev command), not
  aspiration.

## Final Report

Development completed as planned.

- New guide page `packages/guide/packages/plggpress/authoring.md`
  — "Authoring: columns, and editing by voice": what the
  column-oriented horizontal strip is and the property that
  follows from it ("depth does not consume the viewport"), the
  wide/narrow shapes, the `plggpress dev` loop with its flag
  table, and the voice-editing workflow as six numbered steps
  from "is a key configured" through to the in-place update.
- Reachable: added to the plggpress sidebar section in
  `packages/guide/site.config.ts` and cross-linked from
  `packages/guide/packages/plggpress.md`, whose mode table said
  `dev` was `plgg-bundle dev` / "a toolchain concern, not a
  plggpress command" — stale since the dev server moved into
  plggpress, and now corrected.
- `packages/plggpress/README.md` kept in sync: an "Editing by
  voice (dev only)" section with the runnable command and the
  four properties that matter (the standing key stays
  server-side, the session is grounded in the open document,
  the one write path is the existing bridge, the page updates
  in place so the session survives), plus the corrected
  paragraph about who owns the dev loop.

The guide builds clean — `cd packages/guide && npm run build` →
`built 40 page(s) to dist`, with the build-time dead-link
checker passing.

`./scripts/check-all.sh` caught a real consequence of ticket
004041 that nothing else would have: `gate-guide-deps` failed
with "plggpress depends on 'plgg-kit' but the guide container
never provisions it". Fixed by adding `plgg-kit` to the guide
workload's install loop and compose volumes (build.sh already
built it, in the right order). Full gate then exited 0.

### Discovered Insights

- **Insight**: writing the page against the BUILT output, not
  against the mission's prose, caught an aspirational claim.
  **Context**: the mission's Experience says narrow viewports
  become "a scroll-snap strip"; the built CSS has no
  `scroll-snap` at all — below the large breakpoint the strip
  collapses to ordinary page flow with a sticky bar and an
  off-canvas drawer. The page now says that. Documentation
  describing observable behaviour means reading the artifact.
- **Insight**: `gate-guide-deps` is the gate that catches a new
  `file:` dependency on plggpress.
  **Context**: adding one to `packages/plggpress/package.json`
  silently breaks the guide dev container until
  `workloads/guide/dev-entrypoint.sh` and
  `workloads/guide/compose.yaml` are updated together. Package
  tests and typecheck all pass without it — only the full
  `check-all.sh` sees it.

---
created_at: 2026-07-23T00:40:50+09:00
author: a@qmu.jp
type: housekeeping
layer: [UX]
effort: 2h
commit_hash:
category: Added
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

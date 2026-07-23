---
created_at: 2026-07-13T15:06:47+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 0.1h
commit_hash: e0e5fb85
category: Changed
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# PoC 4: the assistant speaks the OPEN DOCUMENT's language

## Overview

Developer directive (2026-07-13, before live judging): the assistant
should answer in the language the open document is written in — English
for this corpus (the plgg guide copy) — rather than mirroring whatever
language the writer speaks (the PoC 3 behavior it inherited). The writer
may well address it in Japanese; the co-editing session still reads and
writes an English document, so the conversation and the edits stay in the
document's own register.

## Key Files

- `packages/plgg-poc4-edit/src/agent.ts` - `instructionsOf`: replace the
  "Speak in the language the writer speaks." line
- `packages/plgg-poc4-edit/src/agent.spec.ts` - pin the new instruction

## Implementation Steps

1. In `instructionsOf`, instruct: speak and edit in the language of the
   open document (this corpus is English), even when the writer uses
   another language.
2. Pin the new phrasing in `agent.spec.ts` (toContain), keep the suite
   green, rebuild the host bundle so the running container (which serves
   the mounted dist no-store) picks it up on refresh — no restart needed;
   the instruction applies from the next session start.

## Quality Gate

- `scripts/test-plgg-poc4-edit.sh` green with the new spec pin.
- `npm run build` rewrites dist/main.js on the mounted tree; a page
  reload serves the new bundle (no container action).

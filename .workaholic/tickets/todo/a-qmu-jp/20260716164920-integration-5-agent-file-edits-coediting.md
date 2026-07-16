---
created_at: 2026-07-16T16:49:20+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Infrastructure]
effort: 4h
commit_hash:
depends_on: 20260716164919-integration-4-writer-voice-assistant.md
category: Added
mission: plggpress-technical-confidence-poc-portal
---

# Integration 5/8: writer agent file edits with the live co-editing preview

## Overview

Fifth ticket of the post-PoC integration chain (see the mission's
`integration-plan.md`). Integrate the PoC 4b-proven granular editing path
(it superseded PoC 4's whole-file reload): `applyEdits` + span locator +
diff builder (`plgg-poc4b-coedit/src/edit.ts`, pure, 100% covered),
`resolveEditPath` guard, the `edit_doc {find,replace}` tool over the surviving
Realtime session, and the winning MICRO-ANIMATION live preview (plgg-view
WAAPI + keyed reconciliation). Disk writes go through the production atomic
write (`plgg-cms/src/editing/exportFs.ts`) — reuse, don't re-port. Rebuild the
search index after an edit so the next `search_docs` sees the new text.

## DESIGN WORK (developer involvement expected)

PoC 4b deliberately dropped plggpress theming in its preview surface.
Production must re-marry the in-place patch animation with real
plggpress-rendered chrome — the open "PoC 4 × 4b synthesis" that the dismissed
poc4c attempted (its research assets and typed-refusal mapper survive in the
archived ticket `20260714214628`; an unmappable edit RELEASES the reload and
degrades to PoC 4's proven behavior).

## Quality Gate

- Speaking or typing an edit lands a granular find/replace on disk through the
  atomic write, the edited span animates in place on the preview with NO
  full-page reload, and the same Realtime session keeps talking.
- Path guard: relative, no traversal, .md-only — spec-pinned.
- check-all green; the pure edit core stays at 100% coverage.

## Policies

- `workaholic:design` / `policies/security.md` — the edit path guard is the
  boundary; every write is spec-pinned against traversal.
- `workaholic:implementation` / `policies/anti-corruption-structure.md` — one
  atomic-write seam (`exportFs`), one edit-op vocabulary; no parallel write
  path.
- `workaholic:implementation` / `policies/test.md` — the pure diff/span core
  keeps its 100%-coverage bar from the PoC.
- `workaholic:implementation` / `policies/coding-standards.md` — no
  `as`/`any`/`ts-ignore`; Prettier printWidth 50.

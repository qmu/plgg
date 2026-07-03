---
created_at: 2026-07-03T16:50:18+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 0.1h
commit_hash:
category: Changed
depends_on:
---

# Rename the guide sidebar section "Library" to "Vocabulary"

## Overview

Developer request (2026-07-03): in the guide's five-section sidebar (introduced this branch by ticket 20260703140142), rename the third section group from **"Library"** to **"Vocabulary"**. A pure IA data change: one `text:` value in `packages/guide/site.config.ts` (line 143) plus the adjacent comment naming the section (line 36). No prose page references the "Library" label (verified by grep), so no content edits ride along.

## Policies

- `workaholic:design` / `policies/self-explanatory-ui.md` — the section label is navigation vocabulary; "Vocabulary" names what the packages give the reader (the family's composable vocabulary) rather than the generic "Library".

## Key Files

- `packages/guide/site.config.ts` — `text: "Library"` (line 143) and the section comment (line 36)

## Related History

- [20260703140142-guide-sidebar-five-sections.md](.workaholic/tickets/archive/work-20260703-050355/20260703140142-guide-sidebar-five-sections.md) — created the five role-based sections this renames one of

## Implementation Steps

1. Change `text: "Library"` → `text: "Vocabulary"` in `site.config.ts`; update the line-36 comment to match.
2. Guide build + dead-link gate; restart the dev preview if the sidebar doesn't reflect it (site.config.ts never hot-reloads).
3. Verify on the preview.

## Considerations

- site.config.ts changes need a container restart on the dev preview (`--force-recreate --renew-anon-volumes` when the dependency graph changed — a plain restart suffices for config values).
- The five-section IA shipped nowhere yet (PR #53 unmerged), so this is a pre-ship refinement of unshipped work, like the 目次 removal.

## Quality Gate

**Acceptance criteria** (developer-confirmed 2026-07-03): (1) the dev preview sidebar shows **Guide / Core / Vocabulary / plggmatic / plggpress** with all leaves intact; (2) guide build + dead-link gate green; (3) grep shows no remaining "Library" group label in the guide. **Gate:** standard /drive commit + archive chain.

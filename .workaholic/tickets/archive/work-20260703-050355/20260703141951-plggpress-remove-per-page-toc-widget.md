---
created_at: 2026-07-03T14:19:51+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 0.5h
commit_hash: 9d8a79b
category: Removed
depends_on:
---

# Remove the in-article 目次 widget from every plggpress page

## Overview

Developer instruction at the `/drive` invocation (2026-07-03): "don't put index widget on each plggpress page". The in-article collapsible 目次 (ticket 20260703052719, this branch, unshipped) is auto-prepended by `pressRouter`'s `withToc` to every page with ≥2 section headings. Remove the widget: the auto-injection, the `theme/toc.ts` component and its spec, and the `.vp-toc` CSS block. This is a revert of an unshipped feature on the same branch, so no consumer ever saw it in production.

Scope decision (recommended default recorded while the developer was away — the AskUserQuestion timed out): **full removal**, not opt-in wiring — no dead exports left behind; git history preserves the port if it's ever wanted back. What **stays**: plgg-md's typed heading extraction and the renderer's heading anchor ids (they power the queued post-ship heading-anchor follow-up), and plgg-view's `details`/`summary` element vocabulary (generic Html builders).

## Policies

- `workaholic:implementation` / `policies/coding-standards.md` — no dead code: removing the injection without removing the now-unreferenced component would leave an unreachable theme module
- `workaholic:design` / `policies/self-explanatory-ui.md` — the structure-exposure duty shifts to the heading anchors follow-up (depth markers), already queued post-ship

## Key Files

- `packages/plggpress/src/router/pressRouter.ts` — remove `withToc` and the `toc`/`tocHeadings` imports; render `doc.body` directly in `pageView`
- `packages/plggpress/src/theme/toc.ts`, `theme/toc.spec.ts` — delete
- `packages/plggpress/src/theme/baseCss.ts` — remove the `.vp-toc` CSS block (incl. the `interpolate-size` open/close animation tied to it)
- `packages/plggpress/src/theme/baseCss.spec.ts` — remove the toc style assertions

## Related History

- [20260703052719-plggpress-in-article-toc-mokuji.md](.workaholic/tickets/archive/work-20260703-050355/20260703052719-plggpress-in-article-toc-mokuji.md) — the ticket that added the widget (same branch); this ticket reverts its plggpress surface while keeping the plgg-md/plgg-view groundwork
- [20260703141120-resume-ship-cicd-and-qmu-reconciliation.md](.workaholic/tickets/todo/a-qmu-jp/20260703141120-resume-ship-cicd-and-qmu-reconciliation.md) — the report+ship this must precede; its post-ship heading-anchor follow-up depends on the plgg-md slugger, which stays

## Implementation Steps

1. Remove `withToc` from `pressRouter.ts`; `pageView` passes `doc.body` straight to `page(...)`. Drop now-unused imports (`toc`, `tocHeadings`, and `div`/`slot` if unreferenced after).
2. Delete `theme/toc.ts` and `theme/toc.spec.ts`.
3. Remove the `.vp-toc` block from `baseCss.ts` and its assertions from `baseCss.spec.ts`.
4. Gates: `tsc-plgg.sh`, `test-plgg.sh` (coverage must stay >90%), fresh `check-all.sh` (guide consumes plggpress), guide build + dead-link gate.
5. Verify on the dev preview that pages render without the 目次 and the prose column is intact.

## Considerations

- The dev preview container may need a restart to pick up plggpress source changes (site.config.ts never hot-reloads; theme edits do — this touches theme + router, so restart if stale).
- plggmatic dist freeze does not apply (no wrapped-library surface change; plggpress consumes plggmatic, not vice versa).

## Quality Gate

**Acceptance criteria:** no page served by plggpress renders the 目次 widget; no `vp-toc` string remains in `packages/`; all gates green (tsc, tests with >90% coverage, fresh check-all, guide build). **Gate:** commit + archive per /drive; the developer reviews on the preview before the subsequent /report + /ship.

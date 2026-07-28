---
created_at: 2026-07-28T09:07:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 1h
commit_hash:
category: Changed
depends_on: [20260728090600-borderless-strip-centred-lists.md]
mission: make-the-column-strip-a-real-navigation-surface
---

# Strip 8/11 — all chrome in the rightmost rail, grouped at the TOP right, as on qmu.co.jp

## Overview

The chrome is scattered: the appearance toggle and GitHub
sit at the BOTTOM of the right rail (a flex spacer pushes
them down), the social links are duplicated into the
sections column for the below-lg breakpoint, and the
assistant's dialog is a fixed panel pinned to the bottom
right, outside the layout entirely. Gather all of it into
the rightmost vertical bar, grouped at the **top right**.
Nothing chrome-like remains in the sections column.

## Key files

- `packages/plggpress/src/theme/navBar.ts` — `chromeRail`
  (the `vp-rail-spacer` that pushes controls down),
  `socialLinks`, `mobileBar`.
- `packages/plggpress/src/theme/page.ts` — `sectionsColumn`
  ends with `socialLinks(config, "vp-sidebar-social")`; that
  is the chrome to remove from the sections column.
- `packages/plggpress/src/theme/baseCss.ts` — `.vp-rail`,
  `.vp-rail-spacer`, `.vp-rail-controls`, `.vp-rail-social`,
  `.vp-sidebar-social`.
- `packages/plggpress/src/framework/DevServer/browser/voiceClient.ts`
  — `#plggpress-voice`, `position:fixed;right:16px;bottom:16px`.
  The assistant dialog moves into the rail's group.

## Approach

- Invert the rail: drop the spacer, put the control group at
  the top with the rail's own top padding, matching the
  sections column's first-line baseline so the top edge of
  the screen reads as one horizontal band.
- The assistant panel becomes a rail-anchored dialog rather
  than a viewport-fixed box: it opens from the rail's
  control group at the top right. It must remain OUTSIDE
  the swapped/placed region — both `swapContent` and the
  ticket-2 runtime replace column content, and the panel
  cannot be a casualty of either. Keep its id-based
  exclusion intact and verify it survives a column open.
- Below lg the rail is hidden and the mobile bar keeps the
  toggle; the social links that were duplicated into the
  sections drawer move to the mobile bar so the sections
  column carries navigation only, at every breakpoint.

## Quality Gate

- **Acceptance:** in a real browser at lg+ on port 4130 the
  GitHub link, the light/dark control and the assistant's
  affordance all have a `getBoundingClientRect` inside the
  rightmost rail and in its top quarter; the sections column
  contains no social link and no theme control at any
  breakpoint. The assistant panel is still present and
  functional AFTER opening a column through the ticket-2
  runtime. Screenshots recorded at lg+ and below lg.
- `page.spec.ts` / `navBar.spec.ts` assert the sections
  column renders navigation only.
- `scripts/tsc-plgg.sh` clean; `scripts/test-plgg.sh` green;
  >90% coverage across all four metrics; no `as`/`any`/
  `ts-ignore`; Prettier `printWidth: 50`.

## Policies

- `workaholic:design` — one place for controls, one place
  for content; a reader should never have to learn where a
  given affordance was put.

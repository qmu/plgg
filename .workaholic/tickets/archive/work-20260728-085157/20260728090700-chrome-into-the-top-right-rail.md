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

## Final Report

Development completed as planned, plus one fix the live
run forced (below). Every control the site offers is now in
one corner:

- `theme/navBar.ts` — `chromeRail` drops the flex spacer
  that pushed its controls to the bottom; the group sits at
  the top. `mobileBar` gains the social links, so below lg
  the chrome group is the mobile bar rather than the
  sections drawer.
- `theme/page.ts` — `sectionsColumn` no longer ends with
  social links. The sections column is navigation only, at
  every breakpoint.
- `theme/baseCss.ts` — the rail's padding moves to the top
  to match the nav columns' own, so the whole top edge
  reads as one band; `.vp-sidebar-social` is gone.
- `framework/DevServer/browser/voiceClient.ts` — the
  assistant's dialog is anchored top-right, immediately
  left of the rail, instead of floating in the
  bottom-right corner.

**The fix the browser forced.** The rail is the strip's
last COLUMN, not a fixed bar, so with a short strip it sat
wherever the content column ended (x=1344 of 1600) and the
dialog covered it; with a deep strip it scrolled out of
view entirely. `margin-left:auto` plus
`position:sticky; right:0` makes it the rightmost bar in
both cases — pushed to the far right while the strip is
narrower than the viewport, stuck to the right edge once it
overflows. Without that, "the chrome lives in the right
rail" was only true at one strip width.

Measured in a real browser at 1600x900 on port 4130:

```
short strip (1600px)          deep strip (3936px, scrolled to the end)
  rail   1552..1600             rail   1552..1600     (unmoved)
  toggle top 32                 toggle top 32
  GitHub top 78                 GitHub top 78
  dialog top 12, right 1540 — immediately left of the rail
sections column: 0 social links, 0 theme controls
below lg: rail display:none, mobile bar carries the social
          links, drawer carries none
opening a column: one rail, still the strip's last child,
          controls unmoved
```

Screenshots: `strip-t8-chrome-top-right.png`,
`strip-t8-chrome-deep-strip.png`,
`strip-t8-chrome-mobile.png`,
`strip-t8-assistant-dialog.png`.

### Discovered Insights

- **Insight**: a 320px dialog cannot be inside a 48px bar.
  **Context**: the acceptance reads "grouped at the top
  right"; the implementable reading is that the rail holds
  the two icon-sized controls and the dialog is anchored to
  the same corner, immediately left of it. Recorded so the
  interpretation is visible rather than assumed.
- **Insight**: the voice panel is dev-only and mounts only
  when a voice key is configured, so its placement could
  not be measured directly on a keyless dev server.
  **Context**: verified instead by fetching the SERVED
  `voiceClient` module (asserting it carries the new
  `right:60px;top:12px`) and mounting a box with that exact
  style to measure where it lands.

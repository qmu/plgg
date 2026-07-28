---
created_at: 2026-07-28T09:06:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 1h
commit_hash:
category: Changed
depends_on: [20260728090000-composition-url-and-server-render.md]
mission: make-the-column-strip-a-real-navigation-surface
---

# Strip 7/11 — no rules between columns; the choice lists sit as a text-width block, centred, text left-aligned

## Overview

The strip currently draws its structure: `.vp-section`
carries a left and a right border. Remove them, and make the
strip still read as deliberately composed — alignment
carried by rhythm and equal spacing, not by a drawn line.

The two choice-list columns (sections and the drilled
section) get the specific treatment the developer asked for:
their text is **left-aligned inside a block whose width is
set by the text**, and that block is **centred in its
column**, so the space to the left and right of the list is
equal while the words still line up on a common left edge.

## Key files

- `packages/plggpress/src/theme/baseCss.ts` —
  `.vp-section` (`border-left`/`border-right`), `.vp-sidebar`,
  `.vp-sidebar-link` / `.vp-sidebar-flat` / `.vp-group-title`
  (each already `width:fit-content`), and the `@media`
  blocks that must not regress.
- `packages/plggpress/src/theme/page.ts` — `sectionsColumn`
  and `drilledColumn`, the two columns this affects.
- `packages/plggpress/src/theme/sidebarTree.ts` — the tree
  inside the drilled column.

## Approach

- Drop the `.vp-section` borders. Restore the sense of
  separate columns with spacing alone: consistent column
  padding and a shared vertical rhythm, so the eye reads
  discrete tracks from the gaps.
- Centre each list block with a `width:fit-content` wrapper
  plus `margin-inline:auto` — the items already size to
  their text, so the wrapper takes the width of the widest
  entry and centring the wrapper equalises the flanks while
  every item keeps its left edge. The inverted-pill
  hover/active boxes must keep their current geometry.
- Below lg the drawer keeps its current left-aligned layout;
  centring a full-width drawer list would read as an
  accident.
- Check the mobile bar's and the drawer's borders separately
  — the mission removes the borders **between columns**, not
  every rule on the page.

## Quality Gate

- **Acceptance:** rendered in a real browser at lg+ on port
  4130: no vertical rule appears anywhere between the
  columns, and in each of the first two columns the measured
  gap from the column's left edge to the list block equals
  the gap from the block to the column's right edge (within
  1px), while every list item shares one left edge.
  Measured with `getBoundingClientRect` in the browser, and
  a screenshot recorded. The below-lg drawer is checked in
  the same run for no regression.
- `baseCss.spec.ts` asserts the border declarations are gone
  and the centring wrapper rules are present.
- `scripts/tsc-plgg.sh` clean; `scripts/test-plgg.sh` green;
  >90% coverage across all four metrics; no `as`/`any`/
  `ts-ignore`; Prettier `printWidth: 50`.

## Policies

- `workaholic:design` — the interface expresses its
  structure through composition, not decoration; a drawn
  line is the thing you reach for when the spacing is wrong.

## Final Report

Development completed as planned, and with no markup change
at all — the whole ticket is three rules in
`plggpress/src/theme/baseCss.ts`:

- `.vp-section` loses its `border-left` and `border-right`.
  No rule is drawn between any two columns now.
- `.vp-sidebar-nav` becomes `width:fit-content` with
  `margin-inline:auto`. Both choice-list columns share that
  root, so one rule centres both; their entries were
  already `width:fit-content`, so they keep a common left
  edge inside the centred block.
- Below lg the centring is reset: the drawer is full-bleed,
  where a centred list would read as an accident rather
  than as composition.

`baseCss.spec.ts` isolates the `.vp-section` rule block and
asserts it contains no `border` at all, so putting one back
fails the build rather than only looking wrong.

Measured in a real browser at 1600x900 on port 4130 with
`getBoundingClientRect`:

```
sections column   left gap 83px   right gap 83px   item left edges: {83}
drilled column    left gap 40px   right gap 40px   item left edges: {296}
computed border-left/right on every pm-col: 0px/0px
```

One distinct left edge per column means every entry lines
up; equal flanks mean the block is centred. Screenshot:
`strip-t7-borderless-centred.png`.

### Discovered Insights

- **Insight**: "left-aligned text in a centred,
  text-width block" needs no wrapper element.
  **Context**: the nav root already contains only
  fit-content children, so making the root itself
  fit-content and auto-centring it produces exactly the
  requested geometry. Adding a wrapper would have been the
  obvious move and the wrong one.

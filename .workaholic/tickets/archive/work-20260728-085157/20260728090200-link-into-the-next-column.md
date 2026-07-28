---
created_at: 2026-07-28T09:02:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 2h
commit_hash:
category: Changed
depends_on: [20260728090100-plggmatic-navigation-runtime.md]
mission: make-the-column-strip-a-real-navigation-surface
---

# Strip 3/11 — following a link in the prose OPENS the next column, and the column you were reading stays put

## Overview

The reader is in the third column and clicks a link in its
prose. Today the whole page reloads and the strip is rebuilt
from nothing. After this ticket the target opens as the
**fourth column to its right**, and the third column stays
exactly where it was — same position in the strip, same
scroll offset inside it.

This is the mission's headline behaviour, and it is nothing
more than ticket 2's runtime bound to a click.

## Key files

- `packages/plggmatic/src/Navigate/usecase/navigate.ts` —
  ticket 2's pure decision functions; the click classifier
  belongs here.
- `packages/plggmatic/src/Navigate/usecase/navigationScript.ts`
  — ticket 2's inline runtime; gains the delegated listener.
- `packages/plggpress/src/theme/page.ts` — the content
  column carrying `data-pm-column`; a click's originating
  column is found by walking up to that marker.
- `packages/plggpress/src/theme/baseCss.ts` — `.vp-app`
  scrolls horizontally on lg+; a newly appended column must
  be scrolled INTO view without disturbing the columns
  already on screen.

## Approach

- A **pure classifier** decides whether an event is ours:
  same-origin, a plain left click (no modifier, no
  `target=_blank`, no `download`), an in-site route (not an
  external URL, not a bare `#fragment`), and originating
  inside a `data-pm-column`. Everything else is left to the
  browser — a modified click must still open a tab, and a
  fragment link must still jump inside its own column.
  Table-driven spec, one row per rejection reason.
- On a claimed click: `preventDefault`, then the ticket-2
  `open(route)` with the composition **truncated to the
  originating column** before appending. Clicking a link in
  column 2 of a five-column strip opens the target as
  column 3 and discards 4 and 5 — the composition is what
  you are reading now, not an ever-growing log.
- **Scroll preservation is a non-event, and that is the
  point**: the originating column's DOM node is never
  touched, so its `scrollTop` cannot be lost. The test is
  that we assert it, in a browser, rather than assume it.
- The new column is scrolled into view with
  `scrollIntoView({inline:"end", block:"nearest"})` on the
  strip's horizontal axis, honouring `prefers-reduced-motion`
  through plggmatic's existing reset.
- Every anchor keeps its real `href` — the runtime only
  intercepts. That is what ticket 6 then proves.

## Quality Gate

- **Acceptance:** in a real browser on port 4130: open a
  page, scroll its content column down a measured number of
  pixels, click a prose link — a new column appears to its
  right holding the target's rendered content, the
  originating column is still present with the SAME
  `scrollTop`, and the URL is the ticket-1 composition form.
  No page load occurred (a `window` sentinel set before the
  click survives it). Screenshot recorded.
- Clicking a link in a middle column truncates the columns
  to its right, verified in the same run.
- A ctrl/cmd-click, an external link and a `#fragment` link
  are NOT intercepted — asserted by the pure classifier
  spec and spot-checked live for the fragment case.
- `scripts/tsc-plgg.sh` clean; `scripts/test-plgg.sh` green;
  >90% coverage across all four metrics; no `as`/`any`/
  `ts-ignore`; Prettier `printWidth: 50`.

## Policies

- `workaholic:design` — depth does not consume the viewport:
  the strip grows rightward and scrolls under a fixed top
  bar, so what the reader had is never taken away to show
  them what they asked for.

## Final Report

Development completed as planned. Following a link in the
prose now opens its target as the next column, and the
column you were reading stays exactly where it was.

The whole change is in
`plggmatic/src/Navigate/usecase/navigationScript.ts`:

- `claims(ev, a)` — the classifier. Everything the browser
  does better is left to the browser: a modified or
  middle click, a `target=_blank`, a `download`, an
  off-origin link, an already-handled event, and a
  same-page fragment are all declined.
- `columnOf(node)` / `anchorOf(node)` — which column the
  click came from, and which link it was.
- `openFrom(at, route, span)` — the one open path.
  `open(route)` is `openFrom(last())`, so the hook the
  assistant will use and the click path are literally the
  same function.
- `truncate(at)` — the strip is what you are reading now,
  not a log of everywhere you have been: opening from a
  middle column closes what stood beyond it.

**Scroll preservation is a non-event, and that is the
design.** The originating column's DOM node is never
touched — not re-rendered, not re-parented — so its
`scrollTop` cannot be lost. The test asserts it rather
than assuming it.

Verified live in a real browser on port 4130:

```
viewport 1400x500, /concepts/  (column scrollHeight 901, client 500)
  scrolled the content column to scrollTop 320
  clicked the first prose link (/concepts/option)
  → columns 2, same first DOM node, scrollTop STILL 320
    url /concepts/?c=/concepts/option, navigations 1, sentinel alive

four columns open, clicked a link in the MIDDLE one
  before  /packages/plgg/ | /concepts/result | /concepts/ | /getting-started
  after   /packages/plgg/ | /concepts/result | /concepts/tagged-data
    url /packages/plgg/?c=/concepts/result,/concepts/tagged-data

ctrl+click on a prose link → columns unchanged, url unchanged
claims(): internal true; external, _blank, download, fragment,
          middle-click, meta-click, already-handled, non-link all false
```

Screenshots: `strip-t3-link-opens-next-column.png`,
`strip-t3-scroll-preserved.png`.

### Discovered Insights

- **Insight**: only CONTENT columns carry `columnAttr`, so
  a click in the sections or drilled nav column is not
  claimed and still performs a full navigation.
  **Context**: that is the right default — selecting a
  section is a change of subject, not a drill — but it is
  a behaviour someone will later mistake for a bug, so it
  is recorded here as deliberate.
- **Insight**: a same-page fragment is declined by
  comparing `a.pathname` AND requiring a non-empty
  `a.hash`, not by pathname alone.
  **Context**: a link back to the head document's own
  route from a column further right is a legitimate open;
  rejecting on pathname alone would have made it a full
  page load.

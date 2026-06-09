---
created_at: 2026-06-10T03:41:05+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Infrastructure]
effort:
commit_hash:
category:
depends_on:
---

# Make the example To-Do app responsive (mobile-friendly)

## Overview

The To-Do demo isn't usable on a phone. Two concrete causes:

1. **No mobile viewport meta.** `plgg-server`'s `htmlDocument` emits only
   `<meta charset="utf-8">` in `<head>`. Without
   `<meta name="viewport" content="width=device-width, initial-scale=1">`, a
   phone lays the page out at a ~980px desktop width and zooms out — everything
   is tiny. This is the dominant problem and a fix every SSR page benefits from.
2. **The filter/search toolbar doesn't reflow.** The toolbar is a single flex
   row (three filter buttons + a search input); on a narrow screen it crowds.

Fix: add the viewport meta to `htmlDocument`, and let the toolbar wrap on narrow
widths using the existing `sx.wrap` atom (no media-query/breakpoint machinery
needed — keeps the Style system simple).

## Key Files

- `packages/plgg-server/src/View/usecase/htmlDocument.ts` — the SSR document
  head; add the viewport meta after the charset meta.
- `packages/example/src/app.ts` — the To-Do view; the `todo-toolbar` flex row
  (filters + search) gets `sx.wrap` so it reflows on narrow screens. The card is
  already fluid (`wFull` + `maxW`), so width adapts already.
- `packages/plgg-view/src/Style/usecase/utilities.ts` — confirms `wrap` (flex
  `flex-wrap: wrap`) exists; no Style-system change required.

## Implementation Steps

1. In `htmlDocument.ts`, add
   `<meta name="viewport" content="width=device-width, initial-scale=1">`
   immediately after the existing `<meta charset="utf-8">` in the `<head>`
   template literal.
2. In `app.ts`, add `sx.wrap` to the `todo-toolbar` div's `style_` so the filter
   group and search input wrap to a second line when the row is too narrow.
   (Search keeps `grow`, so it fills the line it lands on.)
3. Verify the page still renders identically on desktop (the card's `maxW`
   caps width; `wFull` takes over below it) and that the toolbar wraps cleanly
   when the viewport is narrowed.

## Considerations

- **No breakpoint system needed** — fluid layout (`wFull`/`maxW` + flex `wrap`)
  covers this without adding responsive-variant complexity to `sx`. Adding
  media-query/breakpoint variants to the Style system is a separate, larger
  decision and out of scope here (`packages/plgg-view/src/Style`).
- **Viewport meta is a general SSR fix** — it belongs in `htmlDocument` (every
  page wants it), not the example; it's the foundation that makes any
  `plgg-server` page mobile-correct (`packages/plgg-server/src/View/usecase/htmlDocument.ts`).
- **No escape hatches**; Prettier printWidth 50; the document string stays
  XSS-safe (static meta tag, no interpolation).
- **Server excluded from coverage** — `htmlDocument` has unit tests in
  plgg-server; update/extend if one asserts the exact head markup.

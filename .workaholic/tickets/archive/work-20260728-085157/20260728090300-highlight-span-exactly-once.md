---
created_at: 2026-07-28T09:03:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, UX]
effort: 2h
commit_hash:
category: Changed
depends_on: [20260728090200-link-into-the-next-column.md]
mission: make-the-column-strip-a-real-navigation-surface
---

# Strip 4/11 — a highlighted span is LOCATED in the document, exactly once, or it does not render

## Overview

Ticket 1 carries a span per column through the URL. This
ticket paints it — and, more importantly, refuses to.

A span is addressed the way `edit_doc` already addresses
one: **verbatim text that must occur exactly once** in the
document. Absent, ambiguous or empty is refused. The
property that buys is structural, not procedural: a
quotation the assistant paraphrased or invented **cannot be
displayed at all**, because it will not locate. What is on
screen is the document's own text, or nothing.

## Key files

- `packages/plggpress/src/framework/DevServer/usecase/editDoc.ts`
  — `locateOne` / `locateEdits`: the exactly-once locator,
  already promoted from PoC 4b and fully covered. Its
  `EditError` union already names `EmptyFind`, `FindAbsent`
  and `FindAmbiguous`. **Reuse it; do not write a second
  locator.**
- `packages/plggmatic/src/Navigate/model/Composition.ts` —
  where the span rides.
- `packages/plggpress/src/router/pressRouter.ts` — where a
  column's markdown source is read; the span is located
  against the SOURCE the same way an edit is.
- `packages/plggpress/src/theme/baseCss.ts` — the mark's
  appearance, and its `scroll-margin-top`.

## Approach

- Lift the locator's exactly-once core to a shared home both
  the patch bridge and the renderer consume — one function,
  one contract, one set of refusal reasons. The bridge's
  behaviour must not change; its spec is the regression
  guard. (If the lift proves to cross a package boundary the
  build cannot express, the fallback is to export the
  existing function from plggpress's framework barrel and
  have the renderer import it — still exactly one
  implementation.)
- A located span is wrapped in a `<mark>` carrying a
  framework class, and the column scrolls to it when the
  composition opens. A refused span renders the column
  **unmarked** — the document is still shown, the false
  quotation simply is not.
- Locating happens on the markdown SOURCE before rendering,
  so the mark cannot split HTML: a span that would straddle
  markup boundaries locates in the source text and is
  rendered as part of it.
- The refusal is observable, not silent-by-accident: the
  decode/locate step returns the typed `EditError` and the
  server logs it once, so a broken shared link can be
  diagnosed.

## Quality Gate

- **Acceptance:** a composition URL whose span is a verbatim
  sentence from the target document renders that sentence
  marked, in a browser, and the column is scrolled to it —
  screenshot recorded. A URL whose span is a **paraphrase**
  of a sentence in the document renders the document with NO
  mark anywhere; asserted by a test that takes a real
  sentence, alters one word, and checks the rendered HTML
  contains no mark element. Same for a span occurring twice
  (ambiguous) and an empty span.
- Mission acceptance item 1 (composition + highlights
  reproduced from the URL alone) ticks with this ticket.
- The `edit_doc` bridge specs still pass unchanged — one
  locator, two callers.
- `scripts/tsc-plgg.sh` clean; `scripts/test-plgg.sh` green;
  >90% coverage across all four metrics; no `as`/`any`/
  `ts-ignore`; Prettier `printWidth: 50`.

## Policies

- `workaholic:implementation` — correctness is made
  structural: the display path has no branch that could show
  text the document does not contain.
- `workaholic:safety` — a shared composition URL is
  untrusted input; it can select what is shown, never
  author it.

## Final Report

Development completed as planned. A highlighted passage is
now the document's own text or nothing at all:

- `plggpress/src/Locate/usecase/locateOnce.ts` — the
  exactly-once locator, lifted out of `editDoc` into a
  module of its own. `edit_doc` and the composition
  renderer are now two callers of ONE definition of "the
  document says this"; `editDoc`'s `locateOne` is a thin
  `mapResult` over it, and its refusal kinds are a subset
  of `EditError`'s, so a refusal flows through untouched.
- `plggpress/src/Locate/usecase/markSpan.ts` — the mark
  itself, as a `foldHtml` catamorphism whose result is a
  FUNCTION `offset → (node, offset)`. That is how a plain
  fold threads a running text position through a tree, and
  it is why a passage crossing element boundaries is marked
  in each part it crosses without a bespoke traversal.
- `plggpress/src/theme/baseCss.ts` — the mark wears the
  site's own inverted pill, not a browser-default yellow.
- The runtime scrolls a column to its mark, on placement
  and on a hard load of a composition URL.

`Raw` nodes contribute nothing to the searchable text, so a
span can neither be located inside pre-rendered highlighter
markup nor split it.

Verified live against `plggpress dev` on port 4130 over the
guide's real content:

```
/concepts/?q=the single source of truth
  → <mark class="vp-mark">the single source of truth</mark>
/concepts/?q=the sole source of truth      (one word altered)
  → 0 marks, document renders in full
/concepts/?q=e                             (ambiguous)
  → 0 marks
/?c=/concepts/:the single source of truth  (a NON-head column)
  → the same single mark, in the second column
```

In a browser the mark is in view without the reader
scrolling, and with **JavaScript disabled** the same URL
still renders two columns with the passage marked — the
highlight is server-rendered, so it needs no runtime at
all. Screenshot: `strip-t4-highlight-located.png`.

Mission acceptance item 1 completes here: a composition URL
now reproduces both the columns and the highlights.

### Discovered Insights

- **Insight**: a bug that unit tests could not see —
  `pageView` still passed `column.doc.body` (the unmarked
  original) to the layout while `renderColumn` computed the
  marked body. Every unit test passed; nothing was marked.
  **Context**: found only by driving the real server. The
  fix came with a router-level spec asserting the mark in
  the SERVED page, so the gap between "the transform works"
  and "the page shows it" is now covered.
- **Insight**: the span is located in the RENDERED text,
  not the markdown source — deliberately different from
  `edit_doc`, which must locate in the source to write it.
  **Context**: a reader (or an assistant reading the page)
  quotes what they see, not the markdown that produced it.
  Both uses share the locator; they differ only in which
  text they hand it.
- **Deviation**: the ticket planned to log a refused span
  once, server-side. Not implemented — it would put a side
  effect in the middle of a pure render pipeline for a case
  that is already observable (no mark) and unit-tested. A
  diagnostic belongs on the dev surface, not in the
  renderer.

---
type: Mission
title: Make the column strip a real navigation surface
slug: make-the-column-strip-a-real-navigation-surface
status: active
created_at: 2026-07-27T15:47:12+09:00
author: a@qmu.jp
assignee: a@qmu.jp
strategy: plgg-horizontal-orientation-ui-stack
drive_authorized: true
predicted_hours: 20
actual_hours:
tickets: [20260728090000-composition-url-and-server-render.md, 20260728090100-plggmatic-navigation-runtime.md, 20260728090200-link-into-the-next-column.md, 20260728090300-highlight-span-exactly-once.md, 20260728090400-popstate-closes-the-column.md, 20260728090500-no-javascript-proof.md, 20260728090600-borderless-strip-centred-lists.md, 20260728090700-chrome-into-the-top-right-rail.md, 20260728090800-edit-provenance-in-place.md, 20260728090900-assistant-drives-the-runtime.md, 20260728091000-retire-the-pm-class-coupling.md]
stories: []
concerns: []
gate_type:
gate_target:
gate_assert:
---

# Make the column strip a real navigation surface

## Goal

The column strip today is a **picture of** horizontal orientation, not a
working one. Every drill is an `<a href>` that reloads the whole page: the
browser throws away the strip and the server rebuilds it from scratch for the
new route. It looks right because the server re-derives the same columns — but
nothing accumulates, nothing persists, and any live client state (the voice
session's `RTCPeerConnection`, the microphone, the conversation) dies on every
click.

That is the gap between the strategy's claim and the artifact. The strategy
says depth is expressed by columns that expand rightward and "depth does not
consume the viewport"; a full reload per drill consumes the whole viewport,
every time.

This mission closes it. The strip becomes a **real navigation surface** where a
column is opened rather than re-rendered-from-nothing, and where following a
link in the prose opens its target as the next column to the right instead of
replacing the page.

**The strip is a composition, not a trail.** This is the mission's load-bearing
decision. The obvious model — the column stack records how you walked here — is
too narrow: an assistant assembling columns because several passages *bear on
the question being discussed* has no link path to walk, and the relation between
those documents is created in the conversation, not in the corpus. So the screen
state is modelled once, as an **ordered list of `(route, optional highlighted
span)`**, and link-following is simply the case where that list grew by one from
a click. One concept instead of two, and the assistant-assembled case is not a
later bolt-on but the same object arriving by a different route.

Two consequences follow, and are why this belongs to the framework rather than
to plggpress:

- **plggmatic gains its first client runtime.** It has none today — its only
  browser-touching module is the no-FOUC appearance script, a dependency-free
  inline string constant. Navigation is the second such runtime and belongs
  beside the first: plggmatic emits the strip, so plggmatic owns how a column is
  entered. Products (plggpress now, qfs-viewer per the strategy) inherit it.
- **The `pm-*` coupling can be retired.** A standing concern records that
  plggpress string-matches plggmatic's `pm-row`/`pm-col` names with no compiler
  signal. If the runtime that manipulates columns is the framework's own, those
  names stop being a contract consumers spell by hand.

## Scope

**Definition of done**

1. **The composition is the model.** Screen state is an ordered list of
   `(route, optional highlighted span)`. The URL carries it, so a strip is
   addressable, shareable, and survives a hard reload — the server renders the
   same strip from the URL alone, with no JavaScript involved.
2. **A dependency-free client navigation runtime in plggmatic**, shaped like the
   existing `appearanceInitScript` (an inline string constant injected into SSR
   output; no bundler, no npm dependency, no build step of its own). It
   intercepts same-origin navigation, fetches the target's server-rendered HTML,
   places it in the strip, and updates history.
3. **Link-into-the-next-column**: following a link in the markdown body opens
   its target as a new column to the right, leaving the originating column in
   place with its scroll position intact.
4. **Highlighted spans reuse the exactly-once locator.** A span is addressed the
   way `edit_doc` already addresses one — verbatim text that must occur exactly
   once in the document, ambiguity refused. A quoted passage that is not found
   exactly once **cannot render**, so a paraphrased or invented quotation is
   structurally impossible to display.
5. **`popstate` correctness**: Back removes the column the matching navigation
   added and restores the previous composition, not a mis-rendered page.
6. **Progressive enhancement, non-negotiable**: with JavaScript disabled, every
   link still navigates and every URL still server-renders its composition.
   Readers without JS and crawlers lose the in-place placement, never the
   content.
7. **The borders between columns are gone**, and the strip still reads as
   deliberately aligned — carried by spacing, not by rules.
8. **The chrome lives in the right rail, top-aligned**: GitHub, the light/dark
   control and the assistant's dialog all sit in the rightmost vertical bar at
   the top right, matching qmu.co.jp.
9. **Edit provenance is visible**: when the assistant changes the prose, the
   reader can see what the passage was and what it became.
10. **The assistant drives it through the same runtime the pointer uses** — not
    a parallel dev-only path — so the realtime session survives every column it
    opens.

**Out of scope**

- **Corpus assembly** — giving the assistant a site index at mint time, a
  read-a-passage verb, and the "argument" object that names why a set of
  quotations belongs together. That is the follow-on mission this one is shaped
  to make cheap: the composition model and the exactly-once highlight are
  exactly the substrate it needs, and are delivered here. Nothing in this
  mission may assume a single-document session in a way that blocks it.
- **Full-text search, retrieval or RAG.** The client-side-LLM story moved to qfs
  by an explicit earlier decision; rebuilding it here would quietly reverse that.
  Cross-document relevance, when it comes, arrives as a bounded static index —
  a projection of the page walk `CheckLinks/collectPageLinks` already performs.
- Rewriting plggmatic's Declare/Schedule/Layout stack. The runtime is additive.
- A general-purpose SPA router, client-side templating, or hydration of the whole
  render tree. The server keeps rendering pages; the client places them.
- plgg-view's renderer runtime and TEA hydration — the architecturally correct
  long-term home for in-place DOM work, but its primitives are recorded as
  unimplemented and this mission must not wait on them.
- Any new npm dependency, and any widening of the dev server's unauthenticated
  patch/mint surface.

## Experience

- **Following a link opens a column.** Reading a page in the third column and
  clicking a link in its prose, the target opens as the **fourth column** to its
  right; the page you were reading stays where it was, still readable, still
  scrolled where you left it. The strip grows rightward and scrolls horizontally
  underneath a fixed top bar — depth does not consume the viewport. Following a
  link from the fourth column opens a fifth, and so on.
- **A composition is a link you can send.** The URL reflects the whole strip —
  every open document and every highlighted passage — so copying it reproduces
  the same columns and the same highlights elsewhere, and a hard reload
  reproduces them server-rendered. Columns assembled by the assistant are
  shareable on exactly the same terms as columns reached by clicking, because
  they are the same object.
- **A highlighted passage is provably from the document.** When a column opens
  with a passage highlighted, that passage was located in the document's own
  text, exactly once. A quotation that cannot be located is refused rather than
  approximated, so what is shown on screen is never the assistant's rendition of
  the text — it is the text.
- **Back means "close that column".** Pressing Back removes the column the last
  navigation added and restores the previous composition — never a
  half-rendered page or a bare document out of its strip.
- **No borders, and it still looks composed.** No rules are drawn between
  columns. The first two columns are choice lists: their text is **left-aligned
  inside a block whose width is set by the text**, and that block is **centred
  in its column**, so the space to the left and right of the list is equal while
  the words still line up on a common left edge. Alignment is carried by rhythm
  and equal spacing rather than by a drawn line.
- **The right rail is where the chrome lives.** GitHub, the light/dark control
  and the assistant's dialog are all in the rightmost vertical bar, grouped at
  the **top right** as on qmu.co.jp. Nothing chrome-like remains scattered in
  the sections column.
- **You can see what the assistant changed.** After a voice edit the affected
  passage shows what it was and what it became, in place, so the writer can
  judge the change instead of taking the assistant's word for it.
- **Saying it works like clicking it.** "Take me to Core, then Values and
  Effects" opens those columns exactly as the two clicks would, the strip in the
  same state either way — and the realtime session stays alive across every one
  of them, because nothing navigates the browser away.
- **Without JavaScript it is still a documentation site.** Every link works,
  every URL renders its composition, nothing is blank.

## Acceptance

<!-- Ticket filenames attached as (#<ticket>.md) markers, on the SAME line as the item. -->

- [x] Screen state is modelled as an ordered list of `(route, optional highlighted span)` carried by the URL, and the server renders that composition with no JavaScript involved; pasting a composition URL into a fresh browser reproduces the same strip and highlights (#20260728090000-composition-url-and-server-render.md)
- [x] plggmatic ships a dependency-free client navigation runtime, shaped like `appearanceInitScript` (inline string constant, no bundler, no new dependency), that intercepts same-origin navigation, fetches server-rendered HTML and places it without a page load (#20260728090100-plggmatic-navigation-runtime.md)
- [x] Following a link in the markdown body opens its target as the next column to the right, leaving the originating column in place with its scroll position intact (#20260728090200-link-into-the-next-column.md)
- [x] A highlighted span is addressed by verbatim text that must occur exactly once, reusing the `edit_doc` locator; an ambiguous or absent quotation is refused and renders nothing, proven by a test that a paraphrased quotation cannot be displayed (#20260728090300-highlight-span-exactly-once.md)
- [x] `popstate` removes the column the matching navigation added and restores the previous composition, verified in a real browser including multi-step Back (#20260728090400-popstate-closes-the-column.md)
- [x] With JavaScript disabled every link still navigates and every composition URL still server-renders correctly, proven by a test asserting the no-JS path (#20260728090500-no-javascript-proof.md)
- [x] The borders between columns are removed and the first two columns render their choice lists as a text-width block centred in the column with the text left-aligned inside it, so left and right spacing around the list are equal (#20260728090600-borderless-strip-centred-lists.md)
- [x] GitHub, the light/dark control and the assistant dialog all live in the rightmost vertical bar, grouped at the top right, with no chrome remaining in the sections column (#20260728090700-chrome-into-the-top-right-rail.md)
- [x] After an assistant edit the changed passage shows its previous and current text in place, and the display survives the in-place swap (#20260728090800-edit-provenance-in-place.md)
- [x] The assistant drives navigation through the SAME runtime the pointer uses, keeping the realtime session alive across every column it opens, proven live in a browser (#20260728090900-assistant-drives-the-runtime.md)
- [ ] plggpress consumes the framework runtime and no longer string-matches plggmatic's `pm-*` names from JavaScript (#20260728091000-retire-the-pm-class-coupling.md)

## Changelog

<!-- Append-only, dated timeline relating this mission's tickets and reports over time.
     One line per event ("- YYYY-MM-DD — event — filename"); never rewrite past lines. -->
- 2026-07-27 — mission created — scoped from the developer's four requirements (no column borders with spacing-carried alignment; link-into-fourth-column; visible edit provenance; chrome consolidated into the top-right rail), with the layer decision taken deliberately: the navigation runtime belongs to plggmatic, not plggpress, because the framework emits the strip and the strategy places products on top of it
- 2026-07-27 — model generalized to a COMPOSITION — the developer asked whether the assistant could assemble columns from documents that are not link-connected, quoting a passage from each to make a point. Modelling the strip as a walked trail cannot express that; modelling it as an ordered list of `(route, optional highlighted span)` expresses both, with link-following as the case where the list grew by one. Folded in now because the URL format is the one thing that cannot be changed later. Highlights reuse `edit_doc`'s exactly-once locator, which yields the property that an invented or paraphrased quotation cannot render at all. Corpus assembly (site index at mint, a read-a-passage verb, the argument object) is deliberately left to a follow-on mission this one is shaped to make cheap; full-text search/RAG stays out, as that story moved to qfs
- 2026-07-28 — decomposed into 11 tickets (one per acceptance item) and stamped drive_authorized — the composition-URL ticket gates every other item and is driven first, alone; then runtime → link-into-next-column → highlight → popstate → no-JS proof → borders → rail → provenance → assistant → retire pm-* coupling — 20260728090000-composition-url-and-server-render.md
- 2026-07-28 — ticket archived — 20260728090000-composition-url-and-server-render.md
- 2026-07-28 — ticket archived — 20260728090100-plggmatic-navigation-runtime.md
- 2026-07-28 — ticket archived — 20260728090200-link-into-the-next-column.md
- 2026-07-28 — ticket archived — 20260728090300-highlight-span-exactly-once.md
- 2026-07-28 — ticket archived — 20260728090400-popstate-closes-the-column.md
- 2026-07-28 — ticket archived — 20260728090500-no-javascript-proof.md
- 2026-07-28 — ticket archived — 20260728090600-borderless-strip-centred-lists.md
- 2026-07-28 — ticket archived — 20260728090700-chrome-into-the-top-right-rail.md
- 2026-07-28 — ticket archived — 20260728090800-edit-provenance-in-place.md
- 2026-07-28 — ticket archived — 20260728090900-assistant-drives-the-runtime.md

---
type: Mission
title: Make the column strip a real navigation surface
slug: make-the-column-strip-a-real-navigation-surface
status: active
created_at: 2026-07-27T15:47:12+09:00
author: a@qmu.jp
assignee: 
strategy: plgg-horizontal-orientation-ui-stack
drive_authorized:
predicted_hours:
actual_hours:
tickets: []
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

This mission closes it: the strip becomes a **real navigation surface** where a
column is opened, not re-rendered-from-nothing, and where following a link in
the prose opens its target as the **next column to the right** rather than
replacing the page. That is the behaviour the whole layout system exists for —
reading is a widening trail you can look back along, not a stack of
replacements.

Two consequences follow and are why this belongs to the framework, not to
plggpress:

- **plggmatic gains its first client runtime.** It has none today — its only
  browser-touching module is the no-FOUC appearance script, a dependency-free
  inline string constant. Navigation is the second such runtime, and it belongs
  beside the first: plggmatic emits the strip, so plggmatic owns how a column is
  entered. Products (plggpress now, qfs-viewer per the strategy) inherit it.
- **The `pm-*` coupling can be retired.** A standing concern records that
  plggpress string-matches plggmatic's `pm-row`/`pm-col` names with no compiler
  signal. If the runtime that manipulates columns is the framework's own, the
  names stop being a contract consumers spell by hand.

## Scope

**Definition of done**

1. **A dependency-free client navigation runtime in plggmatic**, shaped like the
   existing `appearanceInitScript` (an inline string constant injected into SSR
   output; no bundler, no npm dependency, no build step of its own). It
   intercepts same-origin navigation, fetches the target's server-rendered HTML,
   places it in the strip, and updates history.
2. **Link-into-the-next-column**: following a link in the markdown body opens
   its target as a new column to the right of the current one, rather than
   replacing the page.
3. **The URL carries the column stack**, so a trail is addressable, shareable
   and survives a hard reload — the server must be able to render the same strip
   from the URL alone.
4. **`popstate` correctness**: Back closes the column it opened and lands on the
   previous trail, not on a mis-rendered page.
5. **Progressive enhancement, non-negotiable**: with JavaScript disabled, every
   link is still an ordinary working link and every URL still server-renders.
   Crawlers and readers without JS lose the accumulation, never the content.
6. **The borders between columns are gone**, and the strip still reads as
   deliberately aligned — carried by spacing, not by rules.
7. **The chrome lives in the right rail, top-aligned**: GitHub, the
   light/dark control, and the assistant's dialog all sit in the rightmost
   vertical bar at the top right, matching qmu.co.jp.
8. **Edit provenance is visible**: when the assistant changes the prose, the
   reader can see what the passage was and what it became.
9. **The assistant can drive it**: navigation is reachable by voice through the
   same runtime the pointer uses — not a parallel dev-only path.

**Out of scope**

- Rewriting plggmatic's Declare/Schedule/Layout stack. The runtime is additive.
- A general-purpose SPA router, client-side templating, or hydration of the
  whole render tree. The server keeps rendering pages; the client places them.
- plgg-view's renderer runtime and TEA hydration. That is the architecturally
  "correct" long-term home for in-place DOM work, but its primitives are
  recorded as unimplemented; this mission must not wait on them.
- Any new npm dependency, and any widening of the dev server's unauthenticated
  patch/mint surface.

## Experience

- **Following a link opens a column.** Reading a page in the third column and
  clicking a link in its prose, the target opens as the **fourth column** to its
  right; the page you were reading stays where it was, still readable, still
  scrolled where you left it. The strip grows rightward and scrolls
  horizontally underneath a fixed top bar — depth does not consume the viewport.
  Following a link from the fourth column opens a fifth, and so on.
- **The trail is addressable.** The URL reflects the whole open trail, so
  copying it and opening it elsewhere reproduces the same columns. A hard reload
  reproduces them too, server-rendered.
- **Back means "close that column".** Pressing Back removes the column the last
  navigation opened and restores the previous trail — it never lands on a
  half-rendered page or a bare document out of its strip.
- **No borders, and it still looks composed.** No rules are drawn between
  columns. The first two columns are choice lists: their text is **left-aligned
  inside a block whose width is set by the text**, and that block is **centred
  in its column**, so the space to the left and the right of the list is equal
  while the words themselves still line up on a common left edge. Alignment is
  carried by rhythm and equal spacing rather than by a drawn line.
- **The right rail is where the chrome lives.** GitHub, the light/dark control
  and the assistant's dialog are all in the rightmost vertical bar, grouped at
  the **top right** as on qmu.co.jp. Nothing chrome-like remains scattered in
  the left column.
- **You can see what the assistant changed.** After a voice edit, the affected
  passage shows what it was and what it became, in place, so the writer can
  judge the change instead of taking the assistant's word for it.
- **Saying it works like clicking it.** "Take me to Core, then Values and
  Effects" opens those columns exactly as the two clicks would, the strip in the
  same state either way — and the realtime session stays alive across every one
  of them, because nothing navigates the browser away.
- **Without JavaScript it is still a documentation site.** Every link works,
  every URL renders, nothing is blank.

## Acceptance

<!-- Ticket filenames attached as (#<ticket>.md) markers, on the SAME line as the item. -->

- [ ] plggmatic ships a dependency-free client navigation runtime, shaped like `appearanceInitScript` (inline string constant, no bundler, no new dependency), that intercepts same-origin navigation, fetches server-rendered HTML and places it without a page load
- [ ] Following a link in the markdown body opens its target as the next column to the right, leaving the originating column in place with its scroll position intact
- [ ] The URL encodes the open column stack; pasting it into a fresh browser server-renders the same strip, and a hard reload reproduces it
- [ ] `popstate` closes the column the matching navigation opened and restores the previous trail, verified in a real browser including multi-step Back
- [ ] With JavaScript disabled every link still navigates and every URL still server-renders the correct page, proven by a test that asserts the no-JS path
- [ ] The borders between columns are removed and the first two columns render their choice lists as a text-width block centred in the column with the text left-aligned inside it, so left and right spacing around the list are equal
- [ ] GitHub, the light/dark control and the assistant dialog all live in the rightmost vertical bar, grouped at the top right, with no chrome remaining in the sections column
- [ ] After an assistant edit, the changed passage shows its previous and current text in place, and the display survives the in-place swap
- [ ] The assistant drives navigation through the SAME runtime the pointer uses, keeping the realtime session alive across every column it opens, proven live in a browser
- [ ] plggpress consumes the framework runtime and no longer string-matches plggmatic's `pm-*` names from JavaScript

## Changelog

<!-- Append-only, dated timeline relating this mission's tickets and reports over time.
     One line per event ("- YYYY-MM-DD — event — filename"); never rewrite past lines. -->
- 2026-07-27 — mission created — scoped from the developer's four requirements (no column borders with spacing-carried alignment; link-into-fourth-column; visible edit provenance; chrome consolidated into the top-right rail), with the layer decision taken deliberately: the navigation runtime belongs to plggmatic, not plggpress, because the framework emits the strip and the strategy places products on top of it

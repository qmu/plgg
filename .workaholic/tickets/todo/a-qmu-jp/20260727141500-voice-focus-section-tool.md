---
created_at: 2026-07-27T14:15:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort: 2h
commit_hash:
category: Added
depends_on: []
mission:
---

# Voice `focus_section` — move the page by naming a heading

## Overview

Today the assistant has exactly one tool, `edit_doc`, so a
writer who says "take me to the error model section" gets a
spoken answer and a page that does not move. Give it a second,
**read-only** verb: `focus_section`, whose argument is the
section's **heading text in the writer's own words** — not an
id, not a selector, not an index.

The whole actuation is client-side. Nothing is written to disk,
no server route is added, and the existing unauthenticated
`POST /__plggpress_patch` / `POST /__plggpress_voice/session`
surface is not widened by a single byte. That is what makes
this the cheapest capability in the backlog: it sits entirely
outside the security boundary the rest of the voice surface has
to defend.

**It reuses the anchor scheme that already exists.** plggpress
already emits heading ids — `CheckLinks/model/CheckLinks.ts:13`
describes the deduped heading `slugs` as "the same ids the body
carries", and the dead-link checker validates `#fragment`s
against them. `theme/baseCss.ts:67` already carries the rule
that "anchor jumps in the lg app shell scroll the content", and
:387 that "anchor jumps clear the sticky bars". So the feature
is a **lookup**, not a new navigation mechanism: heading text →
the id the page already carries → the anchor jump the CSS
already handles correctly.

## Key files

- `packages/plggpress/src/framework/DevServer/usecase/voiceInstructions.ts`
  — where `EDIT_DOC_TOOL` is declared beside the session
  instructions (line ~79) and where the second tool schema goes.
  The instructions already quote the open document verbatim, so
  the model can already see every heading; the schema is the
  only thing missing.
- `packages/plggpress/src/framework/DevServer/browser/voiceProtocol.ts`
  — the pure decoder. Line ~119 string-matches
  `name === "edit_doc"`; this is where a second variant enters
  the closed `VoiceEvent` union. **Import-free**: a browser has
  no resolver for a bare `plgg` specifier, so absence lives
  inside the union (the existing `Ignored` discipline), never as
  `Option`, `null` or `undefined`.
- `packages/plggpress/src/framework/DevServer/browser/voiceClient.ts`
  — the thin actuation shell (coverage-excluded). Only bytes and
  pixels here; every decision belongs in `voiceProtocol.ts`.
- `packages/plggpress/src/framework/DevServer/browser/reloadArbiter.ts`
  — the in-place body swap. Focus/scroll position must survive
  it or be re-applied.
- `packages/plggpress/src/CheckLinks/usecase/collectPageLinks.ts`
  — the existing heading-slug collection. **Read it before
  writing a new slugifier**; the lookup must agree with the ids
  the body actually carries, or a fragment that the dead-link
  checker calls valid will not resolve at runtime.
- `packages/plgg-poc4c-livesite/src/patchClient.ts:247` — prior
  art: `scrollIntoView({block:"center", behavior:"smooth"})`
  after a patch. Proven and kept; reuse the shape.

## Approach

1. **Declare the tool server-side.** Add `FOCUS_SECTION_TOOL`
   beside `EDIT_DOC_TOOL` in `voiceInstructions.ts`: one
   required string argument, the heading text, described in
   domain vocabulary ("the section heading as it appears in the
   document"). The mint already hands `tools` to the browser, so
   nothing about the mint route changes.
2. **Extend the closed union.** Add a `FocusRequested` variant
   to `VoiceEvent` in `voiceProtocol.ts` and dispatch it through
   the existing exhaustive `never`-based match, so every
   unhandled site becomes a compile error. No `switch`.
3. **Resolve heading text purely.** A pure
   `focusTargetOf(headings, spoken)` in `voiceProtocol.ts`
   returns a closed result: matched id, **ambiguous** (the text
   matches more than one heading), or **not found**. Match
   case-insensitively and ignore surrounding punctuation — a
   speaker says "structures and errors" for `## Structures &
   Errors`. Failure is a value in the union, never a thrown
   error and never an empty-string sentinel.
4. **Actuate in the shell.** `voiceClient.ts` resolves the id to
   the element and scrolls it into view, reusing the poc4c
   shape. **Move focus, do not merely scroll** — assistive
   technology must follow (set `tabindex="-1"` on the target
   heading and `.focus()` it), and the resulting URL fragment
   should reflect the focused section so the state is
   addressable.
5. **Answer the model.** Fold a typed tool answer back over the
   `oai-events` data channel exactly as `edit_doc` does, so
   "not found" and "ambiguous" come back to the assistant and it
   can ask the writer which section they meant — spoken in the
   writer's vocabulary, never a technical condition.
6. **Survive the swap.** After a reload-arbiter body swap,
   re-apply the focused section (the arbiter replaces the body's
   children, so a raw element reference goes stale).
7. **Document it.** Update the guide's authoring page and the
   plggpress README, which currently describe a one-tool
   assistant.

## Considerations

- **In-document only, deliberately.** This tool does not
  navigate to another page or open a different nav column.
  The server fixes the session's document at mint time — that
  is the containment argument the whole voice surface rests on
  (the model never names a path) — so cross-document navigation
  would either strand the assistant's grounding or force a
  re-mint. Out of scope here; worth its own ticket if wanted.
- **No new `pm-*` coupling.** Scrolling within the open
  document needs the heading ids, not plggmatic's class names.
  Do not reach for `pm-row`/`pm-col` from JS: a standing concern
  already records that plggpress string-matches the `pm-*`
  contract with no compiler signal, and this ticket must not
  make that worse.
- **Not voice-only.** Anchor jumps already work from the visual
  UI and the keyboard; this adds a voice path to an existing
  affordance rather than an operation reachable only by speech.
- The browser client rides `node:module`'s experimental
  `stripTypeScriptTypes`; the served-output assertions catch a
  break loudly.

## Quality Gate

- **Decided:** vocabulary is **heading text** (the developer's
  ruling), not ids, indices or selectors — matching the
  accessibility policy's "name tools with domain vocabulary".
- **Decided:** the lookup reuses the **existing heading-slug
  scheme** rather than inventing anchors. A spec must assert
  that the ids `focus_section` resolves against are the same
  ones `collectPageLinks` collects, so the two cannot drift.
- **Decided:** scope is **in-document focus only** — no
  cross-document navigation, no nav-column opening (see
  Considerations).
- **Decided:** verification is **live in a real browser**, as
  every ticket in the voice chain was. Unit tests alone do not
  close this: the actuation lives in the coverage-excluded
  shell, so a green suite proves nothing about whether the page
  moved.
- `focusTargetOf` and the extended decoder carry `.spec.ts`
  coverage keeping plggpress above the >90% four-metric gate.
  **The exclude list is not widened** — only `voiceClient.ts`
  stays excluded, exactly as today.
- Mutation check, in the house style: force `focusTargetOf` to
  always return "not found" and the new specs must go red;
  restore and they go green.
- Ambiguity and absence are both proven: a heading text matching
  two headings returns the ambiguous variant (it does **not**
  silently pick the first), and an unknown heading returns not
  found — each surfaced to the writer as an actionable sentence,
  not a technical condition.
- Live probe with Playwright against a real `plggpress dev`:
  importing the served `voiceProtocol` module, decoding a real
  `focus_section` frame, and observing the page scroll **and**
  `document.activeElement` land on the target heading. A second
  probe asserts the focused section survives a reload-arbiter
  body swap.
- Keyless run is byte-identical to today: with no
  `OPENAI_API_KEY`, no panel, no module route, no tool.
- `./scripts/check-all.sh` exits 0 and
  `cd packages/guide && npm run build` is clean (dead-link
  checker included — this ticket touches the guide).
- No `as`/`any`/`ts-ignore`, no new dependency, no new server
  route, Prettier printWidth 50.

## Policies

- `workaholic:design` / `defense-in-depth` — the boundary stays
  closed: no new route, no widening of the patch/mint surface,
  and the tool is absent entirely without a key.
- `workaholic:design` / `admin-isolation` — dev-only; must never
  reach a production `build`.
- `workaholic:design` / `interaction-design-standard` — reuse
  the column strip's existing focus/transition behaviour; a
  voice-only variant of the same interaction is a deviation to
  be justified and recorded.
- `workaholic:design` / `self-explanatory-ui` — "no section by
  that heading" is an actionable sentence in the writer's words.
- `workaholic:design` / `modeless-design` — hold the focused
  section in the URL; never trap focus.
- `workaholic:planning` / `accessibility-first` — name tools
  with domain vocabulary; programmatic scroll must move focus so
  assistive technology follows; WCAG 2.2 AA is the floor.
- `workaholic:implementation` / `type-driven-design` — the
  spoken heading is not a bare `string`; the failure to match is
  a value in the union.
- `workaholic:implementation` / `functional-programming` — pure
  resolution in `voiceProtocol.ts`, thin effectful shell in
  `voiceClient.ts`.
- `workaholic:implementation` / `coding-standards`,
  `directory-structure` — exhaustive `never` match over the
  union, no `switch`; no new directory, no new package.

## Final Report

<!-- Filled in by /drive. -->

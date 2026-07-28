---
created_at: 2026-07-28T09:01:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Infrastructure]
effort: 3h
commit_hash:
category: Added
depends_on: [20260728090000-composition-url-and-server-render.md]
mission: make-the-column-strip-a-real-navigation-surface
---

# Strip 2/11 — plggmatic's FIRST client navigation runtime, shaped like `appearanceInitScript`

## Overview

plggmatic emits the strip, so plggmatic owns how a column is
entered. It has exactly one browser-touching module today —
`appearanceInitScript`, a dependency-free inline string
constant injected into SSR output. Navigation is the second,
and it is built to the same shape: **no bundler, no npm
dependency, no build step of its own.**

This ticket delivers the runtime and its injection seam; the
behaviours it enables (link-into-next-column, `popstate`)
are the tickets after it.

## Key files

- `packages/plggmatic/src/Style/usecase/appearanceScript.ts`
  — the precedent to mirror exactly: an inline `SoftStr`
  constant, an idempotent `injectX` that no-ops on a page
  missing the anchor tag, and the D16 trick of sourcing
  every shared literal through `JSON.stringify` of an
  exported constant so the string is never re-typed.
- `packages/plggmatic/src/Navigate/usecase/compositionUrl.ts`
  — ticket 1's codec. Its separator constants are what this
  script's own encode/decode is composed from.
- `packages/plggpress/src/theme/appearanceScripts.ts` —
  plggpress's injection seam, and the model for how a
  product wires a framework script in.
- `packages/plggmatic/src/Meta/model/identity.ts` —
  `cssPrefix`; the strip markers belong to this namespace.

## Approach

- **Framework-owned markers, not hand-typed class names.**
  Export from plggmatic: `stripAttr` (`data-pm-strip`,
  stamped on the `row` that holds the columns) and
  `columnAttr` (`data-pm-column`, stamped on each placeable
  content column, carrying its route). `row`/`column` gain
  an optional marker so a consumer never spells `pm-col` in
  JavaScript — this is what makes ticket 11 possible.
- **`navigationInitScript`**: a `SoftStr` constant, no
  `</script` inner sequence, injected before `</body>` by
  `injectNavigationScript` (idempotent; a page without the
  tag passes through unchanged). It:
  - reads the current composition from `location`,
  - exposes ONE entry point on `window` under an exported
    constant name (`navHookName`) — `open(route, span)` —
    so the assistant and the pointer drive the SAME code
    path (ticket 10) rather than a parallel one,
  - fetches a target route's server-rendered HTML, extracts
    its `data-pm-column` element with `DOMParser`, and
    places it in `data-pm-strip`,
  - pushes the ticket-1 composition URL with `pushState`.
  Scripts parsed by `DOMParser` never execute, so a placed
  column can never re-run this runtime — the same property
  `swapContent` in the voice client already relies on.
- **Failure is a full navigation, never a broken page**: a
  non-OK fetch, a missing marker, or a throw falls back to
  `location.assign(url)`. The reader always gets the page.
- **Testability**: every decision (which URL to push, which
  element to take, whether an event is ours to handle) lives
  in exported PURE functions in
  `Navigate/usecase/navigate.ts`, unit-tested offline. The
  string constant is asserted for its invariants (no
  `</script`, contains the marker/hook constants by
  construction). The DOM-touching edge is the only
  coverage-excluded part, by the same rule
  `browser/voiceClient.ts` records — and it is verified in a
  real browser instead.

## Quality Gate

- **Acceptance:** a page served by `plggpress dev` on port
  4130 contains the injected script exactly once; in a real
  browser `window[navHookName].open("/core/effects")`
  appends a fourth column and rewrites the URL to the
  ticket-1 composition form **without a page load**
  (`performance.getEntriesByType("navigation")` count
  unchanged, and a value stashed on `window` before the call
  survives it). Verified live with a screenshot.
- The injection is idempotent and no-ops on a page with no
  `</body>`, asserted in a spec.
- `scripts/tsc-plgg.sh` clean; `scripts/test-plgg.sh` green;
  >90% coverage across all four metrics on plggmatic; no
  `as`/`any`/`ts-ignore`; Prettier `printWidth: 50`; zero
  new dependencies and no bundler step.

## Policies

- `workaholic:implementation` — the runtime is additive:
  Declare/Schedule/Layout are untouched, and the server keeps
  rendering pages. The client only places them.
- `workaholic:design` — one entry point for pointer and
  assistant alike, so there is no dev-only navigation path
  that can behave differently from the one readers use.

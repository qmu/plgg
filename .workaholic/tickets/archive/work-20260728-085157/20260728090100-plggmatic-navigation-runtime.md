---
created_at: 2026-07-28T09:01:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Infrastructure]
effort: 4h
commit_hash:
category: Changed
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

## Final Report

Development completed as planned, with one deliberate
deviation recorded below. plggmatic has its second browser
runtime, built to the shape of its first:

- `plggmatic/src/Navigate/model/marker.ts` — `stripAttr`,
  `columnAttr`, `navHookName`, plus the `strip` /
  `documentColumn` combinators that stamp them. A product
  now marks its strip by calling a framework combinator,
  never by typing `pm-…` into its own code.
- `plggmatic/src/Layout/usecase/combinators.ts` —
  `rowWith` / `columnWith`, an attributes slot the marker
  combinators compose. `row`/`column` keep their recorded
  `(parts, children)` shape and now delegate, so the
  class/flow decision still lives in exactly one place.
- `plggmatic/src/Navigate/usecase/navigationScript.ts` —
  `navigationInitScript` and `injectNavigationScript`. The
  script fetches a route's own page, takes its
  `data-pm-column` element, places it after the last column
  already in the strip (so the chrome rail keeps its
  position), and pushes the ticket-1 composition URL.
- `plggpress/src/router/pressRouter.ts` — injects the
  runtime beside the appearance scripts; `RenderedColumn`
  now carries each column's route to the layout.

**The deviation, and why.** The ticket planned "every
decision in exported pure functions, unit-tested offline".
An inline runtime cannot import TypeScript, so such a
module would have been a SECOND implementation of the same
rules — precisely the drift this mission exists to remove.
Instead the script PUBLISHES its decisions on the hook
(`urlFor`, `entries`, `entryOf`) and they are driven and
asserted in a real browser, while the TS side asserts the
invariants that can only be checked statically: that every
literal is composed from an exported constant, that there
is no inner `</script`, and that injection lands once
before `</body>` and no-ops without it.

Verified live in a real browser against `plggpress dev` on
port 4130:

```
before  columns 1   url /concepts/            navigations 1
open("/getting-started")
after   columns 2   url /concepts/?c=/getting-started
        routes  /concepts/ | /getting-started
        navigations 1        (no page load)
        window sentinel set before the call: still there
        strip's last child: still vp-rail
```

The client's own escaping was checked against the server's
by construction, not by eye: `urlFor(entryOf('/getting-started',
'first, second: third ~ fourth'))` produced
`/concepts/?c=/getting-started:first~c%20second~f%20third%20~t%20fourth`,
which the server answered 200 with the right two columns —
the same `~c`/`~f`/`~t` alphabet the TypeScript codec emits.

The failure path was exercised too: `open` on a route the
server cannot serve performed a real navigation to the
composition URL (the `window` sentinel is gone afterwards),
where the server dropped the unreadable column and rendered
a working page with the hook re-installed. The enhancement
failed; the content did not. Screenshot:
`strip-t2-runtime-opened-column.png`.

### Discovered Insights

- **Insight**: the runtime places a fetched column after
  the LAST element already carrying `columnAttr`, rather
  than appending to the strip.
  **Context**: appending would put new columns after the
  chrome rail. Anchoring on the framework's own marker
  keeps the rule correct for any product whose strip holds
  things the framework does not know about.
- **Insight**: `rowWith`/`columnWith` is not a widening of
  the "options are style atoms" rule.
  **Context**: that rule is about consumer options; these
  take framework-owned ATTRIBUTES and exist so a consumer
  never has to spell a class name. Keeping `row`/`column`
  as the consumer-facing pair preserves the record.

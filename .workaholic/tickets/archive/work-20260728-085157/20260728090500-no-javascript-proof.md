---
created_at: 2026-07-28T09:05:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 1h
commit_hash:
category: Changed
depends_on: [20260728090400-popstate-closes-the-column.md]
mission: make-the-column-strip-a-real-navigation-surface
---

# Strip 6/11 — the no-JavaScript path is PROVEN, not asserted in prose

## Overview

Progressive enhancement is non-negotiable for this mission,
and a claim about it in a comment is worth nothing. With
JavaScript disabled every link must still navigate and every
composition URL must still server-render its strip. This
ticket makes that a standing test, so a later change to the
runtime cannot quietly break the readers and crawlers who
never run it.

## Key files

- `packages/plggmatic/src/Navigate/usecase/navigationScript.ts`
  — the runtime whose absence is being simulated.
- `packages/plggpress/src/theme/page.ts` — every navigable
  element must be a real `<a href>`, never a click-handler
  affordance.
- `packages/plggpress/src/router/pressRouter.ts` — the
  server rendering that must stand alone.

## Approach

- A **rendered-markup test**: for a representative page and
  a multi-column composition URL, assert that every
  navigable affordance in the SSR output is an anchor with a
  resolved, non-empty, non-`javascript:` `href`, and that no
  navigation depends on an element the runtime creates.
  This is the test that fails if someone later replaces a
  link with a button.
- A **browser test with scripting disabled**: a Playwright
  context created with JavaScript off, loading (a) a plain
  page, (b) a three-column composition URL, and (c)
  following a link by clicking it — asserting the columns
  render, the highlight renders, and the click performs a
  real page navigation to the link's own `href`.
- Record the no-JS run with a screenshot; it is the
  mission's evidence that the site is a documentation site
  before it is an application.

## Quality Gate

- **Acceptance:** with JavaScript disabled in a real browser
  on port 4130: a composition URL renders all its columns
  and its highlight; clicking a prose link navigates to the
  target page (a full load, correct URL, correct content);
  nothing on the page is blank or inert. Screenshot
  recorded. The markup test fails if any navigable
  affordance loses its `href`.
- `scripts/tsc-plgg.sh` clean; `scripts/test-plgg.sh` green;
  >90% coverage across all four metrics; no `as`/`any`/
  `ts-ignore`; Prettier `printWidth: 50`.

## Policies

- `workaholic:design` — information stays reachable without
  force: no reader, crawler or agent is required to execute
  our JavaScript to read our documents.
- `workaholic:operation` — the enhancement layer is allowed
  to fail; the content layer is not.

## Final Report

Development completed as planned. The no-JavaScript path is
now a standing test rather than a claim in a comment.

`plggpress/src/router/noJavaScript.spec.ts` asserts, over
the bytes `pressRouter` actually serves:

- every `href` on the page is followable — non-empty, not a
  `javascript:` URL — and there is at least one;
- nothing navigates through an `onclick`/`onmousedown`;
- a composition URL's columns AND its highlight are in the
  server's own bytes;
- **deleting every `<script>` element from the response
  changes none of it** — the enhancement is additive, never
  load-bearing. That is the assertion that fails the day
  someone turns a link into a click handler.

Verified live in a real browser with **JavaScript disabled**
(`browser.newContext({ javaScriptEnabled: false })`) on
port 4130:

```
/concepts/                              1 column, 14 prose links
/concepts/?c=/getting-started,/packages/plgg/&q=…
                                        3 columns
  headings  Core concepts | Getting started | plgg (core)
  mark      "the single source of truth"
clicking the first prose link (href /concepts/option)
  → a REAL navigation to /concepts/option
  → 1 column, heading "Option, not null", prose present
```

Nothing was blank or inert at any point. Screenshot:
`strip-t6-no-javascript.png`.

### Discovered Insights

- **Insight**: the script-stripping assertion is the useful
  one, and it is cheap.
  **Context**: "does it work without JS" is hard to test in
  a unit harness with no browser and no new dependencies.
  Asserting that the response is unchanged when its scripts
  are deleted answers the same question from the markup
  alone, and it runs on every commit rather than in a
  browser session someone has to remember to open.
- **Deviation**: the JS-disabled BROWSER run is recorded
  evidence, not an automated test. Automating it would need
  Playwright as a dependency of the repo's test harness,
  which the mission's zero-new-dependency rule forbids.

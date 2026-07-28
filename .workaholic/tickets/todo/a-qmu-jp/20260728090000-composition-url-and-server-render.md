---
created_at: 2026-07-28T09:00:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, UX]
effort: 3h
commit_hash:
category: Added
depends_on: []
mission: make-the-column-strip-a-real-navigation-surface
---

# Strip 1/11 — the composition IS the model: an ordered list of `(route, span)` carried by the URL, server-rendered

## Overview

This ticket fixes the one decision that cannot be changed
later. Screen state stops being "the route the browser is
on" and becomes a **composition**: an ordered list of
`(route, optional highlighted span)`. The URL carries it,
the server renders it, and **no JavaScript is involved** —
paste a composition URL into a fresh browser with scripting
off and the same columns come back.

Everything else in the mission (the client runtime, the
link-into-next-column placement, `popstate`, the assistant)
is a way of *producing* this URL. So it lands first and
alone, and it is verifiable with the browser's JS disabled.

## Key files

- `packages/plggmatic/src/Layout/usecase/combinators.ts` —
  `row`/`column`, the `pm-row`/`pm-col` skeleton the strip
  is built from. The composition model is a sibling of this
  layer, not of plggpress.
- `packages/plggpress/src/theme/page.ts` — today's strip:
  `sectionsColumn`, `drilledColumn`, ONE `contentColumn`,
  `chromeRail`. `contentColumn` becomes N content columns.
- `packages/plggpress/src/router/pressRouter.ts` —
  `candidateFiles` / `readSource` / `pageHandler`. The
  handler reads ONE source file today; it must read the
  composition's files.
- `packages/plgg-http/src/Http/model/HttpRequest.ts` —
  `query: Dict<string, SoftStr>` (a dict, so a repeated
  param collapses: the composition must ride in ONE value).
- `packages/plgg-server/src/Ssg/usecase/renderRoutes.ts` —
  renders with `query: {}`, so the static build keeps
  emitting plain single-document pages. Unchanged.

## Approach

**The model (plggmatic, new `Navigate/` category).**

```
Column = Readonly<{ route: SoftStr; span: Option<SoftStr> }>
Composition = ReadonlyArray<Column>   // non-empty by construction
```

`Navigate/model/Composition.ts` holds the type plus a
`columnOf` constructor; `Navigate/usecase/compositionUrl.ts`
holds the **codec** — the single authority for the wire
format, shared by the server renderer now and by the client
runtime in ticket 2.

**The wire format.** The request PATH is always column 0 —
so every composition URL is *also* an ordinary, crawlable,
self-sufficient page — and two query parameters decorate it:

- `c` — the columns to the right, joined with `,`, each
  `route` optionally `:span`;
- `q` — column 0's own span.

Each field is percent-encoded with `encodeURIComponent`
(which escapes both `,` and `:`, so the separators are
unambiguous) and then has `%2F` restored to `/`, because a
slash is legal in a query value and an unreadable URL is a
worse shareable object. Round-trip is a property test:
`decode(encode(x)) === x` over routes and spans containing
`,`, `:`, `/`, `#`, `&`, spaces and non-ASCII.

A malformed `c` **degrades, never fails**: an entry that is
not a site route is dropped, and a wholly unparseable `c`
renders column 0 alone. A composition URL can be typed by
hand or truncated by a chat client; it must still be a page.

**The rendering (plggpress).** `pageHandler` decodes the
composition from `c.req.path` + `c.req.query`, reads every
column's source through the EXISTING `candidateFiles` /
`readSource` pair (one handler still serves every route —
no new route is registered, and the dev server's
unauthenticated surface is untouched), renders each through
the same markdown pipeline, and `page()` emits one
`contentColumn` per entry in order. A column whose source
cannot be read is **dropped from the strip**, not a 500 —
column 0 excepted, which keeps today's 404/500 behaviour.

Spans are parsed and carried through the model in this
ticket but rendered as nothing; ticket 4 gives them their
locator and their mark.

`<title>`, `<link rel=canonical>` and the active-path chrome
keep following **column 0**, so the composition never
changes what the page claims to be.

## Quality Gate

- **Acceptance:** `GET /core/values/?c=/core/effects,/guide/intro`
  server-renders three content columns in that order, in a
  browser with **JavaScript disabled**, and
  `GET /core/values/` alone renders exactly one — verified
  live against `plggpress dev` on port 4130 with a
  screenshot for the record. `decode(encode(comp))` round-
  trips for every composition in the property test.
  A `c` naming an unknown route renders the columns that do
  resolve, with no error page.
- The strip's column count is asserted in `page.spec.ts`
  from the composition, not from a fixed number.
- Mission acceptance item 1 mentions highlights; it ticks
  only once ticket 4 lands, since spans are carried but not
  yet painted here.
- `scripts/tsc-plgg.sh` clean; `scripts/test-plgg.sh` green;
  >90% coverage on plggmatic and plggpress across all four
  metrics; no `as`/`any`/`ts-ignore`; Prettier
  `printWidth: 50`; zero new dependencies.

## Policies

- `workaholic:implementation` — the URL is the single
  serialization of screen state; there is no second,
  JS-only representation that could drift from it.
- `workaholic:design` — reachability without force: every
  composition is a plain GET a crawler, a reader with no
  JS, and a pasted link all resolve identically.

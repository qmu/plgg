---
created_at: 2026-07-28T09:00:00+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, UX]
effort: 4h
commit_hash:
category: Changed
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
Composition = Readonly<{ head: Column; rest: ReadonlyArray<Column> }>
```

Non-empty by construction — the head is a field, not
`list[0]`, so nothing downstream has an empty case.

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

Separators are escaped INSIDE a field (`~` → `~t`, `,` →
`~c`, `:` → `~f`), deliberately NOT by percent-encoding:
the transport already percent-encodes on the way out and
decodes on the way in, so a second percent round would be
indistinguishable from the transport's own and a span
containing a comma would split wrongly. On emission the
joined value is percent-encoded once, with `/`, `,` and `:`
restored to literals — all three are legal in a query
value, and an unreadable URL is a worse shareable object.
Round-trip is a test through a REAL `URL` parser:
`decode(encode(x)) === x` over routes and spans containing
`,`, `:`, `~`, `/`, `#`, `&`, `%`, spaces and non-ASCII.

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

## Final Report

Development completed as planned. The strip's screen state
is now a value with a wire format, and the server renders
it with nothing on the client:

- `plggmatic/src/Navigate/model/Composition.ts` — `Column`
  (`route` + `Option<span>`) and `Composition` (`head` +
  `rest`). Non-empty by construction: the head is a field,
  not `list[0]`, so no downstream renderer has an empty
  case to defend against.
- `plggmatic/src/Navigate/usecase/compositionUrl.ts` — the
  codec, and the only authority for the format. The URL's
  path is the head; `c` carries the columns to its right
  (`route[:span]`, comma-separated) and `q` the head's own
  span.
- `plggpress/src/router/pressRouter.ts` — `renderColumn`
  per column, `rendered` keeping the ones that resolved,
  and `pageHandler` reading the composition off the
  `Context`. No route was added: a composition is a
  decoration of pages that already exist.
- `plggpress/src/theme/page.ts` — `contentColumn` extracted
  and mapped over the composition.
- `plggpress/src/Href/usecase/href.ts` — `unbase`, the
  inverse of `href` for a deployed base, so a browser-named
  column (base-prefixed) resolves to the route the router
  registered (never prefixed).

**Two decisions worth recording.** First, separator
escaping inside a field is deliberately NOT percent-
encoding (`~t`/`~c`/`~f`): the transport already percent-
encodes on the way out and decodes on the way in, so a
second percent round would make the two indistinguishable
and a span containing a comma would split wrongly. Second,
every content column renders IDENTICALLY wherever it sits
in the strip — same wrapper, same footer. That invariant is
what will let the client runtime fetch a route's own page
and place its column verbatim, so a clicked column and a
reloaded column cannot drift apart.

Verified live against `plggpress dev` on port 4130 serving
the guide, in a real browser **with JavaScript disabled**
(`browser.newContext({ javaScriptEnabled: false })`):

```
composition URL /concepts/?c=/getting-started,/packages/plgg/
  content columns  3
  headings         Core concepts | Getting started | plgg (core)
  <title>          Core concepts        (the head, unchanged)
plain URL /concepts/
  content columns  1
```

With scripting on, the same URL measures a 3088px strip in
a 1600px viewport — depth spends horizontal scroll, not
body width. A `c` naming an unknown route
(`?c=/concepts/,/nowhere/`) renders the two columns that
resolve, with no error page. Screenshots:
`strip-t1-composition-three-columns.png` and
`strip-t1-nojs-composition.png`.

Mission acceptance item 1 also asserts highlights, which
are carried through the model here but not yet painted —
it ticks with the highlight ticket
(20260728090300), as this ticket's gate anticipated.

### Discovered Insights

- **Insight**: `HttpRequest.query` is a `Dict`, so a
  repeated query parameter collapses to one value.
  **Context**: this is why the composition rides in ONE
  `c` value with its own separators rather than the
  obvious repeated `?col=&col=`. Anything modelling a
  LIST in a plgg-http query has the same constraint.
- **Insight**: a `Record` lookup behind a regex that can
  only produce known keys creates an untestable `None`
  branch under `noUncheckedIndexedAccess`.
  **Context**: the unescaper was written as chained
  `split`/`join` instead, which is both the exact inverse
  by construction and free of dead branches — the branch
  gate is a design constraint, not a test chore.

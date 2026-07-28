---
type: Strategy
title: plgg horizontal-orientation UI stack
slug: plgg-horizontal-orientation-ui-stack
status: active
created_at: 2026-07-23T00:39:32+09:00
author: a@qmu.jp
---

# plgg horizontal-orientation UI stack

## Direction

The plgg family delivers a **horizontal-orientation (column-oriented) UI** as its
signature product surface, in the qmu.co.jp aesthetic — monochrome black-and-white, the
beauty carried by spacing and layout rather than colour. Depth is expressed by columns
that expand rightward as you drill in, never by consuming the viewport top-down: "depth
does not consume the viewport."

Two layers advance together under this direction:

- **plggmatic is the general framework.** It grows so that a form found in its reference
  (demo1, the column-strip business app) is expressible generally in the framework, not
  special-cased in the example. Its declarative stack (Declare / Schedule / Layout / Form
  / Catalog) and its absorbed render engine are how any plgg-family product renders a
  horizontal column strip; consumers restyle through tokens and slots, never by
  overriding framework class names.
- **Products rest on plggmatic.** plggpress — the family's documentation-site generator —
  is the first such product: a qmu-aesthetic doc site whose navigation is a
  column-oriented horizontal strip, authored and edited conversationally with an AI agent
  that sees the page. The long horizon includes qfs-viewer re-basing its column UI on
  plggmatic once the framework is general and solid enough.

Why: in the LLM era the app is disposable and regenerated; what endures is the framework
that makes regenerated UI trustworthy and coherent. A single, general
horizontal-orientation UI the whole family shares — rather than each product
reimplementing columns — is the durable surface worth investing in. This direction has
no completion condition; it is advanced by a stream of missions that grow the framework
and the products that rest on it.

## Changelog

<!-- Append-only, dated timeline. One line per event ("- YYYY-MM-DD — event — filename");
     never rewrite past lines. Retirement (rare) is a recorded transition, not a deletion. -->

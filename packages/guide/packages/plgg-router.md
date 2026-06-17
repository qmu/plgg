# plgg-router

::: info Page stub
This page's content is authored in **T5 — the HTTP
stack**. T1 reserves its place in the information
architecture.
:::

`plgg-router` is a pure client-side path toolkit:
compile/match path patterns (`:param` / `*wildcard`)
and parse the query string into `Location` data —
view-free and DOM-free. It is consumed by
[plgg-view](/packages/plgg-view)'s `application`
runtime, and shares its `Segment` / `:param` / `*`
vocabulary with plgg-server's server-side routing.

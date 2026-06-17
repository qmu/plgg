# plgg-http

::: info Page stub
This page's content is authored in **T5 — the HTTP
stack**. T1 reserves its place in the information
architecture.
:::

`plgg-http` is the runtime-neutral HTTP model
(request/response/status/method/error) — pure data and
builders, with no `node:http` or `fetch`. It is the
shared base both [plgg-server](/packages/plgg-server)
and [plgg-fetch](/packages/plgg-fetch) build on, so
neither imports the other.

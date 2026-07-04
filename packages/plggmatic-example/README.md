# @plggmatic/example

> **UNSTABLE** - Experimental study work. Part of the [plgg monorepo](../../README.md).

The **workbench** — an independent client-side app demonstrating
[plggmatic](../plggmatic/)'s column-oriented layout as a **traversable column
stack** (Miller columns): drilling into a section pushes a column, drilling into
a note pushes another, and the whole stack is serialized into the URL so a deep
link reproduces the arrangement and the browser back button reverses each push.
[plgg-view](../plgg-view/)'s `application` runtime owns the history/link wiring;
the app stays pure. Built by the in-house app bundler into a self-contained
`dist/`, served under the docs site at `/example/`.

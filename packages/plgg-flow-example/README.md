# plgg-flow-example

> Part of the [plgg monorepo](../../README.md).

The [plgg-flow](../plgg-flow/README.md) demo. Every sample is written in the
flow DSL (`plgg-flow/dsl`) and shown as a board with its source beside it;
editing the source redraws the board.

`npm run build` writes the plggpress site to `dist/`. It builds Japanese from `markdown/` at `/` and
English from `markdown-en/` at `/en/`, setting `SITE_LOCALE` for each build. The previous `/markdown/` URLs redirect to the corresponding pages.

To check browser layout, serve this package directory with a static HTTP server
and open `test/viewports.html`. It checks the built flat, layer and room sheets
in six iframe viewports and reports each result.

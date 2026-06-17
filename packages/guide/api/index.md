# API reference

This section is the **exhaustive, auto-generated** API
reference for every plgg-family package — every exported
function, type, and interface, with signatures and source
links pulled straight from the packages' TypeScript and
TSDoc.

It is regenerated from source on every build
(`scripts/gen-api.mjs` runs TypeDoc per package before
`vitepress build`), so it cannot drift from the code. For
the **guided**, narrative path — concepts and curated
per-package walkthroughs — start at
[Getting started](/getting-started) and the
[Core concepts](/concepts/); this reference is the
complete index those pages point into.

## Per-package reference

- [plgg](/api/plgg/) — core
- [plgg-http](/api/plgg-http/)
- [plgg-router](/api/plgg-router/)
- [plgg-view](/api/plgg-view/)
- [plgg-server](/api/plgg-server/)
- [plgg-fetch](/api/plgg-fetch/)
- [plgg-sql](/api/plgg-sql/)
- [plgg-kit](/api/plgg-kit/)
- [plgg-foundry](/api/plgg-foundry/)

::: tip Regenerating locally
Run `npm run docs:api` in `packages/guide` (or just
`npm run build`). It requires each package's `dist` to be
built first, since cross-package types resolve through the
`file:` dist symlinks — the deploy CI builds them in
dependency order.
:::

---
created_at: 2026-07-12T01:40:00+09:00
author: a@qmu.jp
type: bugfix
layer: [Infrastructure]
effort: 4h
commit_hash: 4adfc425
category: Changed
depends_on:
mission:
---

# plgg-bundle flattens nested bundles with colliding module keys

## Overview

Cross-repo handoff from `qmu/plggmatic` (diagnosed 2026-07-12 while
verifying the engine absorption; see plggmatic ticket
`20260712011500-example-dist-runtime-broken-by-plgg-bundle-key-collision.md`).

When `plgg-bundle` builds an app whose dependencies are themselves
plgg-bundle outputs (dists carrying an internal `__modules` map), it inlines
those dists by **flattening their module maps into one object literal keyed
by package-relative paths**. `plgg`'s dist and `plgg-view`'s dist both carry
keys like `src/index.ts`; duplicate keys in one object literal resolve
last-wins, so `plgg`'s re-export wrapper
(`node_modules/plgg/dist/index.es.js`) resolves **plgg-view's**
`src/index.ts` instead of plgg's own barrel.

Observed effect in plggmatic: every built page of `plggmatic-example`
(`index`, `demo1`–`demo3`, `forms`) is blank with
`TypeError: (0 , plgg_1.box) is not a function` thrown at module init
(`themeToggle.ts` init → plgg-view `attr` → `plgg_1.box` undefined).
Confirmed on both pre- and post-absorption builds — a long-standing defect,
not a regression. Library dists (a single package's own bundle, e.g.
`plggmatic/dist/index.es.js`) are unaffected; only app bundles that inline
MULTIPLE package dists collide.

Evidence to reproduce: build `plggmatic-example` in qmu/plggmatic
(`scripts/build.sh`), open `dist/demo1.js`, and list the `__modules` keys —
`src/index.ts` appears once for plgg (line ~41) and once for plgg-view
(line ~4441); loading any page in a browser throws at init.

## Key Files

- `packages/plgg-bundle/` - the flattening/inlining code path that merges nested bundle module maps.
- `../plggmatic/packages/plggmatic-example/dist/demo1.js` - collision evidence (reference; regenerate with that repo's `scripts/build.sh`).

## Implementation Steps

1. Namespace flattened module keys by their owning package (e.g.
   `plgg:src/index.ts`) — or resolve each module's `require` specifiers
   relative to its own package root — so identical internal paths from
   different packages can never collide.
2. Add a regression test: bundle a fixture app depending on two local
   packages whose dists share internal module paths (`src/index.ts`);
   assert the bundle evaluates and both packages' exports resolve.
3. Republish `plgg-bundle`; then, in qmu/plggmatic, repin and confirm all
   five example pages render (tracked there by ticket
   `20260712011500-example-dist-runtime-broken-by-plgg-bundle-key-collision.md`).

## Considerations

- Any consumer app bundling two or more plgg-family dists is affected the
  same way — the fix likely repairs more than the plggmatic example.
- Keep the bundle format change backward-compatible for dists already
  published (the inliner rewrites keys at flatten time, so old dists need
  no republish).

---
created_at: 2026-06-30T09:20:00+09:00
author: a@qmu.jp
type: bugfix
layer: [UX, Infrastructure]
effort: 1h
commit_hash: 83fc04f
category: Changed
depends_on:
---

# plgg-press: compose navBar + sidebarTree into the rendered page (extract a page() layout the build uses)

## Overview

Discovered when the full real guide build emitted pages with ZERO `<nav>` and ZERO `<details>`: the theme chrome (navBar, sidebarTree) built in the theme-content ticket is composed only inside `theme/page.spec.ts` (a standalone spec), never in the actual render path. `shell()` wraps just `<main><slot>{content}</slot></main>`, and `pressRouter`'s `bodyOf` passes only the homeHero/markdown body — so the built site has no navigation or sidebar chrome (a functional regression vs VitePress).

Fix: extract the composition the spec already exercises into a reusable `page(config, doc, content, activePath, base)` layout under `theme/`, and wire `pressRouter` to render `shell(config, doc, page(...))` with `activePath` = the route being rendered. The home page (layout==home) renders the hero without the sidebar; content/API pages render navBar + sidebarTree + the content region.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — the page() layout lives beside the other theme view-functions
- `workaholic:implementation` / `policies/coding-standards.md` — pure view function, Html<never>, no escape hatches (typed builders + slot), printWidth 50
- `workaholic:design` / `policies/self-explanatory-ui.md` — every page must carry the nav + sidebar so the site is navigable without JS

## Key Files

- `/home/ec2-user/projects/plgg/packages/plgg-press/src/theme/page.spec.ts` - already inline-composes navBar + sidebarTree + content -> shell; extract this into the page() function
- `/home/ec2-user/projects/plgg/packages/plgg-press/src/theme/shell.ts` - the document shell that wraps the composed body
- `/home/ec2-user/projects/plgg/packages/plgg-press/src/theme/navBar.ts` + `sidebarTree.ts` - the chrome to compose (navBar(config, activePath); sidebarTree(groups, activePath, base))
- `/home/ec2-user/projects/plgg/packages/plgg-press/src/router/pressRouter.ts` - the handler that must call shell(config, doc, page(...)) with activePath = the route

## Implementation Steps

1. Add packages/plgg-press/src/theme/page.ts exporting page(config, doc, content, activePath, base): Html<never> that composes navBar(config, activePath) + a layout region holding sidebarTree(config.sidebar, activePath, base) + the content (use slot for the opaque content; typed builders elsewhere). For the home page (doc layout==home / no sidebar wanted), render the hero full-width without the sidebar.
2. Rewrite pressRouter's body composition to call shell(config, doc, page(config, doc, content, route, base)) where route is the path being rendered (activePath) — replacing the bodyOf-only path; keep homeHero selection for the home route.
3. Update/extend theme/page.spec.ts to test the extracted page() function (nav present, sidebar present with active link, home renders hero without sidebar) rather than re-inlining.
4. Re-run the full guide build and assert nav + sidebar now appear on content/API pages and the active link is marked; keep zero <script> and checkLinks passing.

## Considerations

- This is the missing composition seam: the chrome components and the shell both existed, but nothing wired them into the build's render path.
- activePath must be the route being rendered so navBar/sidebarTree mark the active entry; thread it from pressRouter (it already knows the route per handler).
- Keep it a pure typed view-function (no el()): content is embedded via slot, chrome via the typed nav/details/summary builders.
- The home page intentionally omits the sidebar (hero is full-width); content + API pages get the sidebar.

## Final Report

Development completed as planned. Extracted theme/page.ts (the composition page.spec.ts inline-tested) and wired pressRouter to render shell(config, doc, page(config, doc, content, route, base)). Content/API pages now carry navBar + a flex row of sidebarTree + content; home renders hero full-width with no sidebar. Verified on the REAL 58-page guide build: getting-started has nav x2 + details x20 + active aria-current x2; atomics has the sidebar active mark; home has nav only + hero, no sidebar; zero <script> anywhere; checkLinks passing. tsc clean; 80 passed/0 failed; coverage 99.20/93.15/96.15/99.20; no el()/as/ts-ignore.

### Discovered Insights

- **Insight**: The chrome components (navBar/sidebarTree) and the shell both existed but the COMPOSITION lived only in page.spec.ts — nothing wired it into the build render path, so the site shipped nav-less. The page() layout is the missing seam: content via slot, chrome via typed builders. pressRouter threads c.req.path as activePath.
  **Context**: A reminder that a passing component spec does not prove integration; the full-build chrome assertion is what caught it.
- **Insight**: Latent active-marking bug exposed only once chrome rendered — discoverPaths emits trailing-slash routes (/getting-started/) but config links are authored without (/getting-started), and isActive did exact compare. Fixed with a trailing-slash-insensitive samePath(base)(a,b) on the single Href resolver, used by navBar + sidebarTree.
  **Context**: Route-vs-link normalization belongs in the one Href helper; both nav and sidebar consume it.

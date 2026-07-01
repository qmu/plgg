---
created_at: 2026-06-30T01:35:06+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 4h
commit_hash: b579f79
category: Changed
depends_on: [20260630013505-plgg-press-theme-document-shell.md]
---

# plgg-press theme (b): nav, CSS-only sidebar, generic home (SiteConfig data), callouts, and the 404 not-found view

## Overview

Second half of the theme split (item 19): the content chrome rendered as pure plgg-view view-functions returning Html<never> and composed into the shell from the previous ticket. Includes the top nav bar, a CSS-only collapsible sidebar tree (typed details/summary builders, zero client JS), styled tip/warning/danger callouts (the component plgg-md's Callout renders into), the home hero/features layout that renders GENERICALLY from SiteConfig.home DATA (item 6 — content is not hard-coded, not parsed from frontmatter), and a notFound() 404 view rendered through the SAME shell with base-prefixed nav links (item 14). Single-theme, single-column, light-only; active sidebar link resolved at build time. Consumes SiteConfig + href. The right-hand 'On this page' outline is an acknowledged v1 drop.

**Proof of value:** plgg-test spec: renderToString of a composed page emits the nav, a CSS-only <details> sidebar with an active link, base-prefixed links, a homeHero features grid rendered generically from injected SiteConfig.home data, and a notFound() page rendered through the shell — green under scripts/test-plgg-press.sh.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — theme content modules under packages/plgg-press/src/theme
- `workaholic:implementation` / `policies/coding-standards.md` — pure view functions, Html<never>, no escape hatches, printWidth 50
- `workaholic:implementation` / `policies/emergent-design-system.md` — token-driven atomic CSS via plgg-view Style utilities for nav/sidebar/home/callout, not ad-hoc styles
- `workaholic:design` / `policies/self-explanatory-ui.md` — doc-site nav/sidebar must be navigable without JS
- `workaholic:implementation` / `policies/accessibility-first.md` — semantic landmarks and CSS-only collapse must stay keyboard/screen-reader accessible

## Key Files

- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Style/usecase/utilities.ts` - flex/grid/spacing/color utilities to lay out nav + sidebar + content + hero
- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Html/model/element.ts` - typed builders incl. nav/details/summary for the CSS-only sidebar
- `/home/ec2-user/projects/plgg/packages/plgg-press/src/theme/shell.ts` - the shell from the previous ticket that wraps this content chrome
- `/home/ec2-user/projects/plgg/packages/guide/index.md` - reference for the home hero/features values that now live as SiteConfig.home DATA (rendered generically, not parsed)

## Dependencies

- Depends on [20260630013505-plgg-press-theme-document-shell.md](20260630013505-plgg-press-theme-document-shell.md) — plgg-press theme (a): document shell + style injection (typed plgg-view shell builders, title from firstHeading)

## Implementation Steps

1. Implement navBar(config): Html<never> and sidebarTree(items, activePath, base): Html<never> as nested typed details/summary (built from the typed builders, no el()); route every link through href; resolve the active nav/sidebar link at build time (string compare on path).
2. Implement callout(kind, body): Html<never> for tip/warning/danger — the component plgg-md's Callout renders into.
3. Implement homeHero(home: HomeConfig): Html<never> rendering the hero (title/tagline/actions) + features grid GENERICALLY from SiteConfig.home DATA (item 6) — no hard-coded guide copy; selected when frontmatter.layout == home.
4. Implement notFound(config): Html<never> — a not-found page model rendered through the SAME shell with base-prefixed nav links (item 14); the build ticket renders it and write404 (Ssg) persists it; checkLinks excludes it from route-link expectations.
5. Style everything with plgg-view Style utilities/tokens (single light theme, single column); keep interactivity CSS-only.
6. Add specs: renderToString of a page composed (shell + navBar + sidebarTree + content) contains the nav, the CSS-only <details> sidebar with an active-marked link, and base-prefixed links; homeHero renders the SiteConfig features grid generically from injected data; notFound renders through the shell with base-prefixed nav.

## Considerations

- Home content is DATA-DRIVEN from SiteConfig.home (item 6): the theme renders any consumer's hero/features generically; the guide supplies the values in its site.config instance.
- The 404 view (item 14) reuses the shell and base-prefixed nav; it is rendered in the build ticket, written via write404 (Ssg ticket), and excluded by checkLinks.
- plgg-view style utilities are immature for responsive/dark-mode; accept single-theme/limited-responsive for v1.
- The theme lives in plgg-press, NOT the guide — the site looks plainer than VitePress and drops the right-hand outline (accepted).

## Final Report

Development completed as planned. The content chrome (navBar, sidebarTree, callout, homeHero, notFound) is pure plgg-view view-functions composed into the shell. Verified: tsc clean; build emits dts; 45 passed/0 failed; coverage 100/92/100/100; no el()/as/ts-ignore.

### Discovered Insights

- **Insight**: The CSS-only sidebar uses native <details>/<summary>; the active leaf is resolved at build time (href(base)(link) === href(base)(activePath)), marked aria-current=page, and a recursive holdsActive opens every ancestor disclosure — zero client JS (specs assert no <script>).
  **Context**: This is how the v1 site gets collapsible navigation without hydration; the build pipeline supplies activePath per page.
- **Insight**: Two signatures gained build-time params the ticket omitted: navBar(config, activePath) and homeHero(home, base) — the active-link resolution and href routing need them. homeHero is fully data-driven from SiteConfig.home (tested with non-guide "Acme Docs" data). The features grid uses flex/wrap utilities since plgg-view ships no grid-template utility yet.
  **Context**: The build pipeline (ticket 10) must pass activePath + base into the theme; home rendering is selected when frontmatter.layout == home.
- **Insight**: callout matches kind (tip/warning/danger) exhaustively via a Record palette; callout and notFound embed pre-rendered Html via slot. notFound renders through the SAME shell with a synthetic MarkdownDoc (firstHeading -> <title>).
  **Context**: The build ticket renders notFound and write404 (Ssg) persists it; checkLinks excludes /404 from route expectations.

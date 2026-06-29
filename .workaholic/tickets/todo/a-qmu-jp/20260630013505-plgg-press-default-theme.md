---
created_at: 2026-06-30T01:35:05+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort:
commit_hash:
category:
depends_on: [20260630013502-plgg-md-inline-fold-to-html.md, 20260630013504-plgg-press-scaffold-siteconfig-cli.md]
---

# plgg-press default theme: shell, nav, sidebar, home, callout, title-from-H1 (plgg-view view-functions)

## Overview

The VitePress-default-theme replacement, MOVED into plgg-press and authored as pure plgg-view view-functions returning Html<never>: the full <html> page shell (head with collectCss-injected <style>, base-aware links via plgg-press's href helper, and <title>/<meta> derived from the first H1 since prose pages have no frontmatter), top nav bar, CSS-only collapsible sidebar tree (typed details/summary builders from ticket 2, zero client JS), the markdown content column, styled tip/warning/danger callouts, and the home hero/features layout that OWNS the hero content (replacing VitePress `layout: home`, selected on the frontmatter layout marker). Single-theme, single-column, light-only; active sidebar link resolved at build time. Consumes SiteConfig + href (ticket 7) and highlightCss (ticket 6). The right-hand 'On this page' outline is an acknowledged v1 drop.

**Proof of value:** plgg-test spec: renderToString(shell(config, page, body)) emits a complete HTML document with nav, CSS-only <details> sidebar, byte-identical inlined <style>, base-prefixed links, an H1-derived <title>, and a homeHero features grid — green under scripts/test-plgg-press.sh.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — theme module placement under packages/plgg-press/src/theme
- `workaholic:implementation` / `policies/coding-standards.md` — pure view functions, Html<never>, no escape hatches, printWidth 50
- `workaholic:implementation` / `policies/emergent-design-system.md` — token-driven atomic CSS via plgg-view Style utilities, not ad-hoc styles
- `workaholic:design` / `policies/self-explanatory-ui.md` — doc-site nav/sidebar must be navigable without JS
- `workaholic:implementation` / `policies/accessibility-first.md` — semantic landmarks and CSS-only collapse must stay keyboard/screen-reader accessible

## Key Files

- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Style/usecase/utilities.ts` - flex/grid/spacing/color utilities to lay out nav + sidebar + content + hero
- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Html/model/element.ts` - typed builders incl. nav/details/summary (added in ticket 2) for the CSS-only sidebar
- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Html/usecase/collectCss.ts` - collectCss(node) -> stylesheet text inlined into <head> by the shell
- `/home/ec2-user/projects/plgg/packages/guide/index.md` - source of hero/features content to port into the theme's homeHero (content owned by the theme, not parsed)

## Dependencies

- Depends on [20260630013502-plgg-md-inline-fold-to-html.md](20260630013502-plgg-md-inline-fold-to-html.md) — plgg-md: inline parser, injected Highlighter + link-resolver seams, anchor-parity slugs, AST->Html<never> fold
- Depends on [20260630013504-plgg-press-scaffold-siteconfig-cli.md](20260630013504-plgg-press-scaffold-siteconfig-cli.md) — Create plgg-press: scaffold the VitePress-like facade — package, SiteConfig contract, href helper, build()/dev() API + CLI skeleton

## Implementation Steps

1. Create packages/plgg-press/src/theme view functions: shell(config, page, body) producing the full <html> doc (head meta + base-aware links via href + <style> from collectCss(body) merged with highlightCss); navBar(config); sidebarTree(items, activePath, base) as nested typed details/summary (built from ticket-2 builders, no el()); content column wrapper; footer/prev-next.
2. Derive page <title>/<meta> from the first H1 of the rendered body (prose pages have no frontmatter); fall back to config.title.
3. Implement callout(kind, body): Html<never> for tip/warning/danger — the component plgg-md's Callout renders into.
4. Implement homeHero(config): Html<never> that OWNS the hero (name/text/tagline/actions) + features grid content (ported from the guide's index.md into the theme), selected when frontmatter.layout == home.
5. Style everything with plgg-view Style utilities/tokens (single light theme, single column); collectCss inlines atoms; keep interactivity CSS-only; route every link through plgg-press's href helper.
6. Inject collectCss/highlightCss into <style> via a text() node; add a spec asserting the emitted <style> text is byte-identical to the collected stylesheet, and RESTRICT v1 CSS to the atomic-utility subset (no <,>,& chars) since renderToString HTML-escapes text nodes.
7. Resolve the active nav/sidebar link at build time (string compare on path); add specs: renderToString(shell(...)) contains the nav, the CSS-only <details> sidebar, the inlined <style>, base-prefixed links, an H1-derived <title>, and the homeHero features grid.

## Considerations

- plgg-view has NO hydration and NO effects — a fully static, zero-client-JS site sidesteps that gap; do not introduce a client runtime.
- plgg-view style utilities are immature for responsive/dark-mode; accept single-theme/limited-responsive for v1. If a media query (with > combinators) is ever needed, add a guarded raw-style node to plgg-view rather than relying on text() (which would corrupt < > &).
- The theme lives in plgg-press, NOT the guide — the guide consumes it through the facade; the site looks plainer than VitePress and drops the right-hand outline (accepted).

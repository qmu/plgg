---
created_at: 2026-06-30T01:35:05+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 2h
commit_hash: accb8e7
category: Changed
depends_on: [20260630013459-plgg-view-extend-element-builders.md, 20260630013504-plgg-press-scaffold-siteconfig-cli.md]
---

# plgg-press theme (a): document shell + style injection (typed plgg-view shell builders, title from firstHeading)

## Overview

First half of the theme split (item 19): the full <html> document SHELL authored as pure plgg-view view-functions returning Html<never>, built from the typed document-shell builders (html/head/body/title/meta/link/style) added in the plgg-view-builders ticket — NO el() escape hatch. shell(config, doc, body) produces head (meta + base-aware <link>s via plgg-press's href helper + a single <style> from collectCss(body) merged with highlightCss()) and body wrapping a content region. Page <title>/<meta> derive from MarkdownDoc.firstHeading (Option) with a config.title fallback; the home page uses the explicit config title (item 15). This ticket owns the shell + style-injection mechanics only; nav/sidebar/home/callout/404 content is the next ticket.

**Proof of value:** plgg-test spec: renderToString(shell(config, doc, body)) emits a complete doctype+<html> document with base-prefixed <link>s, a byte-identical inlined <style> (collectCss + highlightCss), and a <title> derived from firstHeading (falling back to config.title) — green under scripts/test-plgg-press.sh.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — shell module placement under packages/plgg-press/src/theme
- `workaholic:implementation` / `policies/coding-standards.md` — pure view functions, Html<never>, NO el() escape hatch (uses the typed shell builders), printWidth 50
- `workaholic:implementation` / `policies/emergent-design-system.md` — token-driven atomic CSS via plgg-view Style utilities, collectCss-inlined, not ad-hoc styles
- `workaholic:design` / `policies/self-explanatory-ui.md` — the document shell must produce a semantically complete, navigable-without-JS HTML document

## Key Files

- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Html/model/element.ts` - the typed document-shell builders (html/head/body/title/meta/link/style) added earlier — used so the shell needs no el()
- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Html/usecase/collectCss.ts` - collectCss(node) -> stylesheet text inlined into <head> by the shell
- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Html/usecase/renderToString.ts` - confirms the shell serializes a complete doctype+<html> document and escapes <style> text
- `/home/ec2-user/projects/plgg/packages/plgg-press/src/SiteConfig/model` - SiteConfig (title) + href helper consumed for base-aware <link>s and the title fallback

## Dependencies

- Depends on [20260630013459-plgg-view-extend-element-builders.md](20260630013459-plgg-view-extend-element-builders.md) — plgg-view: add typed element builders + content models for the Markdown/theme tag set AND the document shell
- Depends on [20260630013504-plgg-press-scaffold-siteconfig-cli.md](20260630013504-plgg-press-scaffold-siteconfig-cli.md) — Create plgg-press: scaffold the facade — package, SiteConfig contract (incl. home data + allowedHosts), href helper, config-loading CLI (plgg-bundle TS hook), build()/dev() skeleton

## Implementation Steps

1. Create packages/plgg-press/src/theme/shell.ts: shell(config, doc, body): Html<never> producing the full <html> document from the typed shell builders — head(meta charset/viewport, base-aware <link rel=stylesheet/canonical> via href, <title>, <style>) + body(content region wrapper around body).
2. Derive <title>/<meta> from doc.firstHeading (Option) with a config.title fallback; for the home page use the explicit config.title (item 15).
3. Inject the stylesheet: merge collectCss(body) with highlightCss() into one text payload and place it inside a single <style> via a text() node; RESTRICT v1 CSS to the atomic-utility subset (no <,>,& chars) since renderToString HTML-escapes text nodes. If a media query (with > combinators) is ever needed, add a guarded raw-style node to plgg-view rather than relying on text().
4. Route every shell <link>/asset href through plgg-press's href helper (single base-path site).
5. Add a spec asserting renderToString(shell(config, doc, body)) emits a leading doctype + complete <html><head>...</head><body>...</body></html>, the inlined <style> text is byte-identical to the collected+highlight stylesheet, a firstHeading-derived <title> (and config.title fallback when firstHeading is None), and base-prefixed <link> hrefs.

## Considerations

- The shell is built from typed builders, NOT el() — item 5/19: the document-shell tags are first-class plgg-view builders.
- plgg-view has NO hydration and NO effects — a fully static, zero-client-JS shell sidesteps that gap; do not introduce a client runtime.
- <style> text must stay within the atomic-utility subset (no raw < > &) to survive renderToString escaping; the dev-only live-reload <script> is added by the dev ticket, never here.
- Title derivation is the single consumer of MarkdownDoc.firstHeading (item 15); home uses config.title.

## Final Report

Development completed as planned (after the slot prerequisite unblocked it). shell(config, doc, body) builds the full <html> document from typed plgg-view builders + the new slot; <body><main><slot/></main></body> wraps the Markdown body with no el()/as. Verified: tsc clean; build emits dts; 25 passed/0 failed; coverage 100/94.12/100/100.

### Discovered Insights

- **Insight**: The shell wraps the opaque Markdown body via `bodyEl([], [main_([], [slot([], [body])])])` — slot is the typed seam (div-pinned, Flow-assignable, permissive children) inside a semantic <main> landmark. No el() in the shell.
  **Context**: This is the canonical pattern for embedding any rendered Html<never> fragment (markdown body, future widgets) into a typed document.
- **Insight**: title = pipe(doc.firstHeading, getOr(config.title)); home/heading-less pages fall back to config.title. The single <style> = text(collectCss(body)) ONLY — no highlightCss merge, because plgg-highlight colors tokens inline (attr style) so there is no class-based highlight stylesheet; collectCss already captures every atomic rule. collectCss output (.cHASH{prop:value}) is escape-safe through renderToString.
  **Context**: The next theme ticket (nav/sidebar/home/callout) and the build pipeline reuse shell(); they must keep CSS in the atomic-utility subset (no < > &) so the text() <style> survives escaping.

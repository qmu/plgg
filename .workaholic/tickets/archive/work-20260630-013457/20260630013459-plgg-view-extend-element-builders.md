---
created_at: 2026-06-30T01:34:59+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort: 4h
commit_hash: 06aa1dc
category: Added
depends_on:
---

# plgg-view: add typed element builders + content models for the Markdown/theme tag set AND the document shell

## Overview

Precursor enhancement that closes the verified builder gap: plgg-view currently exposes typed builders ONLY for div, section, header, main_, form, li, a, span, strong, em, label, button, h1, h2, p, ul, input — and el() returns a string-branded Html<Msg> NOT assignable to the narrow Flow/Phrasing/ListItem unions, so el()-built nodes cannot nest inside typed containers. Add typed builders and content-model wiring for the tags the Markdown renderer, highlighter, and plgg-press theme need: h3-h6, ol, code, pre, img, br, hr, blockquote, the table family (table/thead/tbody/tr/td/th), nav, details/summary, AND the DOCUMENT-SHELL tags html, head, body, title, meta, link, style (so the theme shell is built from typed builders, NOT the el() escape hatch — house style forbids it). Breaking/additive changes are fine. SSR-only tags need no client runtime changes.

**Proof of value:** plgg-test specs: renderToString over trees using the new builders (h3, ol/li, blockquote, pre>code, img, hr, a full table thead/tbody/tr/th/td, nav, details>summary, AND a full html>head(title/meta/link/style)>body document shell with a leading doctype) emits the expected HTML — green under scripts/test-plgg-view.sh.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — builders belong in Html/model/element.ts following the existing flowEl/phrasingEl/listEl/voidEl grouping
- `workaholic:implementation` / `policies/coding-standards.md` — strict no-as/any/ts-ignore, printWidth 50; pin tag literals via the existing builder pattern
- `workaholic:implementation` / `policies/type-driven-design.md` — new content models (TableSection/TableRow/TableCell, DocumentShell head/body) must be typed unions, not string-branded escapes
- `workaholic:implementation` / `policies/test.md` — >90% coverage; specs proving each new builder renders via renderToString

## Key Files

- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Html/model/element.ts` - add flowEl/phrasingEl/listEl/voidEl-style builders; extend Flow/Phrasing unions; add table/details and document-shell (html/head/body/title/meta/link/style) content models
- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Html/usecase/renderToString.ts` - verify the new tags (incl. doctype/<html> shell, void <meta>/<link>) serialize correctly (escape stays the chokepoint)
- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Html/usecase/escape.ts` - isSafeTag allowlist may need the new tag names (incl. style/meta/link) added

## Implementation Steps

1. Add heading builders h3,h4,h5,h6 (mirroring h1/h2) and extend the Flow union to include them.
2. Add ol as a listEl (li children), code and pre (define content models: code accepts Phrasing incl. text; pre accepts a code child or text — model per spike findings), img and br and hr as voidEl, blockquote as flowEl.
3. Add the table family: table accepts thead/tbody/tr; thead/tbody accept tr; tr accepts th/td; th/td accept Flow — as typed content-model containers so el() is not needed.
4. Add nav (flow container) and details (flow container) + summary (phrasing container) builders for the CSS-only sidebar; ensure details accepts a summary child plus Flow.
5. Add the DOCUMENT-SHELL builders: html (accepts head + body), head (accepts title/meta/link/style), body (Flow container), title (text), meta (voidEl), link (voidEl), style (text child) — typed so the theme shell composes the whole <html> document WITHOUT el(); confirm renderToString emits a leading doctype and self-closes the void shell tags.
6. Update isSafeTag's allowlist (confirm grammar-based + shell tags pass, otherwise add them) and confirm renderToString emits/escapes them safely.
7. Add colocated .spec.ts asserting each new builder renders the expected HTML via renderToString (incl. a nested table, details/summary, and a full html>head(title/meta/link/style)+body document shell).

## Considerations

- Keep the typed-builder discipline: do NOT widen everything to el(); the point is that the Markdown renderer AND the document shell nest typed nodes without escape hatches (item 5: the shell tags are first-class builders, not an el() carve-out).
- Client-side renderer changes are out of scope (v1 is SSR/zero-JS); only the SSR path and types need to cover the new tags.
- Match the existing curried (attributes, children) shape and tag-literal pinning so brands survive without casts.
- style/meta/link only need to serialize on the SSR path; document-shell tags are never client-hydrated in v1.

## Final Report

Development completed as planned. All new builders are first-class typed builders (no `el()` carve-out); `escape.ts` needed no change (its `^[a-zA-Z][a-zA-Z0-9-]*$` tag grammar already admits the new tags). Verified green: `tsc-plgg-view.sh` clean, `test-plgg-view.sh` 126 passed/0 failed, coverage 98.32% stmts / 90.10% branches / 95.21% funcs / 98.32% lines (element.ts + renderToString.ts at 100%). No `as`/`any`/`ts-ignore` introduced.

### Discovered Insights

- **Insight**: `renderToString` already self-closes void tags via a `VOID_TAGS` list, so `meta`/`link`/`img`/`br`/`hr` needed only union/builder additions, not serializer special-casing; the one serializer change was emitting a leading `<!doctype html>` for the `html` shell.
  **Context**: The document-shell builders compose a full `<html>` document from typed nodes; the doctype is the only thing the tree can't express, so it lives in the serializer.
- **Insight**: Content models are expressed as small typed unions (PreContent, TableContent/TableRow/TableCell, DetailsContent, DocumentContent, HeadContent) rather than widening to a generic child — this is what lets Markdown/theme nodes nest without `el()`, and is the pattern the plgg-md fold and theme will build on.
  **Context**: A `</style>` breakout-escape test confirms text-only children (title/style) stay XSS-safe through the existing escape chokepoint.

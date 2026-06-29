---
created_at: 2026-06-30T01:34:59+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort:
commit_hash:
category:
depends_on:
---

# plgg-view: add typed element builders + content models for the Markdown/theme tag set

## Overview

Precursor enhancement that closes the verified builder gap: plgg-view currently exposes typed builders ONLY for div, section, header, main_, form, li, a, span, strong, em, label, button, h1, h2, p, ul, input — and el() returns a string-branded Html<Msg> NOT assignable to the narrow Flow/Phrasing/ListItem unions, so el()-built nodes cannot nest inside typed containers. Add typed builders and content-model wiring for the tags the Markdown renderer, highlighter, and plgg-press theme need: h3-h6, ol, code, pre, img, br, hr, blockquote, the table family (table/thead/tbody/tr/td/th), nav, and details/summary. Breaking/additive changes are fine. SSR-only tags need no client runtime changes.

**Proof of value:** plgg-test specs: renderToString over trees using the new builders (h3, ol/li, blockquote, pre>code, img, hr, a full table thead/tbody/tr/th/td, nav, details>summary) emits the expected HTML — green under scripts/test-plgg-view.sh.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — builders belong in Html/model/element.ts following the existing flowEl/phrasingEl/listEl/voidEl grouping
- `workaholic:implementation` / `policies/coding-standards.md` — strict no-as/any/ts-ignore, printWidth 50; pin tag literals via the existing builder pattern
- `workaholic:implementation` / `policies/type-driven-design.md` — new content models (TableSection/TableRow/TableCell) must be typed unions, not string-branded escapes
- `workaholic:implementation` / `policies/test.md` — >90% coverage; specs proving each new builder renders via renderToString

## Key Files

- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Html/model/element.ts` - add flowEl/phrasingEl/listEl/voidEl-style builders; extend Flow/Phrasing unions; add table/details content models
- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Html/usecase/renderToString.ts` - verify the new tags serialize correctly (escape stays the chokepoint)
- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Html/usecase/escape.ts` - isSafeTag allowlist may need the new tag names added

## Implementation Steps

1. Add heading builders h3,h4,h5,h6 (mirroring h1/h2) and extend the Flow union to include them.
2. Add ol as a listEl (li children), code and pre (define content models: code accepts Phrasing incl. text; pre accepts a code child or text — model per spike findings), img and br and hr as voidEl, blockquote as flowEl.
3. Add the table family: table accepts thead/tbody/tr; thead/tbody accept tr; tr accepts th/td; th/td accept Flow — as typed content-model containers so el() is not needed.
4. Add nav (flow container) and details (flow container) + summary (phrasing container) builders for the CSS-only sidebar; ensure details accepts a summary child plus Flow.
5. Update isSafeTag's allowlist (confirm grammar-based tags pass, otherwise add them) and confirm renderToString emits/escapes them safely.
6. Add colocated .spec.ts asserting each new builder renders the expected HTML via renderToString (incl. a nested table and a details/summary).

## Considerations

- Keep the typed-builder discipline: do NOT widen everything to el(); the point is that the Markdown renderer and theme nest typed nodes without escape hatches.
- Client-side renderer changes are out of scope (v1 is SSR/zero-JS); only the SSR path and types need to cover the new tags.
- Match the existing curried (attributes, children) shape and tag-literal pinning so brands survive without casts.

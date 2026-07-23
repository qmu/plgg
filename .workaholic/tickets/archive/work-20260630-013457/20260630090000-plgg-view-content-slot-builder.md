---
created_at: 2026-06-30T09:00:00+09:00
author: a@qmu.jp
type: enhancement
layer: [UX, Domain]
effort: 0.5h
commit_hash: 617e7b1
category: Added
depends_on:
---

# plgg-view: add a content-slot builder for embedding pre-rendered Html in typed containers

## Overview

Discovered prerequisite for the plgg-press theme shell (ticket 20260630013505). plgg-view's typed containers (`body`, `div`, `main_`, …) accept only the narrow `Flow`/`Phrasing` unions, which are keyed on specific tag literals. The general `el()` builder brands its tag as `string`, so an `el()`-built node — e.g. `MarkdownDoc.body` (which plgg-md assembles via `el("div", …)`) — is **not** assignable to `Flow` and cannot nest in a typed container without `el()` (forbidden in the shell) or `as` (forbidden repo-wide).

The data layer already stores children uniformly: `ElementContent.children: ReadonlyArray<Html<Msg>>` — the content-model restriction lives ONLY in the builder signatures. So the principled fix is a single new builder, `slot`, that **pins its own tag to `"div"`** (making the slot itself valid `Flow` content that nests in typed containers) while **accepting arbitrary pre-rendered `Html<Msg>` children** (the opaque embedded fragment). This is distinct from `el()` (which widens the tag to `string` and so is not Flow-assignable) and is fully type-sound (it matches exactly what `ElementContent` already stores).

This unblocks `shell(config, doc, body)` building a typed `<html>` document whose `<body>`/content region wraps `doc.body` with no escape hatch.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — the builder belongs beside the other builders in Html/model/element.ts
- `workaholic:implementation` / `policies/coding-standards.md` — tag-literal pinning via ElementContent, no `as`/`any`/`ts-ignore`, printWidth 50
- `workaholic:implementation` / `policies/type-driven-design.md` — the slot is a typed seam (tag-pinned, permissive children), NOT the `el()` escape hatch

## Key Files

- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Html/model/element.ts` - add `slot` next to `flowEl`/`el`, mirroring the tag-pinning pattern (`box("Element")<ElementContent<Msg, "div">>({ tag: "div", attributes, children })`)
- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Html/model/Html.ts` - confirms `ElementContent.children` is the uniform `ReadonlyArray<Html<Msg>>`, so permissive children are type-sound
- `/home/ec2-user/projects/plgg/packages/plgg-view/src/Html/usecase/renderToString.spec.ts` - colocated spec proving a slot wrapping an `el()`-built fragment nests under a typed `body` and serializes

## Implementation Steps

1. Add `slot<Msg>(attributes: ReadonlyArray<Attribute<Msg>>, children: ReadonlyArray<Html<Msg>>): Html<Msg, "div">` to element.ts, pinning the tag through `ElementContent<Msg, "div">` exactly like `flowEl` pins its tag, but typing the `children` param as the permissive `ReadonlyArray<Html<Msg>>`.
2. Document it clearly as the typed seam for embedding already-built Html (a rendered Markdown body, opaque highlighter output) into a typed container — contrast with `el()` (widens tag) and `flowEl` (narrows children).
3. Confirm it is re-exported via `Html/model/index.ts` (element.ts is already re-exported).
4. Add a spec: `renderToString(body([], [slot([], [el("div", [], [text("x")])])]))` typechecks and serializes the nested fragment; a slot is assignable wherever `Flow` is accepted.

## Considerations

- This is additive and breaking-change-free; it does not widen any existing builder, so existing nesting guarantees are untouched.
- The slot is the ONLY new seam needed: plgg-md already produces `Html<never>` bodies via `el()`, and the theme wraps them through `slot`.
- Keep the slot tag `"div"` (a `Flow` member) so it nests in `body`/`main_`/`details`; a future `<main>`-tagged variant can be added if a semantic content region is wanted, but `div` suffices for v1.

## Final Report

Development completed as planned. Added the `slot` builder to plgg-view element.ts + a colocated renderToString spec. Verified: tsc-plgg-view clean; test-plgg-view 127 passed/0 failed (was 126); no as/any/ts-ignore.

### Discovered Insights

- **Insight**: plgg-view's content-model unions are tag-literal-keyed; `el()` brands tag as `string`, so el-built nodes (the entire plgg-md body) are NOT assignable to `Flow`. `slot` pins tag `"div"` (a `Flow` member) while accepting permissive `Html<Msg>` children — the type-sound seam for embedding rendered fragments, since `ElementContent.children` is already the uniform `ReadonlyArray<Html<Msg>>`.
  **Context**: This was the blocker the theme-shell ticket hit; `slot([], [doc.body])` now nests under a typed `<body>` with no escape hatch. Discovered during the night drive — the plgg-view-builders ticket made `body` a Flow container but left no typed slot for opaque rendered content.

# Example: the workbench

The repository ships a reference app, `@plggmatic/example` — an independent client-side program that displays the **traversable** reading of column-oriented layout: a *column stack*. Where this documentation site runs a fixed sidebar / content / rail arrangement, the workbench **pushes columns as you drill in**: the root column lists sections; selecting a section pushes a notes-list column; selecting a note pushes a reading column. Each pushed column carries sticky header chrome with a close link, a breadcrumb trail in the top bar mirrors the stack, and the whole arrangement round-trips through the URL. Both UIs are compositions of the same `row`/`column`/`pane` builders — the proof that the layout system is a pattern, not a fixed theme.

The built app is served beside this site at the `/example/` path, and its source lives in [`packages/plggmatic-example` on GitHub](https://github.com/qmu/plgg/tree/main/packages/plggmatic-example).

## The stack is derived, the geometry is composed

The row's column list is computed from the selection depth on every render — the root column is always present, the deeper columns exist only while their selection does, and each column's sizing is a composed atom:

```ts
import { row, column } from "plggmatic";
import { basis } from "plggmatic/style";
import { type Html } from "plgg-view";

declare const sectionsPanes: ReadonlyArray<Html<never>>;
declare const pushed: ReadonlyArray<Html<never>>;

const stack = row(
  [],
  [
    column([basis("220px")], sectionsPanes),
    ...pushed,
  ],
);
```

Fixed tracks keep their measure (`basis("220px")`, `basis("300px")`); the reader composes `fluid` plus its own `"ex-reader"` hook for the app's below-breakpoint width — options are atoms and hooks, not config fields.

> **The chrome is now framework-owned (ticket 10).** The sticky column headers, the breadcrumb trail, the `aria-current` inverted pill, the per-column scroll, and the snap strip were lifted out of this app into the design system: `colHead` and `breadcrumb` are plggmatic components, and `chromeCss` (on `plggmatic/style`) is the escape-safe CSS block, injected once at boot. The example still composes its own column *stack* — that hand-written composition is what the [multi-column renderer](/multi-column) replaces for a scheduled declaration, and what ticket 13's declarative rewrite finally retires. Only the app-identity chrome (top bar, wordmark, the `88vw` reader width) stays here.

## What the app demonstrates

- **Columns as navigation state** — the stack depth (root → +list → +reader) is derived from one immutable Model (`section` and `note` are `Option`s); pushing and truncating are re-renders, not view mutations.
- **The URL is the serialized stack** — `toUrl` projects the depth into `` (root), `?s=…`, or `?s=…&n=…`; a deep link reproduces the exact stack, browser back exactly reverses each push, and every close link (`×` in a column header, or a breadcrumb crumb) is a plain `<a>` to the truncating URL — leaving is the same gesture as entering.
- **Link-driven, runtime-wired** — the plgg-view `application` runtime intercepts in-app clicks and turns them into messages; the app wires no handlers to links at all.
- **Column identity by key** — the list column is keyed by section and the reader by note, so switching selection remounts the column fresh (scroll reset + entrance fade) instead of patching stale state in place.
- **The scheme contract, honored purely** — the `--pm-*` variable sets are regenerated from `colorHex` under two app-root classes and the class swaps by re-render; the theme toggle changes the Model and no code mutates the document.
- **One active-state rule** — a single stylesheet rule paints the inverted pill on anything marked `aria-current="page"`, so the nav tree and the note list share the same selection affordance.

# Example: the workbench

The repository ships a reference app, `@plggmatic/example` — and it is now a
**declaration**. You describe the data (Resources/Collections), the menu, the
list/detail views, the query filter, and the create/delete actions as pure
data; `schedule(...)` derives the whole plgg-view program (the `Model`, the
`Msg` union, a pure `update`, and a total URL codec), and the
[multi-column renderer](/multi-column) draws it. The traversable column stack
users know — drilling a section pushes a notes column, drilling a note pushes
the reader, and the arrangement round-trips through the URL — is all derived.
The 691-line hand-written program it replaced is gone.

The built app is served beside this site at the `/example/` path, and its source
lives in [`packages/plggmatic-example` on GitHub](https://github.com/qmu/plgg/tree/main/packages/plggmatic-example).

## The program is a declaration

The app author writes the declaration and the mount — not a `Model`, a `Msg`, an
`update`, a URL codec, or a column stack:

```ts
import {
  schedule, declare, menu, menuEntry,
  collection, sync, query, makeRow, field,
  multiColumn,
} from "plggmatic";

const workbench = declare({
  title: "Field Notes",
  menu: menu([menuEntry("Notes", "sections")]),
  collections: [
    collection<Section>({
      id: "sections",
      title: "Sections",
      toRow: (s) => makeRow(s.id, s.label),
      source: sync(() => sections),
      child: "notes",
      query: query("Filter sections"),
    }),
    collection<Note>({
      id: "notes",
      title: "Notes",
      toRow: (n) => makeRow(n.id, n.title, [field("", n.body)]),
      source: sync((path) => notesFor(path[0])),
    }),
  ],
});

const scheduled = schedule(workbench);
// a renderer supplies the missing `view`
const view = (model) => multiColumn(scheduled.scene(model));
```

Everything the users knew is still there — but derived. The stack depth, the
per-column keying and entrance fades, the sticky `colHead` close links, the
breadcrumb trail, and the URL reflection all come out of `schedule` +
`multiColumn`. Selecting a section is a link to `?c=sections&p=<id>`; browser
back reverses each push; a deep link reproduces the exact arrangement.

## Accessibility from the declaration alone

The rewritten app hand-writes **no** `aria-*` attribute for anything the
framework renders. The landmark panes (`nav`/`main`/`aside`), the labelled close
links, the `aria-current="page"` selection pill, the labelled breadcrumb region,
and the destructive-action confirm dialog (`role="dialog"`, `aria-modal`) are all
produced by the renderer from the declaration. The only hand-written code left is
app identity: the wordmark and the framework CSS injection.

## What the app demonstrates

- **The whole program as data** — menus, lists/details, a query, and
  create/delete actions with confirmation-as-data, from which the UI is
  scheduled (D1). Swapping a `sync` source for an `async` one never touches the
  app.
- **The URL is the derived, canonical codec** — `?c=…&p=…/…&q=…`, total in both
  directions (junk yields a valid slice), reflecting the flow position without a
  line of hand-written parsing.
- **Mode-agnostic (D10)** — the same declaration renders under the multi-column
  or [single-column](/multi-column) mode; nothing in the declaration or the
  scheduled model names a column or a screen.
- **Style stays composed** — the `row`/`column`/`pane` combinators and the
  `--pm-*` scheme still power the geometry under the renderer; the design-system
  half of this page's older story remains true — only the *program* half is now
  derived.

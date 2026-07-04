# Multi-column renderer

plggmatic's declarative scheduler (see the framework's `schedule`) derives a
whole plgg-view program from a **declaration** — the `Model`, the `Msg` union,
a pure `update`, a total URL codec, and a typed `Scene`. The **multi-column
renderer** projects that `Scene` into the panes-expanding-rightward
arrangement: the menu is a `navigation` column, each drilled-into list a
`complementary` column, and the selected item's detail the `main` column, with
a sticky `colHead` close link per column and a breadcrumb trail above.

```ts
import {
  schedule,
  declare,
  menu,
  menuEntry,
  collection,
  sync,
  makeRow,
  multiColumn,
} from "plggmatic";
import { makeUrl } from "plgg-view/client";

const app = declare({
  title: "Field Notes",
  menu: menu([menuEntry("Sections", "sections")]),
  collections: [
    collection({
      id: "sections",
      title: "Sections",
      toRow: (s) => makeRow(s.id, s.label),
      source: sync(() => sections),
    }),
  ],
});

const scheduled = schedule(app);
// scheduled satisfies plgg-view's Application minus `view`;
// multiColumn supplies the view over the derived Scene.
const view = (model) =>
  multiColumn(scheduled.scene(model));
```

## The framework owns the geometry now

Before the scheduler, the column-oriented pattern lived once as ~250 lines of
hand-written *app* code (the workbench example): the traversable column stack,
the sticky `colHead` chrome, the breadcrumb trail, per-column scroll above the
`snap` breakpoint, and the below-`snap` scroll-snap strip. Ticket 10 lifted all
of it into the design system:

- `multiColumn` composes the `row`/`column`/`pane` combinators from the
  scheduled `Scene` — landmark roles come from the level kind, never
  hardcoded.
- `colHead` and `breadcrumb` are framework components (`pm-colhead` /
  `pm-crumbs` hooks).
- `chromeCss` (on the `plggmatic/style` subpath) is the escape-safe CSS block
  carrying the surfaces, sticky headers, the `aria-current` inverted pill, the
  per-column scroll (viewport minus the chrome-rail token), and the snap strip
  — every colour a `--pm-*` variable, every dimension a token, the media
  boundaries from the breakpoint builders.

Inject `chromeCss` once at boot (after the scheme CSS) and the multi-column
mode is styled with no app-side geometry. The `Parts` escape hatch on the
combinators remains for *other* layouts the renderer does not cover — but the
multi-column arrangement is no longer the consumer's to assemble.

Mode-agnosticism (D10): the declaration and the scheduled model name no
column, pane, drawer, or screen. The single-column renderer projects the same
`Scene` into one-operation-per-screen (a sibling page), and a runtime toggle
flips between them without touching the model.

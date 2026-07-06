# The declarative scheduler

The framework half of
[plggmatic](/packages/plggmatic/): **declarative
definition of menus, data lists/details, actions,
search, and flows, from which a UI program is
automatically scheduled** (decision D1). You write a
declaration as data; `schedule(...)` derives everything
a [plgg-view](/packages/plgg-view) application needs
except the view.

## Writing an app with it

The reference app's real declaration
(`packages/plggmatic-example/src/declaration.ts`,
abbreviated) — a sections→notes drill-down plus a
mutable `tasks` collection demonstrating create and
delete-with-confirmation:

```typescript
import {
  declare,
  menu,
  menuEntry,
  collection,
  sync,
  query,
  action,
  confirm,
  immediate,
  makeRow,
  field,
  loaded,
} from "plggmatic";

export const declaration = declare({
  title: "Field Notes — scheduled",
  menu: menu([
    menuEntry("Notes", "sections"),
    menuEntry("Tasks", "tasks"),
  ]),
  collections: [
    collection<Section>({
      id: "sections",
      title: "Sections",
      toRow: (s) => makeRow(s.id, s.label),
      source: sync(() => sections),
      child: "notes",
      query: query("Filter sections"),
    }),
    collection<Task>({
      id: "tasks",
      title: "Tasks",
      toRow: (t) => makeRow(t.id, t.label),
      source: sync(() => tasks),
      actions: [
        action({
          id: "del",
          label: "Delete",
          verb: "delete",
          confirm: confirm(
            "Delete this task?",
            true,
          ),
          run: (target) => cmdEffect(/* … */),
        }),
      ],
    }),
  ],
});
```

Scheduling it and wiring the renderer
(`src/app.ts`, abbreviated):

```typescript
import { schedule, multiColumn } from "plggmatic";

export const scheduled = schedule(declaration);

export const app = {
  ...scheduled,
  view: (model) =>
    multiColumn(scheduled.scene(model)),
};
```

The full files compile and run in
[plggmatic-example](/packages/plggmatic-example).

## Vocabulary

The declaration is a set of closed unions consumed with
exhaustive [`match`](/concepts/match), so adding a
variant is a compile error at every interpreter:

- **Collection** — `collection<T>({ id, title, toRow,
source, child?, query?, actions? })`; `toRow`
  projects the domain `T` into a `Row` (id, label,
  detail `field`s) — the scheduler never sees `T`
  itself.
- **Source** — `sync(fn)` or `async(fn)` through one
  shape; the function receives the current `Path`
  (ancestor row ids) so a child collection can load
  per-parent.
- **Menu / Flow** — `menu` / `menuEntry` name the
  roots; each collection's `child` edge forms the flow
  graph.
- **Action** — `action({ id, label, verb, confirm,
run })`; `verb` is create/update/delete,
  `confirm` is data (`immediate()` or
  `confirm(message, destructive)`), and `run` returns
  a `Cmd` — effects are returned by `update`, never
  run by it.
- **Query** — `query(placeholder)` enables per-list
  filtering (`matchesQuery`).
- **Scheduled** — `schedule(declaration)` returns
  `init` / `update` / `onUrlChange` / `toUrl` plus
  `scene: (Model) => Scene`; the `Scene` is a stack of
  `Level`s (`menuLevel$` / `listLevel$` /
  `detailLevel$`) a renderer projects.

## Why the vocabulary is mode-agnostic

Decision D10: no declaration or derived type names a
column, pane, drawer, or screen. The scheduled `Scene`
is display-neutral; the
[renderers](/packages/plggmatic/renderers-forms)
project it. A consumer holds the display `Mode`
_beside_ the scheduled model, never in it, so flipping
mode mid-flow preserves flow position, selection,
query, pending confirmation, and URL:

```typescript
import {
  schedule,
  renderMode,
  toggleMode,
  type Mode,
} from "plggmatic";

const scheduled = schedule(app);

// the consumer's model = scheduled model + a Mode
type Model = {
  scheduled: ScheduledModel;
  mode: Mode;
};

const view = (model: Model) =>
  renderMode(model.mode)(
    scheduled.scene(model.scheduled),
  );
// a "toggle mode" button dispatches
// toggleMode(model.mode)
```

## Effects stay at the edge

An `async` source read and an `Action`'s verb are
returned by the derived `update` as `Cmd` data — the
same effect model plgg-view's runtime executes (see
[plgg-view](/packages/plgg-view)). In the reference
app the task mutations happen inside the `cmdEffect`
thunks, never in `update`, so the derivation stays
pure and the derived program is testable without a
browser. The design record lives at
`.workaholic/specs/20260704-plggmatic-scheduler-design.md`
in the repository.

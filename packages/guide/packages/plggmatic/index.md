# plggmatic

A **column-oriented UI design framework** on the plgg
family, with two halves that share one vocabulary:

- a **declarative scheduler** — you declare menus, data
  collections, actions, search, and flows as data, and
  `schedule(...)` derives the whole
  [plgg-view](/packages/plgg-view) program except the
  view: the `Model`, the `Msg` union, a pure `update`,
  a total URL codec, and a typed `Scene` a renderer
  draws (see [Declarative scheduler](/packages/plggmatic/scheduler));
- a **design system** — a typed light/dark color scheme
  resolved through `var(--pm-*)` custom properties,
  layout combinators (`row` / `column` / `pane`),
  design tokens for typography, breakpoints, geometry
  and z-index, and fundamental components as pure
  `(props) => Html<Msg>` functions (see
  [Design system](/packages/plggmatic/design-system)).

Styling is data — atoms composed through plgg-view's
`style_`, gathered by `collectCss`. There is no layout
config object and no runtime to boot. Two renderers
project one scheduled `Scene` into different display
modes ([Renderers & forms](/packages/plggmatic/renderers-forms)),
and the runnable reference app is itself a declaration
([plggmatic-example](/packages/plggmatic-example)).

## Writing an app with it

The whole program is a declaration — pure data that
performs nothing — passed through `schedule`, with a
renderer supplying the missing `view`. From the
`plggmatic` README:

```typescript
import {
  schedule,
  declare,
  menu,
  menuEntry,
  collection,
  sync,
  query,
  makeRow,
} from "plggmatic";
import { application } from "plgg-view/client";

// a declaration — pure data, performs nothing
const app = declare({
  title: "Field Notes",
  menu: menu([menuEntry("Sections", "sections")]),
  collections: [
    collection<Section>({
      id: "sections",
      title: "Sections",
      toRow: (s) => makeRow(s.id, s.label),
      source: sync(() => sections),
      child: "notes",
      query: query("Filter"),
    }),
    collection<Note>({
      id: "notes",
      title: "Notes",
      toRow: (n) =>
        makeRow(n.id, n.title, [/*…*/]),
      source: sync((path) => notesFor(path[0])),
    }),
  ],
});

// schedule derives init/update/onUrlChange/toUrl/scene;
// a renderer supplies the missing `view`
const s = schedule(app);
application({
  ...s,
  view: (m) => render(s.scene(m)),
})(document.getElementById("root")!);
```

No `Model`, `Msg`, `update`, or URL codec is written by
hand — they are derived. The reference app's full
declaration lives in
[plggmatic-example](/packages/plggmatic-example).

## Vocabulary

One word per concept, split across the two halves:

- **Declare** — `declare`, `collection`, `menu` /
  `menuEntry`, `makeRow` / `field`, `sync` / `async`
  sources, `query`, `action` with
  confirmation-as-data (`immediate` / `confirm`).
- **Schedule** — `schedule` derives the program;
  `ScheduledModel`, `SchedulerMsg`, the `Scene` /
  `Level` types renderers consume, and the URL codec
  (`parseUrl`, `sceneToUrl`).
- **Render** — `multiColumn`, `singleColumn`,
  `renderMode`, `toggleMode`, and the `Mode` union.
- **Layout** — `row`, `column`, `pane` plus the
  landmark panes `navPane` / `mainPane` / `asidePane`.
- **Component** — `button`, `textLink`, `heading`,
  `prose`, `navTree`, `colHead`, `breadcrumb`,
  `themeToggle`, the form controls, `confirmDialog`,
  and `toast` / `toaster`.
- **Style** (the `plggmatic/style` subpath) — the
  color scheme (`Color`, `Scheme`, `defaultPalette`,
  `asPalette`, `schemeCssOf`, `contrastRatio`), the
  non-color tokens (`typeScale`, `breakpoints`,
  `metrics`, `zBands`), and appearance persistence
  (`appearanceStorageKey`, `decideScheme`,
  `appearanceInitScript`, `applyScheme`).

Each package's source is the source of truth; the root
barrel `packages/plggmatic/src/index.ts` is an explicit
named-export list.

## Why it exists

The scheduler exists because list/detail applications
repeat the same program shape — menus, drill-down
collections, actions with confirmation, filtering, and
URL state. Writing that shape once as a derivation
(decision D1) removes it from every app: the reference
app's hand-written 691-line program became a 263-line
declaration when rewritten
([plggmatic-example](/packages/plggmatic-example)).

The vocabulary is deliberately **mode-agnostic**
(decision D10): no declaration or derived type names a
column, pane, drawer, or screen, so one declaration
serves both display modes and a mode flip mid-flow is
loss-free by construction — same flow position,
selection, query, confirmation, and URL.

The design system is **emergent** — seeded minimal,
one recorded rule per component — and monochrome by
default; a consumer overrides the palette through a
validated seam rather than editing the framework
([Design system](/packages/plggmatic/design-system)).

**Disambiguation** — "plggmatic" has two historical
meanings. (a) A retired app-framework facade, absorbed
into `plggpress/src/framework/`; archived tickets
describe _that_ plggmatic. (b) _This_ package — the UI
design framework, canonical in the monorepo since
decision D13. The package README is the single source
of the distinction.

## How it's organized

- **Declare** / **Schedule** — the declarative
  vocabulary and the derivation
  ([scheduler](/packages/plggmatic/scheduler)).
- **Render** — the two mode renderers
  ([renderers & forms](/packages/plggmatic/renderers-forms)).
- **Layout** / **Component** / **Form** — panes,
  fundamental components, and the caster-parsed form
  machinery.
- **Style** — tokens, palette, appearance; kept on the
  `plggmatic/style` subpath because utility names
  (`p`, `text`, …) would collide with Html element
  builders on the root barrel.

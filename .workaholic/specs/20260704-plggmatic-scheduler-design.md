# plggmatic declarative vocabulary + scheduler — design (ticket 09)

Mandatory design step for `20260704143009`. Types first, validated against
`packages/plggmatic-example/src/app.ts` (the hand-written oracle). Approved at
the night `/drive` gate; implementation follows this doc. Scope held to a
coherent core; nothing split out (the vocabulary already reproduces the oracle
and demonstrates create/delete-with-confirmation).

## 0. Ubiquitous language

One word per concept, used identically in types, specs, README, commit:
**declaration**, **schedule/scheduled**, **collection**, **row**, **menu**,
**action**, **query**, **flow**. A **level** is a position in the drill-down
flow (root menu → a collection's list → a selected row's detail) — a
mode-independent notion of *depth*, NOT a display notion. Renderers (10/11)
project the level stack into columns or a single screen; the vocabulary never
names a column, pane, drawer, or screen (tenet a).

## 1. Projected data — the model speaks in `Row`, never `T`

The oracle's discipline: the `Model` holds only `Option<SoftStr>` selections
(section id, note id), never `Section`/`Note`. Objects are looked up by
accessors closed over the dataset. The scheduler inherits this: typed items
`T` live only at the declaration boundary; the derived model and the renderer
seam speak in `Row` (a presentation-neutral projection).

```ts
export type Field = Readonly<{
  label: SoftStr;
  value: SoftStr;
}>;
export type Row = Readonly<{
  id: SoftStr; // item identity (URL + selection key)
  label: SoftStr; // what a list shows
  fields: ReadonlyArray<Field>; // what a detail shows
}>;
```

`Row` *is* the List/Detail view projection (acceptance #2): `label` is the list
view, `fields` the detail view. A typed `collection<T>` builder captures the
`toRow` projection, so "what the list/detail shows" is declared once, typed,
and erased to `Row` for the scheduler.

## 2. Resource / Collection — one shape, sync OR async (tenet e)

```ts
export type Path = ReadonlyArray<SoftStr>; // ancestor selections, root→parent

export type TypedSource<T> =
  | Box<"Sync", (path: Path) => ReadonlyArray<T>>
  | Box<
      "Async",
      (path: Path) => Promise<Result<ReadonlyArray<T>, Error>>
    >;

// erased (Row-valued), what the scheduler consumes
export type Source =
  | Box<"Sync", (path: Path) => ReadonlyArray<Row>>
  | Box<
      "Async",
      (path: Path) => Promise<Result<ReadonlyArray<Row>, Error>>
    >;

export type Collection = Readonly<{
  id: SoftStr;
  title: SoftStr;
  source: Source; // erased
  child: Option<SoftStr>; // drill-down: id of collection a row reveals
  query: Option<Query>; // optional declarative filter
  actions: ReadonlyArray<Action>; // verbs on this collection
}>;

// typed builder — the ONLY place T appears
export const collection = <T>(c: {
  id: SoftStr;
  title: SoftStr;
  toRow: (item: T) => Row;
  source: TypedSource<T>;
  child?: SoftStr;
  query?: Query;
  actions?: ReadonlyArray<Action>;
}): Collection;
```

`Sync` (in-memory array) and `Async` (a `proc`/Promise-folded-to-`Result`
thunk, `Cmd`-shaped) are the same declaration shape — swapping storage never
rewrites the app (tenet e). Both receive the `Path` of ancestor selections, so
a child collection (notes) filters by its parent selection (the section id)
without the model storing the parent object. The scheduler folds an `Async`
read into a `cmdEffect` (tenet b: effects only as `Cmd` data); it never awaits.

## 3. Menu, Query, Action

```ts
export type MenuEntry = Readonly<{
  label: SoftStr;
  collection: SoftStr; // root collection this entry opens
}>;
export type Menu = Readonly<{
  entries: ReadonlyArray<MenuEntry>;
}>;

export type Query = Readonly<{
  placeholder: SoftStr; // substring filter over Row.label; query text is URL-reflected
}>;

export type Verb = "create" | "update" | "delete";
export type Confirm =
  | Icon<"Immediate">
  | Box<
      "Confirm",
      Readonly<{ prompt: SoftStr; destructive: boolean }>
    >;
export type Action = Readonly<{
  id: SoftStr;
  label: SoftStr;
  verb: Verb;
  confirm: Confirm;
  // run maps the acting row's id (Option — create has none) to an effect.
  run: (target: Option<SoftStr>) => Cmd<SchedulerMsg>;
}>;
```

Confirmation is **data** (tenet: destructive intent explicit; confirm/cancel is
scheduler state, not renderer folklore). `run` produces a `Cmd` — the scheduler
returns it, the plgg-view runtime executes it. A `delete` with `confirm =
Confirm({destructive:true})` parks a `PendingAction` in the model until a
`ConfirmAction`/`CancelAction` message; `Immediate` runs `run` at once.

## 4. Flow & Declaration — the navigation graph

Flow is the drill-down graph, expressed by `Menu` (roots) + each collection's
`child` (the next level). No separate `Flow` type is needed: the graph is the
collections keyed by id plus the menu. The root declaration:

```ts
export type Declaration = Readonly<{
  title: SoftStr;
  menu: Menu;
  collections: ReadonlyArray<Collection>;
}>;
export const declare = (d: Declaration): Declaration;
```

Oracle equivalence (acceptance #1): `menu` has one entry per section? No — the
oracle's root column IS the sections list. So the declaration is:

- `menu`: a single entry `{label:"Sections", collection:"sections"}`.
- collection `sections`: `Sync` over `sections`, `toRow: s => {id:s.id,
  label:s.label, fields:[]}`, `child: some("notes")`.
- collection `notes`: `Sync` `path => sectionById(path[0]).notes`, `toRow: n =>
  {id:n.id, label:n.title, fields:n.body.map(p=>({label:"",value:p}))}`, `child:
  none()`.

Selecting a section pushes the notes list (level 2); selecting a note pushes the
note detail (level 3). The URL `?p=<sectionId>/<noteId>` reflects the selection
path — the derived codec generalises the oracle's `?s=…&n=…` (tenet f).

## 5. Derived Model / Msg (the scheduled program)

```ts
export type Slot =
  | Icon<"Idle">
  | Icon<"Loading">
  | Box<"Loaded", ReadonlyArray<Row>>
  | Box<"Failed", SoftStr>;

export type PendingAction = Readonly<{
  collection: SoftStr;
  action: Action;
  target: Option<SoftStr>;
}>;

export type Model = Readonly<{
  base: SoftStr; // mount path, from the entry URL
  root: Option<SoftStr>; // chosen menu collection (root of the flow)
  path: ReadonlyArray<SoftStr>; // selected row ids, root→leaf
  query: SoftStr; // active query text for the deepest queryable list
  slots: ReadonlyArray<readonly [SoftStr, Slot]>; // collection id → load slot (assoc, Option lookup)
  pending: Option<PendingAction>;
}>;

export type SchedulerMsg =
  | Box<"UrlChanged", Url>
  | Box<"OpenMenu", SoftStr> // collection id
  | Box<"Select", Readonly<{ level: number; id: SoftStr }>>
  | Box<"QueryInput", SoftStr>
  | Box<"RequestAction", Readonly<{ collection: SoftStr; action: SoftStr; target: Option<SoftStr> }>>
  | Icon<"ConfirmAction">
  | Icon<"CancelAction">
  | Box<"Loaded", Readonly<{ collection: SoftStr; rows: ReadonlyArray<Row> }>>
  | Box<"Failed", Readonly<{ collection: SoftStr; error: SoftStr }>>;
```

`update: (msg, model) => [Model, Cmd<SchedulerMsg>]` — pure, pair-shaped, no
`window`/`document`, executes nothing (tenet b/c). `Async` collection reads,
and each `Action.run`, are returned as `Cmd`s; specs assert them inert.

- `slots` is an assoc list, not a `Dict` — `Dict` values must be `Datum` and a
  `Slot` union is not `Datum`; lookup returns `Option` via a small helper (no
  `noUncheckedIndexedAccess` dead branch — split+destructure, per
  `reference_coverage_proc_vs_iserr`).

## 6. URL codec (total, both directions — tenet f)

```ts
toUrl(model): Url = makeUrl(
  base,
  root=None ? "" : "?c=<root>" + path.map(encode).join("/") folded to "&p=…" + query,
);
onUrlChange(url): SchedulerMsg = UrlChanged(url);
// parseUrl folds a Url into {root, path, query}; unknown ids truncate the
// path (a URL is user input), junk yields a valid slice — never throws.
```

Concretely: `?c=sections&p=<sid>/<nid>&q=<text>`. `parseUrl` validates each id
against the loaded/known rows where possible and truncates on the first miss,
exactly the oracle's "unknown id truncates the stack". Round-trip: `model →
toUrl → parseUrl` reflects the same `{root,path,query}` slice; arbitrary search
strings never crash (spec-proven).

Mode-specific presentation state stays OUT (tenet g): the model carries only
`root`, `path`, `query`, `pending` — all mode-independent truth. "Which single
screen is focused" (single-column) is *derived* from `path.length`; "is the
drawer open" is renderer-local state in ticket 11. Nothing column/screen enters
the scheduled model.

## 7. Renderer seam — `Scene` (typed, mode-agnostic)

`schedule(...)` also exposes `scene(model): Scene`, the typed value renderers
10/11 consume. It is the drill-down stack projected to presentation-neutral
data:

```ts
export type ConfirmPrompt = Readonly<{
  prompt: SoftStr;
  destructive: boolean;
}>;
export type ActionButton = Readonly<{
  id: SoftStr;
  label: SoftStr;
  destructive: boolean;
}>;
export type Level =
  | Box<"MenuLevel", Readonly<{ title: SoftStr; entries: ReadonlyArray<Readonly<{ label: SoftStr; href: SoftStr; active: boolean }>> }>>
  | Box<"ListLevel", Readonly<{ collection: SoftStr; title: SoftStr; back: Option<SoftStr>; query: Option<Readonly<{ placeholder: SoftStr; text: SoftStr }>>; rows: ReadonlyArray<Readonly<{ row: Row; href: SoftStr; active: boolean }>>; loading: boolean; error: Option<SoftStr>; actions: ReadonlyArray<ActionButton> }>>
  | Box<"DetailLevel", Readonly<{ collection: SoftStr; title: SoftStr; back: Option<SoftStr>; row: Option<Row>; actions: ReadonlyArray<ActionButton> }>>;
export type Scene = Readonly<{
  title: SoftStr;
  levels: ReadonlyArray<Level>;
  confirm: Option<ConfirmPrompt>;
}>;
```

Renderers exhaustively `match` the `Level` union — a new level kind is a
compile error at every renderer (acceptance #2). `href`s are the truncating/
drilling URLs (navigation, not a mode switch — the oracle's "leaving a column
is a link"). The seam carries declared semantics (titles, back links,
destructive flags, active markers) so 10/11 emit real landmarks, labels, and
confirm dialogs without inventing meaning (accessibility policy).

## 8. `schedule` signature

```ts
export type Scheduled<Msg> = Readonly<{
  init: (url: Url) => readonly [Model, Cmd<Msg>];
  update: (msg: Msg, model: Model) => readonly [Model, Cmd<Msg>];
  onUrlChange: (url: Url) => Msg;
  toUrl: (model: Model) => Url;
  historyMode: (prev: Model, next: Model) => "push" | "replace" | "none";
  scene: (model: Model) => Scene;
}>;
export const schedule = (
  d: Declaration,
): Scheduled<SchedulerMsg>;
```

`Scheduled` satisfies plgg-view's `Application<Model, SchedulerMsg>` minus
`view`, plus `scene`. A renderer `r: (scene: Scene) => Html<SchedulerMsg>`
completes it: `{...scheduled, view: (m) => r(scheduled.scene(m))}`. init issues
the root collection's load `Cmd` when it is `Async`.

## 9. Tenet checklist

- (a) D10 audit — no `column`/`pane`/`drawer`/`screen` in any Declare/Schedule
  type; no import from `plggmatic/Layout`. `Level`/`levels`/`Scene` are depth,
  not display. Enforced by the acceptance grep.
- (b) effects only as `Cmd` data — `Async.source` and `Action.run` return
  `Cmd`; `update` returns them; specs assert nothing runs.
- (c) closed unions + exhaustive `match` — `Source`, `Confirm`, `Slot`,
  `SchedulerMsg`, `Level`; adding a variant breaks `tsc` at every site.
- (d) Option/Result, no null/undefined — selections/queries/pending are
  `Option`; async reads are `Result`.
- (e) sync & async through one shape — `TypedSource<T>` / `collection`.
- (f) URL codec total both directions — `toUrl`/`parseUrl`, junk-safe,
  round-tripping.
- (g) mode-specific state stays out — model = root/path/query/pending only;
  focused-screen derived from `path.length`; drawer is renderer-local (11).

## 10. What the vocabulary cannot express yet (honest deferral)

- **Arbitrary flow graphs** (a level reachable from two parents, cross-links):
  the drill-down is a single-parent tree (menu→collection→child→…). Sufficient
  for the oracle and phases 5–6; a general graph is a later ticket if a real
  consumer needs it.
- **Multi-field forms / validation UI**: `Action.run` is an opaque `Cmd`
  factory here; the form *controls* that assemble an action's payload are
  **ticket 12** (action/form components). This ticket proves the action
  *lifecycle* (request → confirm/cancel → effect), not form rendering.
- **Per-field detail typing** (images, dates as data): `Field.value` is
  `SoftStr`; richer field kinds arrive with a consumer (media = ticket 23).
- **Optimistic mutation of `Sync` collections**: the demo's in-memory mutable
  collection re-reads its source after an action's `Loaded`; a general
  optimistic-update protocol is deferred (revisit: ticket 20 admin-ui).

These are recorded, not built — scope stays at the reviewed core.

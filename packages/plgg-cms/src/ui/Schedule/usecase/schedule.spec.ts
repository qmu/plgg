import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import {
  type SoftStr,
  some,
  none,
  ok,
  isSome,
  isNone,
  getOr,
  match,
} from "plgg";
import {
  type Cmd,
  cmdEffect,
  cmdEffect$,
  cmdBatch$,
  makeUrl,
} from "plgg-view/client";
import { row, field } from "plgg-cms/ui/Declare/model/Row";
import {
  sync,
  async,
  dynamic,
} from "plgg-cms/ui/Declare/model/Source";
import { query } from "plgg-cms/ui/Declare/model/Query";
import {
  action,
  confirm,
} from "plgg-cms/ui/Declare/model/Action";
import { collection } from "plgg-cms/ui/Declare/model/Collection";
import {
  menu,
  menuEntry,
} from "plgg-cms/ui/Declare/model/Menu";
import { declare } from "plgg-cms/ui/Declare/model/Declaration";
import {
  type Model,
  slotOf,
  loadedSlot$,
  loading$,
  idle$,
} from "plgg-cms/ui/Schedule/model/Model";
import {
  type SchedulerMsg,
  openMenu,
  select,
  queryInput,
  requestAction,
  confirmAction,
  cancelAction,
  loaded,
  failed,
  urlChanged,
} from "plgg-cms/ui/Schedule/model/Msg";
import {
  menuLevel$,
  listLevel$,
  detailLevel$,
} from "plgg-cms/ui/Schedule/model/Scene";
import { schedule } from "plgg-cms/ui/Schedule/usecase/schedule";

// --- fixture: sections → notes drill-down, a queryable
// sections list, a destructive note action, and an async
// todos collection (the sync/async symmetry proof).

type Sec = Readonly<{ id: SoftStr; label: SoftStr }>;
type Nt = Readonly<{
  id: SoftStr;
  sec: SoftStr;
  title: SoftStr;
  body: SoftStr;
}>;

const secs: ReadonlyArray<Sec> = [
  { id: "a", label: "Alpha" },
  { id: "b", label: "Beta" },
];
const notes: ReadonlyArray<Nt> = [
  { id: "n1", sec: "a", title: "One", body: "first" },
  { id: "n2", sec: "a", title: "Two", body: "second" },
  { id: "n3", sec: "b", title: "Three", body: "third" },
];
const todos: ReadonlyArray<
  Readonly<{ id: SoftStr; label: SoftStr }>
> = [{ id: "t1", label: "Milk" }];

const decl = declare({
  title: "Demo",
  menu: menu([
    menuEntry("Sections", "sections"),
    menuEntry("Todos", "todos"),
  ]),
  collections: [
    collection<Sec>({
      id: "sections",
      title: "Sections",
      toRow: (s: Sec) => row(s.id, s.label),
      source: sync(() => secs),
      child: "notes",
      query: query("Filter"),
    }),
    collection<Nt>({
      id: "notes",
      title: "Notes",
      toRow: (n: Nt) =>
        row(n.id, n.title, [field("", n.body)]),
      source: sync((path) =>
        notes.filter(
          (n: Nt) => n.sec === path[0],
        ),
      ),
      actions: [
        action({
          id: "del",
          label: "Delete",
          verb: "delete",
          confirm: confirm("Delete note?", true),
          run: () =>
            cmdEffect(() =>
              Promise.resolve(loaded("notes", [])),
            ),
        }),
      ],
    }),
    collection<
      Readonly<{ id: SoftStr; label: SoftStr }>
    >({
      id: "todos",
      title: "Todos",
      toRow: (t) => row(t.id, t.label),
      source: async(() =>
        Promise.resolve(ok(todos)),
      ),
    }),
  ],
});

const s = schedule(decl);
const url0 = makeUrl("/app", "");
const [m0] = s.init(url0);

// helper: run update and take the next model
const step = (
  msg: SchedulerMsg,
  model: Model,
): Model => s.update(msg, model)[0];
const cmdOf = (
  msg: SchedulerMsg,
  model: Model,
): Cmd<SchedulerMsg> => s.update(msg, model)[1];

test("init seeds an empty model at the entry base", () =>
  all([
    check(m0.base, toBe("/app")),
    check(isNone(m0.root), toBe(true)),
    check(m0.path.length, toBe(0)),
  ]));

test("opening a sync menu entry loads its list synchronously", () => {
  const m1 = step(openMenu("sections"), m0);
  return all([
    check(
      getOr("")(m1.root),
      toBe("sections"),
    ),
    check(
      match(slotOf(m1, "sections"))(
        [loadedSlot$(), ({ content }) => content.length],
        [loading$(), () => -1],
      ),
      toBe(2),
    ),
  ]);
});

test("opening an async menu entry parks Loading and returns an effect", () => {
  const m1 = step(openMenu("todos"), m0);
  const cmd = cmdOf(openMenu("todos"), m0);
  return all([
    check(
      match(slotOf(m1, "todos"))(
        [loading$(), () => true],
        [loadedSlot$(), () => false],
      ),
      toBe(true),
    ),
    // the effect is inert data (a batch of one effect)
    check(
      match(cmd)(
        [cmdBatch$(), () => true],
        [cmdEffect$(), () => false],
      ),
      toBe(true),
    ),
  ]);
});

test("a Loaded message fills an async slot", () => {
  const m1 = step(openMenu("todos"), m0);
  const m2 = step(
    loaded(
      "todos",
      todos.map((t) => row(t.id, t.label)),
    ),
    m1,
  );
  return check(
    match(slotOf(m2, "todos"))(
      [loadedSlot$(), ({ content }) => content.length],
      [loading$(), () => -1],
    ),
    toBe(1),
  );
});

test("selecting a section drills to the notes list filtered by the section", () => {
  const m1 = step(openMenu("sections"), m0);
  const m2 = step(select(0, "a"), m1);
  return all([
    check(m2.path.length, toBe(1)),
    check(getOr("")(m2.root), toBe("sections")),
    check(
      match(slotOf(m2, "notes"))(
        [loadedSlot$(), ({ content }) => content.length],
        [loading$(), () => -1],
      ),
      toBe(2),
    ),
  ]);
});

test("selecting a note reveals a detail level (notes has no child)", () => {
  const m2 = step(
    select(0, "a"),
    step(openMenu("sections"), m0),
  );
  const m3 = step(select(1, "n1"), m2);
  const scene = s.scene(m3);
  const kinds = scene.levels.map((l) =>
    match(l)(
      [menuLevel$(), () => "menu"],
      [listLevel$(), () => "list"],
      [detailLevel$(), () => "detail"],
    ),
  );
  return all([
    check(m3.path.length, toBe(2)),
    check(
      kinds,
      toEqual(["menu", "list", "list", "detail"]),
    ),
  ]);
});

test("the query filters the active list and reflects into the model", () => {
  const m1 = step(openMenu("sections"), m0);
  const m2 = step(queryInput("Alph"), m1);
  const scene = s.scene(m2);
  const sectionsList = scene.levels.find((l) =>
    match(l)(
      [listLevel$(), () => true],
      [menuLevel$(), () => false],
      [detailLevel$(), () => false],
    ),
  );
  return all([
    check(m2.query, toBe("Alph")),
    check(
      sectionsList === undefined
        ? -1
        : match(sectionsList)(
            [
              listLevel$(),
              ({ content }) => content.rows.length,
            ],
            [menuLevel$(), () => -1],
            [detailLevel$(), () => -1],
          ),
      toBe(1),
    ),
  ]);
});

test("a destructive action parks a confirmation, and cancel clears it", () => {
  const m3 = step(
    select(1, "n1"),
    step(
      select(0, "a"),
      step(openMenu("sections"), m0),
    ),
  );
  const parked = step(
    requestAction("notes", "del", some("n1")),
    m3,
  );
  const cancelled = step(cancelAction(), parked);
  return all([
    check(isSome(parked.pending), toBe(true)),
    check(
      isSome(s.scene(parked).confirm),
      toBe(true),
    ),
    check(isNone(cancelled.pending), toBe(true)),
  ]);
});

test("confirming a parked action returns its effect and clears pending", () => {
  const m3 = step(
    select(1, "n1"),
    step(
      select(0, "a"),
      step(openMenu("sections"), m0),
    ),
  );
  const parked = step(
    requestAction("notes", "del", some("n1")),
    m3,
  );
  const cmd = cmdOf(confirmAction(), parked);
  const confirmed = step(confirmAction(), parked);
  return all([
    check(isNone(confirmed.pending), toBe(true)),
    check(
      match(cmd)(
        [cmdEffect$(), () => true],
        [cmdBatch$(), () => false],
      ),
      toBe(true),
    ),
  ]);
});

test("an unknown action request is a no-op", () => {
  const m1 = step(openMenu("sections"), m0);
  const same = step(
    requestAction("nope", "nope", none()),
    m1,
  );
  return check(
    isNone(same.pending),
    toBe(true),
  );
});

test("confirming with nothing parked is a no-op", () => {
  const same = step(confirmAction(), m0);
  return check(same.path.length, toBe(0));
});

test("the URL round-trips a drilled, queried position", () => {
  const m3 = step(
    select(1, "n1"),
    step(
      select(0, "a"),
      step(openMenu("sections"), m0),
    ),
  );
  const url = s.toUrl(m3);
  const back = step(
    urlChanged(url),
    step(openMenu("sections"), m0),
  );
  return all([
    check(getOr("")(back.root), toBe("sections")),
    check(back.path, toEqual(["a", "n1"])),
    check(
      s.toUrl(back).search,
      toBe(url.search),
    ),
  ]);
});

test("junk in the URL never crashes the codec", () => {
  const junk = makeUrl(
    "/app",
    "?c=ghost&p=%2F%2F//&q=&x=1",
  );
  const m1 = step(urlChanged(junk), m0);
  return check(getOr("")(m1.root), toBe("ghost"));
});

test("historyMode pushes a navigation and replaces a query change", () => {
  const m1 = step(openMenu("sections"), m0);
  const m2 = step(select(0, "a"), m1);
  const mq = step(queryInput("x"), m1);
  return all([
    check(s.historyMode(m1, m2), toBe("push")),
    check(s.historyMode(m1, mq), toBe("replace")),
  ]);
});

test("a menu entry is marked active once opened", () => {
  const m1 = step(openMenu("sections"), m0);
  const menuLvl = s.scene(m1).levels[0];
  return check(
    menuLvl === undefined
      ? false
      : match(menuLvl)(
          [
            menuLevel$(),
            ({ content }) =>
              content.entries.some(
                (e) =>
                  e.label === "Sections" &&
                  e.active,
              ),
          ],
          [listLevel$(), () => false],
          [detailLevel$(), () => false],
        ),
    toBe(true),
  );
});

test("a top-level list scene can close back to menu-only", () => {
  const m1 = step(openMenu("sections"), m0);
  const listLvl = s.scene(m1).levels[1];
  return check(
    listLvl === undefined
      ? ""
      : match(listLvl)(
          [menuLevel$(), () => ""],
          [
            listLevel$(),
            ({ content }) =>
              getOr("")(content.back),
          ],
          [detailLevel$(), () => ""],
        ),
    toBe("/app"),
  );
});

test("init from a URL pre-drills the flow position", () => {
  const [m] = s.init(
    makeUrl("/app", "?c=sections&p=a"),
  );
  return all([
    check(getOr("")(m.root), toBe("sections")),
    check(m.path, toEqual(["a"])),
    // the notes list is loaded for section a
    check(
      match(slotOf(m, "notes"))(
        [loadedSlot$(), ({ content }) => content.length],
        [loading$(), () => -1],
      ),
      toBe(2),
    ),
  ]);
});

test("a Failed message parks a failed slot the scene surfaces", () => {
  const m1 = step(openMenu("todos"), m0);
  const failedModel = step(
    failed("todos", "boom"),
    m1,
  );
  const todosList = s
    .scene(failedModel)
    .levels.find((l) =>
      match(l)(
        [listLevel$(), () => true],
        [menuLevel$(), () => false],
        [detailLevel$(), () => false],
      ),
    );
  return check(
    todosList === undefined
      ? false
      : match(todosList)(
          [
            listLevel$(),
            ({ content }) => isSome(content.error),
          ],
          [menuLevel$(), () => false],
          [detailLevel$(), () => false],
        ),
    toBe(true),
  );
});

// --- dynamic (Model-driven) source: consumer-OWNED rows,
// supplied via `withRows` and preserved across navigation,
// so a consumer's `update` needs no module-global store
// (ticket 20260708192518). An isolated fixture keeps the
// shared `decl` tests above untouched.
type Widget = Readonly<{
  id: SoftStr;
  label: SoftStr;
}>;
const dynDecl = declare({
  title: "Dyn",
  menu: menu([menuEntry("Widgets", "widgets")]),
  collections: [
    collection<Widget>({
      id: "widgets",
      title: "Widgets",
      toRow: (w: Widget) => row(w.id, w.label),
      source: dynamic<Widget>(),
    }),
  ],
});
const ds = schedule(dynDecl);
const [dm0] = ds.init(makeUrl("/app", ""));

test("a dynamic collection's slot is idle until the consumer supplies its rows", () =>
  check(
    match(slotOf(dm0, "widgets"))(
      [idle$(), () => "idle"],
      [loadedSlot$(), () => "loaded"],
      [loading$(), () => "loading"],
    ),
    toBe("idle"),
  ));

test("withRows sets a dynamic slot and navigation PRESERVES it (Model-driven, no store)", () => {
  const seeded = ds.withRows(dm0, "widgets", [
    row("w1", "One"),
    row("w2", "Two"),
  ]);
  // Navigate: opening the widgets menu re-reads the chain.
  // The dynamic source must KEEP the consumer-set rows, not
  // wipe them — the whole point of the variant.
  const opened = step(
    openMenu("widgets"),
    seeded,
  );
  return all([
    check(
      match(slotOf(seeded, "widgets"))(
        [
          loadedSlot$(),
          ({ content }) => content.length,
        ],
        [idle$(), () => -1],
      ),
      toBe(2),
    ),
    check(
      match(slotOf(opened, "widgets"))(
        [
          loadedSlot$(),
          ({ content }) => content.length,
        ],
        [loading$(), () => -1],
        [idle$(), () => -2],
      ),
      toBe(2),
    ),
  ]);
});

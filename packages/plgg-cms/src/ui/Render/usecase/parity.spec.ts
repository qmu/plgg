import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type SoftStr,
  some,
} from "plgg";
import { renderToString } from "plgg-view";
import { makeUrl } from "plgg-view/client";
import { cmdEffect } from "plgg-view/client";
import { row, field } from "plgg-cms/ui/Declare/model/Row";
import { sync } from "plgg-cms/ui/Declare/model/Source";
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
  type SchedulerMsg,
  openMenu,
  select,
  queryInput,
  requestAction,
  loaded,
} from "plgg-cms/ui/Schedule/model/Msg";
import { type Model } from "plgg-cms/ui/Schedule/model/Model";
import { schedule } from "plgg-cms/ui/Schedule/usecase/schedule";
import { multiColumn } from "plgg-cms/ui/Render/usecase/multiColumn";
import { singleColumn } from "plgg-cms/ui/Render/usecase/singleColumn";

type Sec = Readonly<{ id: SoftStr; label: SoftStr }>;
type Nt = Readonly<{
  id: SoftStr;
  sec: SoftStr;
  title: SoftStr;
  body: SoftStr;
}>;
const notes: ReadonlyArray<Nt> = [
  {
    id: "n1",
    sec: "a",
    title: "One",
    body: "body one",
  },
];
const decl = declare({
  title: "Demo",
  menu: menu([menuEntry("Sections", "sections")]),
  collections: [
    collection<Sec>({
      id: "sections",
      title: "Sections",
      toRow: (s: Sec) => row(s.id, s.label),
      source: sync(() => [
        { id: "a", label: "Alpha" },
      ]),
      child: "notes",
      query: query("Filter"),
    }),
    collection<Nt>({
      id: "notes",
      title: "Notes",
      toRow: (n: Nt) =>
        row(n.id, n.title, [field("", n.body)]),
      source: sync((path) =>
        notes.filter((n: Nt) => n.sec === path[0]),
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
  ],
});
const s = schedule(decl);
const [m0] = s.init(makeUrl("/", ""));

const drive = (
  msgs: ReadonlyArray<SchedulerMsg>,
): Model =>
  msgs.reduce(
    (m: Model, msg: SchedulerMsg) =>
      s.update(msg, m)[0],
    m0,
  );

// the scripted walk: menu → list → detail → query →
// destructive request. Each entry is a model along the way.
const walk: ReadonlyArray<Model> = [
  m0,
  drive([openMenu("sections")]),
  drive([openMenu("sections"), select(0, "a")]),
  drive([
    openMenu("sections"),
    select(0, "a"),
    select(1, "n1"),
  ]),
  drive([openMenu("sections"), queryInput("Al")]),
  drive([
    openMenu("sections"),
    select(0, "a"),
    select(1, "n1"),
    requestAction("notes", "del", some("n1")),
  ]),
];

test("both renderers project every step without crashing", () =>
  check(
    walk.every((m: Model) => {
      const multi = renderToString(
        multiColumn(s.scene(m)),
      );
      const single = renderToString(
        singleColumn(s.scene(m)),
      );
      return (
        multi.length > 0 && single.length > 0
      );
    }),
    toBe(true),
  ));

test("the URL is byte-identical regardless of which mode is on screen", () =>
  check(
    walk.every((m: Model) => {
      // rendering is a pure projection: neither renderer
      // touches the model, so toUrl is unchanged across a
      // mode flip (the loss-free-switch invariant).
      const before = s.toUrl(m);
      renderToString(multiColumn(s.scene(m)));
      renderToString(singleColumn(s.scene(m)));
      const after = s.toUrl(m);
      return (
        before.path === after.path &&
        before.search === after.search
      );
    }),
    toBe(true),
  ));

test("the current position (deepest title) is reachable in both modes", () => {
  const detail = s.scene(
    drive([
      openMenu("sections"),
      select(0, "a"),
      select(1, "n1"),
    ]),
  );
  return all([
    check(
      renderToString(
        multiColumn(detail),
      ).includes("One"),
      toBe(true),
    ),
    check(
      renderToString(
        singleColumn(detail),
      ).includes("One"),
      toBe(true),
    ),
  ]);
});

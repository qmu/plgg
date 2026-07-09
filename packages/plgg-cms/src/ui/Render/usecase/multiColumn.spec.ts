import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { type SoftStr, none, some } from "plgg";
import {
  renderToString,
  slot,
  text,
} from "plgg-view";
import { makeUrl } from "plgg-view/client";
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
  openMenu,
  select,
  queryInput,
  requestAction,
} from "plgg-cms/ui/Schedule/model/Msg";
import { schedule } from "plgg-cms/ui/Schedule/usecase/schedule";
import {
  multiColumn,
  multiColumnWith,
} from "plgg-cms/ui/Render/usecase/multiColumn";
import { cmdEffect } from "plgg-view/client";
import { loaded } from "plgg-cms/ui/Schedule/model/Msg";

type Sec = Readonly<{ id: SoftStr; label: SoftStr }>;
type Nt = Readonly<{
  id: SoftStr;
  sec: SoftStr;
  title: SoftStr;
  body: SoftStr;
}>;

const secs: ReadonlyArray<Sec> = [
  { id: "a", label: "Alpha" },
];
const notes: ReadonlyArray<Nt> = [
  {
    id: "n1",
    sec: "a",
    title: "One",
    body: "the body of one",
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
const [m0] = s.init(makeUrl("/app", ""));
const at = (
  ...msgs: ReadonlyArray<
    ReturnType<typeof openMenu>
  >
) =>
  msgs.reduce(
    (m, msg) => s.update(msg, m)[0],
    m0,
  );

test("the root scene renders the menu as a navigation landmark", () => {
  const html = renderToString(
    multiColumn(s.scene(m0)),
  );
  return all([
    check(html.includes("<nav"), toBe(true)),
    check(html.includes("Sections"), toBe(true)),
    check(html.includes("pm-row"), toBe(true)),
  ]);
});

test("opening a collection adds a complementary list column", () => {
  const html = renderToString(
    multiColumn(s.scene(at(openMenu("sections")))),
  );
  return all([
    check(html.includes("<aside"), toBe(true)),
    check(html.includes("Alpha"), toBe(true)),
    check(html.includes("pm-close"), toBe(true)),
    check(
      html.includes('href="/app"'),
      toBe(true),
    ),
    // the list column's query box is present
    check(
      html.includes("pm-query"),
      toBe(true),
    ),
  ]);
});

test("drilling to a note adds the main detail column with its body and action", () => {
  const html = renderToString(
    multiColumn(
      s.scene(
        at(openMenu("sections"), select(0, "a"), select(1, "n1")),
      ),
    ),
  );
  return all([
    check(html.includes("<main"), toBe(true)),
    check(
      html.includes("the body of one"),
      toBe(true),
    ),
    // the detail carries the destructive action button
    check(html.includes("Delete"), toBe(true)),
  ]);
});

test("a selected row is marked aria-current", () => {
  const html = renderToString(
    multiColumn(
      s.scene(at(openMenu("sections"), select(0, "a"))),
    ),
  );
  return check(
    html.includes('aria-current="page"'),
    toBe(true),
  );
});

test("pushed columns carry a truncating close link and a breadcrumb trail", () => {
  const html = renderToString(
    multiColumn(
      s.scene(at(openMenu("sections"), select(0, "a"))),
    ),
  );
  return all([
    // colHead close link back to the sections-only URL
    check(html.includes("pm-close"), toBe(true)),
    check(
      html.includes('aria-label="Breadcrumb"'),
      toBe(true),
    ),
    check(
      html.includes("pm-crumb-here"),
      toBe(true),
    ),
  ]);
});

test("multiColumnWith can omit the internal breadcrumb", () => {
  const html = renderToString(
    multiColumnWith(
      s.scene(at(openMenu("sections"), select(0, "a"))),
      {
        mapMsg: (msg) => msg,
        omitBreadcrumb: true,
      },
    ),
  );
  return check(
    html.includes('aria-label="Breadcrumb"'),
    toBe(false),
  );
});

test("a parked confirmation renders a modal dialog overlay", () => {
  const parked = at(
    openMenu("sections"),
    select(0, "a"),
    select(1, "n1"),
    requestAction("notes", "del", some("n1")),
  );
  const html = renderToString(
    multiColumn(s.scene(parked)),
  );
  return all([
    check(
      html.includes('role="dialog"'),
      toBe(true),
    ),
    check(
      html.includes("Delete note?"),
      toBe(true),
    ),
    check(html.includes(">Cancel<"), toBe(true)),
  ]);
});

test("the query input reflects the model's query text", () => {
  const html = renderToString(
    multiColumn(
      s.scene(
        at(openMenu("sections"), queryInput("Alp")),
      ),
    ),
  );
  return check(
    html.includes('value="Alp"'),
    toBe(true),
  );
});

test("multiColumnWith accepts app-owned header links and extra columns", () => {
  const html = renderToString(
    multiColumnWith(
      s.scene(at(openMenu("sections"))),
      {
        mapMsg: (msg) => msg,
        headerLinks: [
          {
            collection: "sections",
            label: "Add section",
            href: "/app?c=sections&add=section",
          },
          {
            collection: "sections",
            label: "Import",
            href: "/app?c=sections&import=1",
            active: true,
          },
        ],
        afterMenu: [
          {
            key: "section-submenu",
            title: "Section",
            close: none(),
            body: [
              slot([], [
                text("Section submenu"),
              ]),
            ],
          },
        ],
        extraColumns: [
          {
            key: "section-form",
            title: "Add section",
            close: none(),
            body: [
              slot([], [
                text("App-owned form body"),
              ]),
            ],
          },
        ],
      },
    ),
  );
  return all([
    check(
      html.includes("pm-list-action"),
      toBe(true),
    ),
    check(
      html.includes("Section submenu"),
      toBe(true),
    ),
    check(
      html.includes(">Add section<"),
      toBe(true),
    ),
    check(
      html.includes(">Import<"),
      toBe(true),
    ),
    check(
      html.includes("App-owned form body"),
      toBe(true),
    ),
  ]);
});

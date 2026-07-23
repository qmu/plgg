import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { type SoftStr } from "plgg";
import { renderToString } from "plgg-view";
import { makeUrl } from "plgg-view/client";
import { row } from "plgg-cms/ui/Declare/model/Row";
import { sync } from "plgg-cms/ui/Declare/model/Source";
import { collection } from "plgg-cms/ui/Declare/model/Collection";
import {
  menu,
  menuEntry,
} from "plgg-cms/ui/Declare/model/Menu";
import { declare } from "plgg-cms/ui/Declare/model/Declaration";
import { openMenu } from "plgg-cms/ui/Schedule/model/Msg";
import { schedule } from "plgg-cms/ui/Schedule/usecase/schedule";
import { renderMode } from "plgg-cms/ui/Render/usecase/renderMode";
import { multiColumn } from "plgg-cms/ui/Render/usecase/multiColumn";
import { singleColumn } from "plgg-cms/ui/Render/usecase/singleColumn";

type Sec = Readonly<{ id: SoftStr; label: SoftStr }>;
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
    }),
  ],
});
const s = schedule(decl);
const scene = s.scene(
  s.update(
    openMenu("sections"),
    s.init(makeUrl("/", ""))[0],
  )[0],
);

test("the dispatcher routes each mode to its renderer", () =>
  all([
    check(
      renderToString(
        renderMode("multiColumn")(scene),
      ),
      toBe(renderToString(multiColumn(scene))),
    ),
    check(
      renderToString(
        renderMode("singleColumn")(scene),
      ),
      toBe(renderToString(singleColumn(scene))),
    ),
  ]));

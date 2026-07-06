// Twin of the Multi-column renderer page's code fence. A
// plggmatic DECLARATION is scheduled into a TEA program,
// and `multiColumn` projects the derived `Scene` into the
// panes-expanding-rightward arrangement — the geometry the
// framework now owns (ticket 10), not the consumer.
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

type Section = Readonly<{
  id: string;
  label: string;
}>;

const sections: ReadonlyArray<Section> = [
  { id: "botany", label: "Botany" },
  { id: "geology", label: "Geology" },
];

const app = declare({
  title: "Field Notes",
  menu: menu([menuEntry("Sections", "sections")]),
  collections: [
    collection<Section>({
      id: "sections",
      title: "Sections",
      toRow: (s: Section) =>
        makeRow(s.id, s.label),
      source: sync(() => sections),
    }),
  ],
});

const scheduled = schedule(app);
const [model] = scheduled.init(
  makeUrl("/", "?c=sections"),
);

// A complete plgg-view view — no hand-written Model, Msg,
// update, or URL codec, and no column/pane geometry in
// the app.
export const view = multiColumn(
  scheduled.scene(model),
);

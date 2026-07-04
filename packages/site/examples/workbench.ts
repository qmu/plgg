// Twin of the workbench page's code fence: the reference
// app is now a DECLARATION scheduled into a program, drawn
// by the multi-column renderer — no hand-written Model,
// Msg, update, URL codec, or column stack.
import {
  type ScheduledModel,
  schedule,
  declare,
  menu,
  menuEntry,
  collection,
  sync,
  query,
  makeRow,
  field,
  multiColumn,
} from "plggmatic";

type Section = Readonly<{
  id: string;
  label: string;
}>;
type Note = Readonly<{
  id: string;
  section: string;
  title: string;
  body: string;
}>;

declare const sections: ReadonlyArray<Section>;
declare const notes: ReadonlyArray<Note>;

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
      toRow: (n) =>
        makeRow(n.id, n.title, [
          field("", n.body),
        ]),
      source: sync((path) =>
        notes.filter(
          (n) => n.section === path[0],
        ),
      ),
    }),
  ],
});

const scheduled = schedule(workbench);

// the whole program: schedule + a renderer supply `view`
export const view = (model: ScheduledModel) =>
  multiColumn(scheduled.scene(model));

import {
  type SoftStr,
  fromNullable,
  matchOption,
  pipe,
} from "plgg";
import { cmdEffect } from "plgg-view/client";
import {
  type Declaration,
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
import {
  type Section,
  type Note,
  sections,
} from "../data.ts";

/**
 * The declaration the scheduler demo drives — the whole
 * program as data. A sections→notes drill-down (read-only
 * from `data.ts`, reproducing the hand-written oracle's
 * traversal) PLUS a small in-memory mutable `tasks`
 * collection so create and delete-with-confirmation are
 * demonstrable (the one mutable seam ticket 09 sanctions
 * for the demo). No column/pane/screen notion appears —
 * the crude renderer projects the derived levels.
 */

type Task = Readonly<{
  id: SoftStr;
  label: SoftStr;
}>;

// The one mutable seam (demo-only): a task list the create
// and delete verbs edit. Mutation happens INSIDE the
// effect thunks below (runtime-executed), never in
// `update`, so the derivation stays pure.
let tasks: ReadonlyArray<Task> = [
  {
    id: "t1",
    label: "Re-survey the moss mat after rain",
  },
  {
    id: "t2",
    label: "Photograph the erratic at golden hour",
  },
];
let counter = 0;

const notesOf = (
  path: ReadonlyArray<SoftStr>,
): ReadonlyArray<Note> =>
  pipe(
    fromNullable(path[0]),
    matchOption<SoftStr, ReadonlyArray<Note>>(
      () => [],
      (secId: SoftStr) =>
        pipe(
          fromNullable(
            sections.find(
              (s: Section) => s.id === secId,
            ),
          ),
          matchOption<
            Section,
            ReadonlyArray<Note>
          >(
            () => [],
            (sec: Section) => sec.notes,
          ),
        ),
    ),
  );

export const declaration: Declaration = declare({
  title: "Field Notes — scheduled",
  menu: menu([
    menuEntry("Notes", "sections"),
    menuEntry("Tasks", "tasks"),
  ]),
  collections: [
    collection<Section>({
      id: "sections",
      title: "Sections",
      toRow: (s: Section) =>
        makeRow(s.id, s.label),
      source: sync(() => sections),
      child: "notes",
      query: query("Filter sections"),
    }),
    collection<Note>({
      id: "notes",
      title: "Notes",
      toRow: (n: Note) =>
        makeRow(
          n.id,
          n.title,
          n.body.map((p: SoftStr) =>
            field("", p),
          ),
        ),
      source: sync(notesOf),
    }),
    collection<Task>({
      id: "tasks",
      title: "Tasks",
      toRow: (t: Task) => makeRow(t.id, t.label),
      source: sync(() => tasks),
      query: query("Filter tasks"),
      actions: [
        action({
          id: "add",
          label: "Add task",
          verb: "create",
          confirm: immediate(),
          run: () =>
            cmdEffect(() => {
              counter = counter + 1;
              tasks = [
                ...tasks,
                {
                  id: `t-new-${counter}`,
                  label: `New task ${counter}`,
                },
              ];
              return Promise.resolve(
                loaded(
                  "tasks",
                  tasks.map((t: Task) =>
                    makeRow(t.id, t.label),
                  ),
                ),
              );
            }),
        }),
        action({
          id: "del",
          label: "Delete",
          verb: "delete",
          confirm: confirm(
            "Delete this task?",
            true,
          ),
          run: (target) =>
            cmdEffect(() => {
              tasks = pipe(
                target,
                matchOption<
                  SoftStr,
                  ReadonlyArray<Task>
                >(
                  () => tasks,
                  (id: SoftStr) =>
                    tasks.filter(
                      (t: Task) => t.id !== id,
                    ),
                ),
              );
              return Promise.resolve(
                loaded(
                  "tasks",
                  tasks.map((t: Task) =>
                    makeRow(t.id, t.label),
                  ),
                ),
              );
            }),
        }),
      ],
    }),
  ],
});

import { type SoftStr } from "plgg";
import {
  type Html,
  slot,
  span,
  code,
  text,
  attr,
} from "plgg-view";
import { type Application } from "plgg-view/client";
import {
  type ScheduledModel,
  type SchedulerMsg,
  type Declaration,
  declare,
  menu,
  menuEntry,
  collection,
  sync,
  query,
  makeRow,
  field,
  schedule,
  multiColumn,
} from "plggmatic";

/**
 * Demo 3 — a runnable proof of plggmatic's THIRD pillar,
 * the declarative scheduler, stripped to its most quotable
 * property: THE URL IS THE DERIVED, CANONICAL, TOTAL CODEC.
 * This is the smallest `schedule(declare(...))` program
 * that shows it — ONE flat, filterable collection with a
 * `query` box — mounted (in the entry) with the URL-aware
 * `application`. Typing filters and reflects to `?q=…`,
 * selecting a row reflects to `?c=…&p=…`, a deep link
 * reproduces the exact slice, and browser back/forward walk
 * the history — all from the codec `schedule` DERIVES, with
 * no hand-written parsing. The workbench shows the full
 * multi-level drill-down; here one level is the whole point.
 */

type Specimen = Readonly<{
  id: SoftStr;
  name: SoftStr;
  note: SoftStr;
}>;

const specimens: ReadonlyArray<Specimen> = [
  {
    id: "moss",
    name: "Moss mat",
    note: "A continuous mat on the north face.",
  },
  {
    id: "lichen",
    name: "Map lichen",
    note: "Concentric rings on the erratic.",
  },
  {
    id: "fern",
    name: "Hart's-tongue fern",
    note: "In the shaded gully seep.",
  },
  {
    id: "liverwort",
    name: "Liverwort",
    note: "Thallose sheets by the runnel.",
  },
  {
    id: "horsetail",
    name: "Field horsetail",
    note: "Colonising the gravel bar.",
  },
  {
    id: "clubmoss",
    name: "Stag's-horn clubmoss",
    note: "A trailing stand above the treeline.",
  },
];

export const declaration: Declaration = declare({
  title: "Specimens",
  menu: menu([menuEntry("Specimens", "items")]),
  collections: [
    collection<Specimen>({
      id: "items",
      title: "Specimens",
      toRow: (s: Specimen) =>
        makeRow(s.id, s.name, [
          field("Note", s.note),
        ]),
      source: sync(() => specimens),
      query: query("Filter specimens"),
    }),
  ],
});

/**
 * The scheduled program — exported so the spec can assert
 * the derived URL codec (`toUrl`) directly, pinning the
 * derivation's behaviour, not an implementation detail.
 */
export const scheduled = schedule(declaration);

/** The live derived search string, or a root marker. */
const derivedUrl = (
  model: ScheduledModel,
): SoftStr => {
  const search = scheduled.toUrl(model).search;
  return search === "" ? "(root)" : search;
};

/**
 * The wired program the client entry mounts with
 * `application` (URL-aware). A small bar shows the search
 * string the model DERIVES, so the reflection is visible
 * without opening devtools.
 */
export const app: Application<
  ScheduledModel,
  SchedulerMsg
> = {
  ...scheduled,
  view: (
    model: ScheduledModel,
  ): Html<SchedulerMsg> =>
    slot(
      [attr("class", "q3-root")],
      [
        slot(
          [attr("class", "q3-bar")],
          [
            span(
              [attr("class", "q3-brand")],
              [text("Specimens")],
            ),
            span(
              [attr("class", "q3-url-label")],
              [
                text("derived URL: "),
                code(
                  [attr("class", "q3-url")],
                  [text(derivedUrl(model))],
                ),
              ],
            ),
          ],
        ),
        multiColumn(scheduled.scene(model)),
      ],
    ),
};

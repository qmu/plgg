import {
  type SoftStr,
  matchOption,
  pipe,
} from "plgg";
import {
  type Collection,
  type Declaration,
  type Field,
  collection,
  sync,
  dynamic,
  query,
  makeRow,
  field,
  fieldOf,
  refValue,
  queryChoice,
  menu,
  menuEntry,
  declare,
  schedule,
} from "plggmatic";
import {
  type SectionId,
  type SectionDef,
  type SectionField,
  SECTION_IDS,
  SECTIONS,
  defOf,
  rowFieldsOf,
} from "./catalog.ts";
import {
  type Rec,
  SEEDS,
  valueOf,
  labelOf,
  refTarget,
} from "./records.ts";

// --- The menu: all eight top-level sections ---
// A menu entry NAMES its section, so it is a singular noun —
// "Project", not "Projects". Plural stays for a column that
// actually holds a MANY (a results list, a stub list), which
// is why the collection titles below keep their plural.
// A menu entry NAMES its section, so it is a singular noun —
// "Project", not "Projects". Plural stays for a column that
// actually holds a MANY (a results list), which is why the
// collection titles below keep their plural.
//
// The seven record entries ARE the catalog, in declared order,
// so the menu cannot name a section that does not exist or
// spell one differently from its own title. The Dashboard leads
// and is written here because it is a board, not a section.
export const MENU: ReadonlyArray<
  readonly [SoftStr, SoftStr]
> = [
  ["dashboard", "Dashboard"],
  ...SECTION_IDS.map(
    (
      id: SectionId,
    ): readonly [SoftStr, SoftStr] => [
      id,
      defOf(id).title,
    ],
  ),
];

// --- A section's collection, built from its definition ---
// The record TYPES + immutable SEED live in `records.ts`, the
// section's shape in `catalog.ts`; the live records live in
// the app Model. `recordRow` projects one to a scheduler Row —
// used both for the detail view and to feed the `dynamic`
// source through `scheduled.withRows`, so no module store is
// needed.
//
// A `refTo` field becomes a REFERENCE cell (mission point 3):
// the SEED record whose label matches becomes a jump to its
// canonical detail; an unknown value (a free-typed create)
// degrades to the plain text field. Resolving against the
// seeds — not the live records — is the pre-existing rule and
// is kept: a created record is not a jump target.
const cellOf = (
  f: SectionField,
  rec: Rec,
): Field => {
  const value = valueOf(rec, f.name);
  return matchOption<SectionId, Field>(
    () => field(f.label, value),
    (to: SectionId) =>
      pipe(
        refTarget(SEEDS, to, value),
        matchOption<Rec, Field>(
          () => field(f.label, value),
          (target: Rec) =>
            fieldOf(
              f.label,
              refValue(to, target.id, value),
            ),
        ),
      ),
  )(f.refTo);
};

export const recordRow = (
  section: SectionId,
  rec: Rec,
) =>
  makeRow(
    rec.id,
    labelOf(section, rec),
    rowFieldsOf(section).map((f: SectionField) =>
      cellOf(f, rec),
    ),
  );

export const sectionCollection = (
  def: SectionDef,
): Collection =>
  collection<Rec>({
    id: def.id,
    title: def.plural,
    toRow: (rec: Rec) => recordRow(def.id, rec),
    source: dynamic<Rec>(),
    // keyword + declared status choice (mission point 4)
    query: query(`Filter ${def.id}`, [
      queryChoice(
        def.statusParam,
        "Status",
        "Status",
        def.statuses,
      ),
    ]),
  });

// --- Dashboard: a BOARD (mission point 5) ---
// The tiles summarize sections, so each carries a
// `Reference` whose EMPTY id addresses the section
// itself: the tile's jump lands on the summarized
// section's list (the flow-graph cross-link), and a
// board's rows never drill into a meaningless detail.
// The tile's `section` is a SectionId now, so its jump target
// is checked and its label is the section's own plural rather
// than a second copy of it that can drift.
//
// The numbers are true of the seeds: three projects are In
// progress (ACME, Beacon, Foxtrot); week 27's un-approved
// timesheets are 38.5 + 41.5 + 32.0 hours; three estimates are
// Sent. They were prose written beside placeholder tuples and
// claimed things the data never said ("7 active projects" over
// eight projects, three of them active) — harmless while the
// sections were stubs, a reference lying about itself once they
// are real. They are still STATIC text: a board summarising
// live records would have to read them, and `sync` is what this
// tile's source is declared as.
type DashboardTile = Readonly<{
  id: SoftStr;
  label: SoftStr;
  caption: SoftStr;
  section: SectionId;
}>;

const dashboardTiles: ReadonlyArray<DashboardTile> =
  [
    {
      id: "active",
      label: "3 active projects",
      caption: "In progress, across 3 clients.",
      section: "projects",
    },
    {
      id: "unbilled",
      label: "112 unbilled hours",
      caption: "Week 27, not yet approved.",
      section: "timesheets",
    },
    {
      id: "pending",
      label: "3 estimates awaiting sign-off",
      caption: "Oldest: EST-2041.",
      section: "deals",
    },
  ];

export const dashboardCollection: Collection =
  collection<DashboardTile>({
    id: "dashboard",
    title: "Dashboard",
    board: true,
    toRow: (t: DashboardTile) =>
      makeRow(t.id, t.label, [
        field("", t.caption),
        fieldOf(
          "",
          refValue(
            t.section,
            "",
            defOf(t.section).plural,
          ),
        ),
      ]),
    source: sync(() => dashboardTiles),
  });

export const declaration: Declaration = declare({
  title: "Menu",
  menu: menu(
    MENU.map(([id, label]) =>
      menuEntry(label, id),
    ),
  ),
  collections: [
    dashboardCollection,
    ...SECTION_IDS.map((id: SectionId) =>
      sectionCollection(SECTIONS[id]),
    ),
  ],
});

/**
 * The scheduled program — exported so the spec can assert
 * the derived URL codec (`toUrl`) directly.
 */
export const scheduled = schedule(declaration);

/**
 * The section titles are `defOf(section).*` now — the four
 * `switch (section)` helpers this module carried
 * (`singularOf` / `titleOfSection` / `pluralTitleOf` /
 * `statusesOf`) were four places to forget when a section is
 * added, so they read the catalog instead.
 */
export { defOf };

import {
  type SoftStr,
  type Datum,
  type Result,
  type InvalidError,
  ok,
  err,
  invalidError,
  match,
  matchOption,
  matchResult,
  fromNullable,
} from "plgg";
import {
  type Cmd,
  cmdNone,
  cmdBatch,
  cmdEffect,
  cmdNone$,
  cmdBatch$,
  cmdEffect$,
} from "plgg-view/client";
import {
  type ScheduledModel,
  type SchedulerMsg,
  type FormErrors,
  parseForm,
  openMenu,
  select,
} from "plggmatic";
import {
  type Scheme,
  applyScheme,
  minWidth,
} from "plggmatic/style";
import {
  type SectionId,
  type SectionField,
  type FieldInput,
  SECTION_IDS,
  bySection,
  defOf,
  fieldsOf,
  formFieldsOf,
} from "./catalog.ts";
import { type Rec, slugId } from "./records.ts";
import {
  type Model,
  type Msg,
  type SectionForm,
  emptySectionForm,
  emptySearchForm,
} from "./model.ts";
import {
  scheduled,
  recordRow,
} from "./sections.ts";

/**
 * Project the Model's record collections into the
 * scheduler's `dynamic` slots — the seam that lets records
 * live in the Model instead of a module store. Called at
 * init and after every create; the `dynamic` source then
 * preserves the slot across navigation, so `update()` stays
 * pure (ticket 20260708192518).
 *
 * A fold over the catalog's sections, not two nested calls:
 * five more sections add nothing here.
 */
export const syncRecords = (
  model: Model,
): Model => ({
  ...model,
  scheduled: SECTION_IDS.reduce(
    (acc: ScheduledModel, id: SectionId) =>
      scheduled.withRows(
        acc,
        id,
        model.records[id].map((rec: Rec) =>
          recordRow(id, rec),
        ),
      ),
    model.scheduled,
  ),
});

export const flip = (s: Scheme): Scheme =>
  s === "light" ? "dark" : "light";

export const applySchemeEffect = (
  scheme: Scheme,
): Cmd<Msg> =>
  cmdEffect(() => {
    applyScheme(
      scheme,
      document.documentElement,
      window.localStorage,
    );
    return Promise.resolve<Msg>({
      kind: "schemeApplied",
    });
  });
/**
 * The seek-head scroll: after an action grows/changes the
 * column stack, slide the horizontal strip to bring the
 * NEWEST (right-most, active) column into view. A pure
 * `Cmd`: the DOM read/scroll runs in the effect (after
 * paint, via a double rAF), never in `update`. Guarded so it
 * is an inert no-op under the node test runner (no
 * `document`/`window`).
 *
 * The strip scrolls on EVERY viewport (the recursion trail
 * grows it on desktop too), but the resting place differs,
 * because the two viewports have different scarcity:
 *
 * - **SP vertical** (below `snap`): the live column goes to
 *   the LEFT EDGE, always. One column is about all that
 *   fits, so there is no context to preserve and the edge is
 *   the only unambiguous rest point — it is also where the
 *   mandatory scroll-snap would land the column anyway.
 * - **Wider** (at/above `snap`): the live column goes to the
 *   CENTER, and only when it is not already fully visible.
 *   A wide strip shows several columns at once, so the trail
 *   BEHIND the live column is real context worth keeping on
 *   screen; left-aligning threw all of it away on every hop,
 *   and moving at all is pointless when the column already
 *   sits in plain view. Centering keeps what led here to the
 *   left and the room a further hop needs to the right.
 *
 * The boundary is `minWidth("snap")` — the very condition
 * the stylesheet's runway rule uses, matched through
 * `matchMedia`, so the motion and the scrollable range can
 * never disagree about which viewport this is.
 */
export const advanceColumnsCmd = (): Cmd<Msg> =>
  cmdEffect(
    () =>
      new Promise<Msg>((resolve) => {
        const done = (): void =>
          resolve({ kind: "columnsAdvanced" });
        if (
          typeof document === "undefined" ||
          typeof window === "undefined" ||
          typeof requestAnimationFrame ===
            "undefined"
        ) {
          return done();
        }
        const scroll = (): void => {
          const row =
            document.querySelector(".pm-row");
          if (row !== null) {
            const cols = Array.from(
              row.querySelectorAll(".pm-col"),
            ).filter(
              (c: Element) =>
                c.getBoundingClientRect().width >
                0,
            );
            const last = cols[cols.length - 1];
            if (last !== undefined) {
              const strip =
                row.getBoundingClientRect();
              const col =
                last.getBoundingClientRect();
              // The runway is "the strip's width minus the
              // last column", and since columns size to their
              // CONTENT, only the DOM knows how wide that is
              // — a stylesheet constant cannot. Publish it
              // here, where it is already measured, and the
              // rule reads it back as `--bo-last`.
              if (row instanceof HTMLElement) {
                row.style.setProperty(
                  "--bo-last",
                  `${Math.round(col.width)}px`,
                );
              }
              // Scroll ONLY the horizontal strip — compute a
              // scrollLeft directly. Never `scrollIntoView`,
              // which also scrolls the page VERTICALLY and
              // would hide the top bar (logo / theme toggle);
              // this is a horizontal-only focus.
              const toLeftEdge =
                row.scrollLeft +
                (col.left - strip.left);
              const wide = window.matchMedia(
                minWidth("snap"),
              ).matches;
              // A sub-pixel slice hanging over an edge is not
              // a reason to move the whole strip.
              const inView =
                col.left >= strip.left - 1 &&
                col.right <= strip.right + 1;
              if (wide && inView) {
                return done();
              }
              // `scrollTo` clamps to [0, maxScroll], so a
              // centre target that would need room the strip
              // does not have simply rests at the near edge —
              // no separate shallow-strip case to carry.
              row.scrollTo({
                left: wide
                  ? toLeftEdge -
                    (strip.width - col.width) / 2
                  : toLeftEdge,
                behavior: "smooth",
              });
            }
          }
          done();
        };
        // two frames: let the new column paint + lay out
        // before measuring and scrolling.
        requestAnimationFrame(() =>
          requestAnimationFrame(scroll),
        );
      }),
  );

export const mapCmd =
  <A, B>(f: (a: A) => B) =>
  (cmd: Cmd<A>): Cmd<B> =>
    match(cmd)(
      [cmdNone$(), () => cmdNone()],
      [
        cmdBatch$(),
        ({ content }) =>
          cmdBatch(content.map(mapCmd(f))),
      ],
      [
        cmdEffect$(),
        ({ content }) =>
          cmdEffect(() => content().then(f)),
      ],
    );

export const mapSchedulerCmd = (
  cmd: Cmd<SchedulerMsg>,
): Cmd<Msg> =>
  mapCmd<SchedulerMsg, Msg>((msg) => ({
    kind: "scheduler",
    msg,
  }))(cmd);

export const asFilled = (
  value: unknown,
): Result<Datum, InvalidError> =>
  typeof value === "string" &&
  value.trim().length > 0
    ? ok(value.trim())
    : err(invalidError({ message: "Required" }));

export const asOptionalText = (
  value: unknown,
): Result<Datum, InvalidError> =>
  ok(
    typeof value === "string" ? value.trim() : "",
  );

export const draftOf =
  (form: SectionForm) =>
  (name: SoftStr): SoftStr =>
    matchOption<SoftStr, SoftStr>(
      () => "",
      (value: SoftStr) => value,
    )(fromNullable(form.drafts[name]));

export const parseSectionForm = (
  section: SectionId,
  form: SectionForm,
) =>
  parseForm(
    formFieldsOf(section).map(
      (f: SectionField) => ({
        name: f.name,
        cast: matchOption<FieldInput, boolean>(
          () => false,
          (i: FieldInput) => i.required,
        )(f.input)
          ? asFilled
          : asOptionalText,
      }),
    ),
    draftOf(form),
  );

/**
 * Build the new record from the field descriptors.
 *
 * This was a `switch (section)` whose two branches each built
 * a TYPED struct by naming every field twice. There is nothing
 * section-shaped left in it: a field the form edits takes its
 * submitted value, a DERIVED field (`input: none`) takes its
 * declared `initial`, and the id/counter machinery was always
 * shared.
 */
export const commitRecord = (
  section: SectionId,
  payload: Readonly<Record<string, Datum>>,
  model: Model,
): readonly [Model, SoftStr] => {
  const def = defOf(section);
  const count = model.counts[section] + 1;
  const values = Object.fromEntries(
    fieldsOf(section).map(
      (
        f: SectionField,
      ): readonly [SoftStr, SoftStr] => [
        f.name,
        matchOption<FieldInput, SoftStr>(
          () => f.initial,
          () =>
            matchOption<Datum, SoftStr>(
              () => "",
              (d: Datum) => `${d}`,
            )(fromNullable(payload[f.name])),
        )(f.input),
      ],
    ),
  );
  const rec: Rec = {
    id: slugId(
      `${values[def.labelField]}`,
      def.singular,
      count,
    ),
    values,
  };
  return [
    {
      ...model,
      records: {
        ...model.records,
        [section]: [
          ...model.records[section],
          rec,
        ],
      },
      counts: {
        ...model.counts,
        [section]: count,
      },
    },
    rec.id,
  ];
};

export const selectCreated = (
  section: SectionId,
  scheduledModel: ScheduledModel,
  id: SoftStr,
): readonly [ScheduledModel, Cmd<Msg>] => {
  const [opened, openCmd] = scheduled.update(
    openMenu(section),
    scheduledModel,
  );
  const [selected, selectCmd] = scheduled.update(
    select(0, id),
    opened,
  );
  return [
    selected,
    cmdBatch([
      mapSchedulerCmd(openCmd),
      mapSchedulerCmd(selectCmd),
    ]),
  ];
};

export const formOf = (
  section: SectionId,
  model: Model,
): SectionForm => model.forms[section];

export const setForm = (
  section: SectionId,
  model: Model,
  form: SectionForm,
): Model => ({
  ...model,
  forms: { ...model.forms, [section]: form },
});

export const patchDraft = (
  section: SectionId,
  field: SoftStr,
  value: SoftStr,
  model: Model,
): Model => {
  const form = formOf(section, model);
  return setForm(section, model, {
    ...form,
    drafts: {
      ...form.drafts,
      [field]: value,
    },
  });
};

/** Every section's form, closed and reset to its initials. */
export const closedForms = (): Readonly<
  Record<SectionId, SectionForm>
> =>
  bySection((id: SectionId) =>
    emptySectionForm(id, false),
  );

export const submitSection = (
  section: SectionId,
  model: Model,
): readonly [Model, Cmd<Msg>] =>
  matchResult<
    Readonly<Record<string, Datum>>,
    FormErrors,
    readonly [Model, Cmd<Msg>]
  >(
    (errors: FormErrors) => [
      setForm(section, model, {
        ...formOf(section, model),
        errors,
      }),
      cmdNone(),
    ],
    (payload) => {
      // Append the record to the Model (pure), project the
      // updated collections into the scheduler slots, THEN
      // navigate to the new record — the dynamic source
      // preserves the synced slot across that navigation.
      const [committed, id] = commitRecord(
        section,
        payload,
        model,
      );
      const synced = syncRecords(committed);
      const [next, cmd] = selectCreated(
        section,
        synced.scheduled,
        id,
      );
      return [
        {
          ...synced,
          scheduled: next,
          forms: closedForms(),
          search: emptySearchForm(
            false,
            false,
            "",
            "Any",
          ),
        },
        cmdBatch([cmd, advanceColumnsCmd()]),
      ];
    },
  )(
    parseSectionForm(
      section,
      formOf(section, model),
    ),
  );

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
  advanceColumns,
} from "plggmatic";
import {
  type Scheme,
  applyScheme,
} from "plggmatic/style";
import { demo1Theme } from "./theme.ts";
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
 * The seek-head scroll after an action grows/changes the
 * column stack: bring the NEWEST column into view and publish
 * the last column's measured width for the runway spacer. The
 * unbounded-depth runway is now a FRAMEWORK capability
 * (`advanceColumns` + `runwayCss`); the reference reduces to
 * naming its theme and the completion message — the
 * DOM-measuring effect and the resting-place policy live in
 * plggmatic, no longer duplicated here.
 */
export const advanceColumnsCmd = (): Cmd<Msg> =>
  advanceColumns(demo1Theme)<Msg>({
    kind: "columnsAdvanced",
  });

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

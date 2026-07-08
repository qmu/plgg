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
} from "plggmatic/style";
import {
  type SearchableSection,
  type Client,
  type Project,
  slugId,
} from "./records.ts";
import {
  type SectionField,
  fieldsOf,
} from "./fields.ts";
import {
  type Model,
  type Msg,
  type SectionForm,
  emptySectionForm,
  emptySearchForm,
} from "./model.ts";
import {
  scheduled,
  projectRow,
  clientRow,
} from "./sections.ts";

/**
 * Project the Model's record collections into the
 * scheduler's `dynamic` slots — the seam that lets records
 * live in the Model instead of a module store. Called at
 * init and after every create; the `dynamic` source then
 * preserves the slot across navigation, so `update()` stays
 * pure (ticket 20260708192518).
 */
export const syncRecords = (
  model: Model,
): Model => ({
  ...model,
  scheduled: scheduled.withRows(
    scheduled.withRows(
      model.scheduled,
      "projects",
      model.projects.map(projectRow),
    ),
    "clients",
    model.clients.map(clientRow),
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
  section: SearchableSection,
  form: SectionForm,
) =>
  parseForm(
    fieldsOf(section).map((f: SectionField) => ({
      name: f.name,
      cast: f.required
        ? asFilled
        : asOptionalText,
    })),
    draftOf(form),
  );

// Record construction is the one genuinely
// record-shaped step: the two types carry different
// fields, so each branch maps its own payload. The
// counter/append/id machinery around it is shared.
export const commitRecord = (
  section: SearchableSection,
  payload: Readonly<Record<string, Datum>>,
  model: Model,
): readonly [Model, SoftStr] => {
  switch (section) {
    case "clients": {
      const name = `${payload.name}`;
      const count = model.clientCount + 1;
      const client: Client = {
        id: slugId(name, "client", count),
        name,
        status: `${payload.status}`,
        since: `${payload.since}`,
        contact: `${payload.contact}`,
        projects: "No active projects",
        notes: `${payload.notes}`,
      };
      return [
        {
          ...model,
          clients: [...model.clients, client],
          clientCount: count,
        },
        client.id,
      ];
    }
    case "projects": {
      const name = `${payload.name}`;
      const count = model.projectCount + 1;
      const project: Project = {
        id: slugId(name, "project", count),
        name,
        client: `${payload.client}`,
        contract: `${payload.contract}`,
        status: `${payload.status}`,
        period: `${payload.period}`,
        budget: `${payload.budget}`,
        lead: `${payload.lead}`,
      };
      return [
        {
          ...model,
          projects: [...model.projects, project],
          projectCount: count,
        },
        project.id,
      ];
    }
  }
};

export const selectCreated = (
  section: SearchableSection,
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
  section: SearchableSection,
  model: Model,
): SectionForm => {
  switch (section) {
    case "clients":
      return model.clientForm;
    case "projects":
      return model.projectForm;
  }
};

export const setForm = (
  section: SearchableSection,
  model: Model,
  form: SectionForm,
): Model => {
  switch (section) {
    case "clients":
      return { ...model, clientForm: form };
    case "projects":
      return { ...model, projectForm: form };
  }
};

export const patchDraft = (
  section: SearchableSection,
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

export const submitSection = (
  section: SearchableSection,
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
          clientForm: emptySectionForm(
            "clients",
            false,
          ),
          projectForm: emptySectionForm(
            "projects",
            false,
          ),
          search: emptySearchForm(
            false,
            false,
            "",
            "Any",
          ),
        },
        cmd,
      ];
    },
  )(
    parseSectionForm(
      section,
      formOf(section, model),
    ),
  );

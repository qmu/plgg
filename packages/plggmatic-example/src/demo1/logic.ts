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
  nextCount,
  addClient,
  addProject,
} from "./store.ts";
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
import { scheduled } from "./sections.ts";

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
): SoftStr => {
  switch (section) {
    case "clients": {
      const name = `${payload.name}`;
      const client: Client = {
        id: slugId(
          name,
          "client",
          nextCount("clients"),
        ),
        name,
        status: `${payload.status}`,
        since: `${payload.since}`,
        contact: `${payload.contact}`,
        projects: "No active projects",
        notes: `${payload.notes}`,
      };
      addClient(client);
      return client.id;
    }
    case "projects": {
      const name = `${payload.name}`;
      const project: Project = {
        id: slugId(
          name,
          "project",
          nextCount("projects"),
        ),
        name,
        client: `${payload.client}`,
        contract: `${payload.contract}`,
        status: `${payload.status}`,
        period: `${payload.period}`,
        budget: `${payload.budget}`,
        lead: `${payload.lead}`,
      };
      addProject(project);
      return project.id;
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
      const id = commitRecord(section, payload);
      const [next, cmd] = selectCreated(
        section,
        model.scheduled,
        id,
      );
      return [
        {
          ...model,
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

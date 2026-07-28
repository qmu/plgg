import {
  type SoftStr,
  type Datum,
  type Result,
  type Option,
  type InvalidError,
  some,
  none,
  matchOption,
  matchResult,
  ok,
  err,
  invalidError,
} from "plgg";
import {
  type Html,
  slot,
  ul,
  li,
  span,
  button,
  text,
  attr,
  onClick,
} from "plgg-view";
import {
  type Sandbox,
  type Cmd,
  cmdNone,
  cmdEffect,
} from "plgg-view/client";
import {
  type ToastProps,
  type FormField,
  type FieldState,
  type FormErrors,
  type SubmissionState,
  declaredForm,
  confirmDialog,
  toaster,
  parseForm,
  errorFor,
  idleSubmission,
  pendingSubmission,
  isPending,
} from "plggmatic";

/**
 * A self-contained showcase of ticket 12's form machinery
 * — the runnable proof-of-value: a caster-parsed create
 * form (an invalid draft shows a field error and dispatches
 * NOTHING; a valid draft disables the form, "creates", and
 * toasts success), a destructive delete behind the confirm
 * dialog (cancel is a no-op), and the toaster. No
 * scheduler — the components are mode-agnostic, so this
 * plain `sandbox` proves them in isolation.
 */

type Note = Readonly<{
  id: SoftStr;
  title: SoftStr;
}>;

export type Msg =
  | Readonly<{
      kind: "titleInput";
      value: SoftStr;
    }>
  | Readonly<{
      kind: "bodyInput";
      value: SoftStr;
    }>
  | Readonly<{ kind: "submit" }>
  | Readonly<{ kind: "created"; title: SoftStr }>
  | Readonly<{
      kind: "requestDelete";
      id: SoftStr;
    }>
  | Readonly<{ kind: "confirmDelete" }>
  | Readonly<{ kind: "cancelDelete" }>
  | Readonly<{ kind: "dismiss"; id: SoftStr }>;

export type Model = Readonly<{
  titleDraft: SoftStr;
  bodyDraft: SoftStr;
  errors: FormErrors;
  submitting: SubmissionState;
  notes: ReadonlyArray<Note>;
  toasts: ReadonlyArray<ToastProps<Msg>>;
  pendingDelete: Option<SoftStr>;
  seq: number;
}>;

const asFilled = (
  v: unknown,
): Result<Datum, InvalidError> =>
  typeof v === "string" && v.trim().length > 0
    ? ok(v)
    : err(
        invalidError({
          message: "Required",
        }),
      );

/**
 * The form as a DECLARATION over plggmatic's Form surface —
 * each field names its parse `cast`, its label, and its
 * render `control` (kind + placeholder + message builder).
 * This ONE list drives BOTH `parseForm` (validation, in
 * `update`) and `declaredForm` (rendering, in `view`); the
 * example never hand-lists a control component.
 */
const fields: ReadonlyArray<FormField<Msg>> = [
  {
    name: "title",
    label: "Title",
    cast: asFilled,
    control: {
      kind: "text",
      placeholder: some("Note title"),
      onInput: (v: SoftStr): Msg => ({
        kind: "titleInput",
        value: v,
      }),
    },
  },
  {
    name: "body",
    label: "Body",
    cast: asFilled,
    control: {
      kind: "textarea",
      placeholder: some("Note body"),
      onInput: (v: SoftStr): Msg => ({
        kind: "bodyInput",
        value: v,
      }),
    },
  },
];

const draftOf =
  (model: Model) =>
  (name: SoftStr): SoftStr =>
    name === "title"
      ? model.titleDraft
      : model.bodyDraft;

const stateOf =
  (model: Model) =>
  (name: SoftStr): FieldState => ({
    value: draftOf(model)(name),
    error: errorFor(model.errors, name),
    disabled: isPending(model.submitting),
  });

const pushToast = (
  model: Model,
  tone: "success" | "danger" | "info",
  message: SoftStr,
): Model => ({
  ...model,
  toasts: [
    ...model.toasts,
    {
      id: `toast-${model.seq}`,
      tone,
      message,
      onDismiss: {
        kind: "dismiss",
        id: `toast-${model.seq}`,
      },
    },
  ],
  seq: model.seq + 1,
});

export const init: readonly [Model, Cmd<Msg>] = [
  {
    titleDraft: "",
    bodyDraft: "",
    errors: [],
    submitting: idleSubmission(),
    notes: [],
    toasts: [],
    pendingDelete: none(),
    seq: 0,
  },
  cmdNone(),
];

export const update = (
  msg: Msg,
  model: Model,
): readonly [Model, Cmd<Msg>] => {
  switch (msg.kind) {
    case "titleInput":
      return [
        { ...model, titleDraft: msg.value },
        cmdNone(),
      ];
    case "bodyInput":
      return [
        { ...model, bodyDraft: msg.value },
        cmdNone(),
      ];
    case "submit":
      return matchResult<
        Readonly<Record<string, Datum>>,
        FormErrors,
        readonly [Model, Cmd<Msg>]
      >(
        (errors: FormErrors) => [
          { ...model, errors },
          cmdNone(),
        ],
        (payload) => [
          {
            ...model,
            errors: [],
            submitting: pendingSubmission(),
          },
          cmdEffect(() =>
            Promise.resolve<Msg>({
              kind: "created",
              title: `${payload["title"]}`,
            }),
          ),
        ],
      )(parseForm(fields, draftOf(model)));
    case "created":
      return [
        pushToast(
          {
            ...model,
            titleDraft: "",
            bodyDraft: "",
            submitting: idleSubmission(),
            notes: [
              ...model.notes,
              {
                id: `note-${model.seq}`,
                title: msg.title,
              },
            ],
          },
          "success",
          "Note created",
        ),
        cmdNone(),
      ];
    case "requestDelete":
      return [
        { ...model, pendingDelete: some(msg.id) },
        cmdNone(),
      ];
    case "confirmDelete":
      return [
        pushToast(
          {
            ...model,
            pendingDelete: none(),
            notes: matchOption<
              SoftStr,
              ReadonlyArray<Note>
            >(
              () => model.notes,
              (id: SoftStr) =>
                model.notes.filter(
                  (n: Note) => n.id !== id,
                ),
            )(model.pendingDelete),
          },
          "danger",
          "Note deleted",
        ),
        cmdNone(),
      ];
    case "cancelDelete":
      return [
        { ...model, pendingDelete: none() },
        cmdNone(),
      ];
    case "dismiss":
      return [
        {
          ...model,
          toasts: model.toasts.filter(
            (t: ToastProps<Msg>) =>
              t.id !== msg.id,
          ),
        },
        cmdNone(),
      ];
  }
};

const noteRow = (n: Note): Html<Msg, "li"> =>
  li(
    [attr("class", "fd-note")],
    [
      span([], [text(n.title)]),
      button(
        [
          attr("class", "pm-btn pm-btn-danger"),
          onClick({
            kind: "requestDelete",
            id: n.id,
          }),
        ],
        [text("Delete")],
      ),
    ],
  );

export const view = (model: Model): Html<Msg> =>
  slot(
    [attr("class", "fd-root")],
    [
      declaredForm<Msg>({
        fields,
        stateOf: stateOf(model),
        submitLabel: "Add note",
        submitting: isPending(model.submitting),
        onSubmit: { kind: "submit" },
      }),
      ul(
        [attr("class", "fd-notes")],
        model.notes.map(noteRow),
      ),
      ...matchOption<
        SoftStr,
        ReadonlyArray<Html<Msg>>
      >(
        () => [],
        (_id: SoftStr) => [
          confirmDialog<Msg>({
            title: "Delete note?",
            body: "This cannot be undone.",
            confirmLabel: "Delete",
            cancelLabel: "Cancel",
            destructive: true,
            onConfirm: { kind: "confirmDelete" },
            onCancel: { kind: "cancelDelete" },
          }),
        ],
      )(model.pendingDelete),
      toaster<Msg>(model.toasts),
    ],
  );

/** The wired sandbox program the demo entry mounts. */
export const program: Sandbox<Model, Msg> = {
  init,
  update,
  view,
};

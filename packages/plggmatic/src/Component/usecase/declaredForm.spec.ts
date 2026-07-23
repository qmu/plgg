import {
  test,
  check,
  all,
  toBe,
  toContain,
} from "plgg-test";
import { renderToString } from "plgg-view";
import {
  type SoftStr,
  type Datum,
  type Result,
  type InvalidError,
  ok,
  err,
  invalidError,
  isOk,
  isErr,
  isSome,
  isNone,
  none,
  some,
  matchResult,
} from "plgg";
import { controlKinds } from "plggmatic/Form/model/control";
import {
  type FormErrors,
  type Payload,
  parseForm,
  errorFor,
} from "plggmatic/Form/usecase/parseForm";
import {
  idleSubmission,
  pendingSubmission,
  isPending,
} from "plggmatic/Form/model/submission";
import {
  type FormField,
  type FieldState,
  fieldControl,
  declaredForm,
} from "plggmatic/Component/usecase/declaredForm";

// The spec's Msg is just the reported value; the point is
// the control kinds and the parse drive, not a program.
type Msg = SoftStr;

const asFilled = (
  v: unknown,
): Result<Datum, InvalidError> =>
  typeof v === "string" && v.length > 0
    ? ok(v)
    : err(invalidError({ message: "Required" }));

const textField: FormField<Msg> = {
  name: "title",
  label: "Title",
  cast: asFilled,
  control: {
    kind: "text",
    placeholder: some("t"),
    onInput: (v: SoftStr): Msg => v,
  },
};

const areaField: FormField<Msg> = {
  name: "body",
  label: "Body",
  cast: asFilled,
  control: {
    kind: "textarea",
    placeholder: none(),
    onInput: (v: SoftStr): Msg => v,
  },
};

const selectField: FormField<Msg> = {
  name: "tag",
  label: "Tag",
  cast: asFilled,
  control: {
    kind: "select",
    options: [{ value: "a", label: "Ay" }],
    onChange: (v: SoftStr): Msg => v,
  },
};

const checkField: FormField<Msg> = {
  name: "done",
  label: "Done",
  cast: asFilled,
  control: {
    kind: "checkbox",
    onToggle: "toggle",
  },
};

const enabled: FieldState = {
  value: "",
  error: none(),
  disabled: false,
};

test("every control kind renders its own element", () => {
  const html = (field: FormField<Msg>): string =>
    renderToString(fieldControl(field, enabled));
  return all([
    // the union has exactly the four declared kinds
    check(controlKinds.length, toBe(4)),
    check(
      html(textField),
      toContain('type="text"'),
    ),
    check(html(textField), toContain("Title")),
    check(
      html(areaField),
      toContain("<textarea"),
    ),
    check(
      html(selectField),
      toContain("<select"),
    ),
    check(html(selectField), toContain("Ay")),
    check(
      html(checkField),
      toContain('type="checkbox"'),
    ),
  ]);
});

test("a checkbox is checked from a non-empty draft", () =>
  check(
    renderToString(
      fieldControl(checkField, {
        value: "on",
        error: none(),
        disabled: false,
      }),
    ).includes("checked"),
    toBe(true),
  ));

test("declaredForm wraps the declared fields in a form with a submit", () => {
  const html = renderToString(
    declaredForm<Msg>({
      fields: [textField, areaField],
      stateOf: (): FieldState => enabled,
      submitLabel: "Save",
      submitting: false,
      onSubmit: "submit",
    }),
  );
  return all([
    check(html.startsWith("<form"), toBe(true)),
    check(html, toContain('type="text"')),
    check(html, toContain("<textarea")),
    check(html, toContain('type="submit"')),
  ]);
});

// Driving the DECLARED form: the SAME field list that
// renders also parses. An invalid draft surfaces a per-field
// error via errorFor and dispatches nothing; a valid draft
// parses and the submission transitions idle -> pending.
const declared: ReadonlyArray<FormField<Msg>> = [
  textField,
  areaField,
];

test("an invalid draft fails parse and errorFor finds the empty field", () => {
  const result = parseForm(
    declared,
    (n: SoftStr): SoftStr =>
      n === "title" ? "Hello" : "",
  );
  return all([
    check(isErr(result), toBe(true)),
    check(
      matchResult<Payload, FormErrors, boolean>(
        (errors: FormErrors) =>
          isSome(errorFor(errors, "body")) &&
          isNone(errorFor(errors, "title")),
        () => false,
      )(result),
      toBe(true),
    ),
  ]);
});

test("a valid draft parses and submission transitions idle -> pending", () => {
  const result = parseForm(
    declared,
    (n: SoftStr): SoftStr =>
      n === "title" ? "Hello" : "World",
  );
  const submitting = isOk(result)
    ? pendingSubmission()
    : idleSubmission();
  return all([
    check(isOk(result), toBe(true)),
    check(
      isPending(idleSubmission()),
      toBe(false),
    ),
    check(isPending(submitting), toBe(true)),
  ]);
});

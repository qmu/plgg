// Twin of the Forms page's code fence. Controlled form
// controls (value from props), a caster-parsed submit
// (parse once, per-field errors), and the confirm dialog —
// all pure `(props) => Html<Msg>`, mode-agnostic.
import {
  type Datum,
  type Result,
  type InvalidError,
  some,
  ok,
  err,
  invalidError,
  matchResult,
} from "plgg";
import {
  type Payload,
  type FormErrors,
  textInput,
  checkbox,
  confirmDialog,
  toast,
  parseForm,
  errorFor,
} from "plggmatic";

type Msg = Readonly<{ kind: string }>;

// a caster IS the validation: a non-empty string, else err
const asFilled = (
  v: unknown,
): Result<Datum, InvalidError> =>
  typeof v === "string" && v.length > 0
    ? ok(v)
    : err(invalidError({ message: "Required" }));

// an empty draft fails the caster → a per-field error
const errors: FormErrors = matchResult<
  Payload,
  FormErrors,
  FormErrors
>(
  (e: FormErrors) => e,
  () => [],
)(
  parseForm(
    [{ name: "email", cast: asFilled }],
    () => "",
  ),
);

// a controlled input, showing its parse error
export const emailField = textInput<Msg>({
  name: "email",
  label: "Email",
  value: "",
  placeholder: some("you@example.com"),
  error: errorFor(errors, "email"),
  disabled: false,
  onInput: () => ({ kind: "email" }),
});

export const agreeField = checkbox<Msg>({
  name: "agree",
  label: "I agree",
  checked: false,
  disabled: false,
  onToggle: { kind: "agree" },
});

export const dialog = confirmDialog<Msg>({
  title: "Delete?",
  body: "This cannot be undone.",
  confirmLabel: "Delete",
  cancelLabel: "Cancel",
  destructive: true,
  onConfirm: { kind: "confirm" },
  onCancel: { kind: "cancel" },
});

export const savedToast = toast<Msg>({
  id: "t1",
  tone: "success",
  message: "Saved",
  onDismiss: { kind: "dismiss" },
});

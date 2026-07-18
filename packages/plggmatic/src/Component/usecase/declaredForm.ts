import { type SoftStr, type Option } from "plgg";
import { type Html } from "plgg-view";
import { type ControlKind } from "plggmatic/Form/model/control";
import { type FieldSpec } from "plggmatic/Form/usecase/parseForm";
import { formView } from "plggmatic/Form/usecase/formView";
import { textInput } from "plggmatic/Component/usecase/textInput";
import { textArea } from "plggmatic/Component/usecase/textArea";
import {
  type SelectOption,
  selectInput,
} from "plggmatic/Component/usecase/selectInput";
import { checkbox } from "plggmatic/Component/usecase/checkbox";

/**
 * One arm of the {@link Control} union: a variant tagged by
 * a {@link ControlKind} member (`K extends ControlKind`, so
 * a kind that is not in the closed union is a compile
 * error) carrying that kind's render data.
 */
type ControlOf<
  K extends ControlKind,
  Data,
> = Readonly<{ kind: K } & Data>;

/**
 * The RENDER half of a declared field, discriminated by
 * {@link ControlKind} — the per-kind data and the
 * consumer's message builders. A closed union so
 * {@link fieldControl}'s `switch` is exhaustive: a new
 * control kind cannot be added to the surface without a
 * render arm for it. This is what makes `ControlKind`
 * load-bearing — the declaration says *which* control, and
 * the framework picks the component, instead of the caller
 * hand-listing `textInput`/`textArea`.
 */
export type Control<Msg> =
  | ControlOf<
      "text",
      {
        placeholder: Option<SoftStr>;
        onInput: (value: SoftStr) => Msg;
      }
    >
  | ControlOf<
      "textarea",
      {
        placeholder: Option<SoftStr>;
        onInput: (value: SoftStr) => Msg;
      }
    >
  | ControlOf<
      "select",
      {
        options: ReadonlyArray<SelectOption>;
        onChange: (value: SoftStr) => Msg;
      }
    >
  | ControlOf<"checkbox", { onToggle: Msg }>;

/**
 * A fully declared form field: the parse contract
 * ({@link FieldSpec}'s `name` + `cast`) plus its label and
 * render {@link Control}. ONE declaration drives BOTH
 * validation (`parseForm` reads `name`/`cast`) and
 * rendering ({@link fieldControl} reads `label`/`control`)
 * — the example declares *what the form is*, the framework
 * parses and renders it.
 */
export type FormField<Msg> = FieldSpec &
  Readonly<{
    label: SoftStr;
    control: Control<Msg>;
  }>;

/**
 * The per-render runtime state of a field — its current
 * draft `value`, its parse `error` (if any), and whether
 * it is `disabled` (the form is submitting). The static
 * {@link FormField} declaration carries no state; this is
 * threaded in each frame.
 */
export type FieldState = Readonly<{
  value: SoftStr;
  error: Option<SoftStr>;
  disabled: boolean;
}>;

/**
 * Renders one declared field to its control component by an
 * exhaustive `switch` over the {@link Control} kind (a
 * closed union, no `default`, so a new kind is a compile
 * error until it has an arm). A `checkbox` reads its
 * checked-ness from a non-empty draft, mirroring how HTML
 * serialises a checked box.
 */
export const fieldControl = <Msg>(
  field: FormField<Msg>,
  state: FieldState,
): Html<Msg, "div"> => {
  const control = field.control;
  switch (control.kind) {
    case "text":
      return textInput<Msg>({
        name: field.name,
        label: field.label,
        value: state.value,
        placeholder: control.placeholder,
        error: state.error,
        disabled: state.disabled,
        onInput: control.onInput,
      });
    case "textarea":
      return textArea<Msg>({
        name: field.name,
        label: field.label,
        value: state.value,
        placeholder: control.placeholder,
        error: state.error,
        disabled: state.disabled,
        onInput: control.onInput,
      });
    case "select":
      return selectInput<Msg>({
        name: field.name,
        label: field.label,
        value: state.value,
        options: control.options,
        error: state.error,
        disabled: state.disabled,
        onChange: control.onChange,
      });
    case "checkbox":
      return checkbox<Msg>({
        name: field.name,
        label: field.label,
        checked: state.value.length > 0,
        disabled: state.disabled,
        onToggle: control.onToggle,
      });
  }
};

/**
 * A form driven entirely by its declared {@link FormField}
 * set: each field is rendered through {@link fieldControl}
 * (its runtime state resolved by `stateOf`) and the whole
 * is assembled by {@link formView}. The consumer's `update`
 * still owns parsing (the SAME field list feeds `parseForm`)
 * and the submit `Cmd`; this component owns no state.
 */
export type DeclaredFormProps<Msg> = Readonly<{
  fields: ReadonlyArray<FormField<Msg>>;
  stateOf: (name: SoftStr) => FieldState;
  submitLabel: SoftStr;
  submitting: boolean;
  onSubmit: Msg;
}>;

export const declaredForm = <Msg>(
  props: DeclaredFormProps<Msg>,
): Html<Msg, "form"> =>
  formView<Msg>({
    fields: props.fields.map(
      (field: FormField<Msg>): Html<Msg, "div"> =>
        fieldControl(
          field,
          props.stateOf(field.name),
        ),
    ),
    submitLabel: props.submitLabel,
    submitting: props.submitting,
    onSubmit: props.onSubmit,
  });

import {
  type SoftStr,
  type Option,
  matchOption,
} from "plgg";
import {
  type Html,
  el,
  text,
  attr,
  onClick,
  onInput,
  onChange,
} from "plgg-view";
import { type Selectable } from "plggmatic/Component/usecase/navigation";
import {
  fieldClass,
  fieldLabelClass,
  inputClass,
  radioClass,
  radiosClass,
  rangeClass,
  rangeValueClass,
  searchClass,
  segmentClass,
  segmentedClass,
} from "plggmatic/Meta/model/classHooks";
import {
  fieldLabel,
  errorAria,
  fieldError,
} from "plggmatic/Form/usecase/controlParts";

/**
 * A RADIO GROUP: one of a few choices, all of them in
 * view. Real radio inputs under one name, so the arrow
 * keys move between them as anywhere else.
 */
export type RadioGroupProps<Msg> = Readonly<{
  name: SoftStr;
  label: SoftStr;
  options: ReadonlyArray<Selectable>;
  value: SoftStr;
  onChange: (id: SoftStr) => Msg;
}>;
export const radioGroup = <Msg>(
  props: RadioGroupProps<Msg>,
): Html<Msg> =>
  el(
    "fieldset",
    [attr("class", radiosClass)],
    [
      el(
        "legend",
        [attr("class", fieldLabelClass)],
        [text(props.label)],
      ),
      ...props.options.map((option: Selectable) =>
        el<Msg>(
          "label",
          [attr("class", radioClass)],
          [
            el(
              "input",
              [
                attr("type", "radio"),
                attr("name", props.name),
                attr("value", option.id),
                ...(option.id === props.value
                  ? [attr("checked", "")]
                  : []),
                onChange(props.onChange),
              ],
              [],
            ),
            el("span", [], [text(option.label)]),
          ],
        ),
      ),
    ],
  );

/**
 * A SEGMENTED CONTROL: two to four choices side by side,
 * one pressed. For a choice that takes effect at once —
 * a view, a unit — where a select would hide the others.
 */
export type SegmentedProps<Msg> = Readonly<{
  label: SoftStr;
  options: ReadonlyArray<Selectable>;
  value: SoftStr;
  onSelect: (id: SoftStr) => Msg;
}>;
export const segmented = <Msg>(
  props: SegmentedProps<Msg>,
): Html<Msg> =>
  el(
    "div",
    [
      attr("class", segmentedClass),
      attr("role", "group"),
      attr("aria-label", props.label),
    ],
    props.options.map((option: Selectable) =>
      el(
        "button",
        [
          attr("type", "button"),
          attr("class", segmentClass),
          attr(
            "aria-pressed",
            option.id === props.value
              ? "true"
              : "false",
          ),
          onClick(props.onSelect(option.id)),
        ],
        [text(option.label)],
      ),
    ),
  );

/** An attribute that is written only when there is a
 * value for it. */
const given = (
  name: SoftStr,
  value: Option<number>,
): ReadonlyArray<ReturnType<typeof attr>> =>
  matchOption<
    number,
    ReadonlyArray<ReturnType<typeof attr>>
  >(
    () => [],
    (v: number) => [attr(name, String(v))],
  )(value);

/** What the typed fields have in common: a labelled
 * native input of one type, with its error. */
type TypedFieldProps<Msg> = Readonly<{
  name: SoftStr;
  label: SoftStr;
  value: SoftStr;
  error: Option<SoftStr>;
  disabled: boolean;
  onInput: (value: SoftStr) => Msg;
}>;
const typedField = <Msg>(
  type: SoftStr,
  props: TypedFieldProps<Msg>,
  more: ReadonlyArray<ReturnType<typeof attr>>,
): Html<Msg> =>
  el(
    "div",
    [attr("class", fieldClass)],
    [
      fieldLabel<Msg>(props.name, props.label),
      el(
        "input",
        [
          attr("id", props.name),
          attr("name", props.name),
          attr("type", type),
          attr("value", props.value),
          attr("class", inputClass),
          ...more,
          ...errorAria(props.name, props.error),
          ...(props.disabled
            ? [attr("disabled", "")]
            : []),
          onInput(props.onInput),
        ],
        [],
      ),
      ...fieldError<Msg>(props.name, props.error),
    ],
  );

/**
 * A NUMBER INPUT: a number, with the browser's own
 * stepping and its numeric keyboard on a phone. The
 * value stays text, as typed; the caller parses it.
 */
export type NumberInputProps<Msg> =
  TypedFieldProps<Msg> &
    Readonly<{
      min: Option<number>;
      max: Option<number>;
      step: Option<number>;
    }>;
export const numberInput = <Msg>(
  props: NumberInputProps<Msg>,
): Html<Msg> =>
  typedField("number", props, [
    attr("inputmode", "decimal"),
    ...given("min", props.min),
    ...given("max", props.max),
    ...given("step", props.step),
  ]);

/**
 * A DATE INPUT: a day, picked with the browser's own
 * calendar. The value is `YYYY-MM-DD`, or empty.
 */
export type DateInputProps<Msg> =
  TypedFieldProps<Msg>;
export const dateInput = <Msg>(
  props: DateInputProps<Msg>,
): Html<Msg> => typedField("date", props, []);

/**
 * A SEARCH FIELD: the words a list is narrowed by. Its
 * label is spoken but not drawn — the field's place
 * above the list already says what it is for.
 */
export type SearchFieldProps<Msg> = Readonly<{
  name: SoftStr;
  label: SoftStr;
  value: SoftStr;
  placeholder: SoftStr;
  onInput: (value: SoftStr) => Msg;
}>;
export const searchField = <Msg>(
  props: SearchFieldProps<Msg>,
): Html<Msg> =>
  el(
    "div",
    [
      attr("class", searchClass),
      attr("role", "search"),
    ],
    [
      el(
        "input",
        [
          attr("type", "search"),
          attr("name", props.name),
          attr("value", props.value),
          attr("placeholder", props.placeholder),
          attr("aria-label", props.label),
          attr("class", inputClass),
          onInput(props.onInput),
        ],
        [],
      ),
    ],
  );

/**
 * A SLIDER: a value within a range, where the feel of
 * more or less matters more than the exact number —
 * which is still written beside it.
 */
export type SliderProps<Msg> = Readonly<{
  name: SoftStr;
  label: SoftStr;
  value: number;
  min: number;
  max: number;
  step: number;
  onInput: (value: SoftStr) => Msg;
}>;
export const slider = <Msg>(
  props: SliderProps<Msg>,
): Html<Msg> =>
  el(
    "div",
    [attr("class", fieldClass)],
    [
      fieldLabel<Msg>(props.name, props.label),
      el(
        "div",
        [attr("class", rangeClass)],
        [
          el(
            "input",
            [
              attr("id", props.name),
              attr("name", props.name),
              attr("type", "range"),
              attr("min", String(props.min)),
              attr("max", String(props.max)),
              attr("step", String(props.step)),
              attr("value", String(props.value)),
              onInput(props.onInput),
            ],
            [],
          ),
          el(
            "output",
            [
              attr("for", props.name),
              attr("class", rangeValueClass),
            ],
            [text(String(props.value))],
          ),
        ],
      ),
    ],
  );

/**
 * A FILE INPUT: a file handed over, through the
 * browser's own picker. What comes back is the name the
 * browser reports; reading the file is the caller's
 * effect.
 */
export type FileInputProps<Msg> = Readonly<{
  name: SoftStr;
  label: SoftStr;
  accept: Option<SoftStr>;
  onChange: (name: SoftStr) => Msg;
}>;
export const fileInput = <Msg>(
  props: FileInputProps<Msg>,
): Html<Msg> =>
  el(
    "div",
    [attr("class", fieldClass)],
    [
      fieldLabel<Msg>(props.name, props.label),
      el(
        "input",
        [
          attr("id", props.name),
          attr("name", props.name),
          attr("type", "file"),
          attr("class", inputClass),
          ...matchOption<
            SoftStr,
            ReadonlyArray<ReturnType<typeof attr>>
          >(
            () => [],
            (accept: SoftStr) => [
              attr("accept", accept),
            ],
          )(props.accept),
          onChange(props.onChange),
        ],
        [],
      ),
    ],
  );

import {
  type SoftStr,
  type Option,
  matchOption,
} from "plgg";
import {
  type Html,
  type Attribute,
  el,
  text,
  attr,
  class_,
  onClick,
  onInput,
  onChange,
} from "plgg-view";
import {
  propsClass,
  propClass,
  propLabelClass,
  propControlClass,
  switchClass,
  switchTrackClass,
  switchThumbClass,
  switchLabelClass,
  inputClass,
} from "plggmatic/Meta/model/classHooks";
import { type SelectOption } from "plggmatic/Component/usecase/selectInput";

/**
 * THE PROPERTY LIST: the settings of one thing, a row per
 * property — its name on the left, the control that sets
 * it on the right. The form of an inspector, a side panel,
 * a preferences pane: many short settings read down a
 * column, not a document form filled in top to bottom.
 *
 * **Recorded rule**: a property row holds exactly ONE
 * control and that control's value is its whole state — a
 * choice ({@link choice}), an entry ({@link entry}) or a
 * switch ({@link toggle}). There is no submit: a row takes
 * effect when its control changes. The name is a real
 * `<label for>`, so it names the control to assistive tech
 * and clicking it reaches the control.
 */
export const propertyList = <Msg>(
  label: SoftStr,
  rows: ReadonlyArray<Html<Msg>>,
): Html<Msg> =>
  el(
    "div",
    [
      class_(propsClass),
      attr("role", "group"),
      attr("aria-label", label),
    ],
    rows,
  );

/** One row: `label` names the control with id `name`. */
export const propertyRow = <Msg>(
  name: SoftStr,
  label: SoftStr,
  control: Html<Msg>,
): Html<Msg> =>
  el(
    "div",
    [class_(propClass)],
    [
      el(
        "label",
        [
          class_(propLabelClass),
          attr("for", name),
        ],
        [text(label)],
      ),
      el(
        "div",
        [class_(propControlClass)],
        [control],
      ),
    ],
  );

const off = <Msg>(
  disabled: boolean,
): ReadonlyArray<Attribute<Msg>> =>
  disabled ? [attr("disabled", "")] : [];

export type ChoiceProps<Msg> = Readonly<{
  name: SoftStr;
  value: SoftStr;
  options: ReadonlyArray<SelectOption>;
  disabled: boolean;
  onChange: (value: SoftStr) => Msg;
}>;

/** One of a few named values: a bare `<select>`. */
export const choice = <Msg>(
  props: ChoiceProps<Msg>,
): Html<Msg> =>
  el(
    "select",
    [
      attr("id", props.name),
      attr("name", props.name),
      class_(inputClass),
      ...off<Msg>(props.disabled),
      onChange<Msg>(props.onChange),
    ],
    props.options.map((o) =>
      el(
        "option",
        o.value === props.value
          ? [
              attr("value", o.value),
              attr("selected", ""),
            ]
          : [attr("value", o.value)],
        [text(o.label)],
      ),
    ),
  );

export type EntryProps<Msg> = Readonly<{
  name: SoftStr;
  value: SoftStr;
  placeholder: Option<SoftStr>;
  /** Digits are expected (the keyboard offered says so). */
  numeric: boolean;
  disabled: boolean;
  onInput: (value: SoftStr) => Msg;
}>;

/** A short typed value: a bare `<input>`. */
export const entry = <Msg>(
  props: EntryProps<Msg>,
): Html<Msg> =>
  el(
    "input",
    [
      attr("id", props.name),
      attr("name", props.name),
      attr("type", "text"),
      attr("value", props.value),
      class_(inputClass),
      ...(props.numeric
        ? [attr("inputmode", "numeric")]
        : []),
      ...matchOption<
        SoftStr,
        ReadonlyArray<Attribute<Msg>>
      >(
        () => [],
        (hint: SoftStr) => [
          attr("placeholder", hint),
        ],
      )(props.placeholder),
      ...off<Msg>(props.disabled),
      onInput<Msg>(props.onInput),
    ],
    [],
  );

export type ToggleProps<Msg> = Readonly<{
  name: SoftStr;
  on: boolean;
  /** The words for the two states, e.g. "オン" / "オフ". */
  onLabel: SoftStr;
  offLabel: SoftStr;
  disabled: boolean;
  onToggle: Msg;
}>;

/**
 * Yes or no: a switch. A real `<button role="switch">`
 * with `aria-checked`, so it is one tab stop, Space and
 * Enter flip it, and its state is announced — and it says
 * which way it stands in WORDS beside the track, never by
 * position or colour alone.
 */
export const toggle = <Msg>(
  props: ToggleProps<Msg>,
): Html<Msg> =>
  el(
    "button",
    [
      attr("type", "button"),
      attr("id", props.name),
      attr("role", "switch"),
      attr(
        "aria-checked",
        props.on ? "true" : "false",
      ),
      class_(switchClass),
      ...(props.disabled
        ? [attr("disabled", "")]
        : [onClick<Msg>(props.onToggle)]),
    ],
    [
      el(
        "span",
        [class_(switchTrackClass)],
        [
          el(
            "span",
            [class_(switchThumbClass)],
            [],
          ),
        ],
      ),
      el(
        "span",
        [class_(switchLabelClass)],
        [
          text(
            props.on
              ? props.onLabel
              : props.offLabel,
          ),
        ],
      ),
    ],
  );

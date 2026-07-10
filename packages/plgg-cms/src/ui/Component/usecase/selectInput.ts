import { type SoftStr } from "plgg";
import {
  type Option,
} from "plgg";
import {
  type Html,
  slot,
  select,
  option,
  text,
  attr,
  id_,
  name_,
  disabled_,
  onChange,
} from "plgg-view";
import { style_ } from "plgg-cms/ui/styleEntry";
import { focusRing } from "plgg-cms/ui/Component/model/interaction";
import { cssPrefix } from "plgg-cms/ui/Meta/model/identity";
import {
  fieldLabel,
  errorAria,
  fieldError,
} from "plgg-cms/ui/Form/usecase/controlParts";

/** One choice in a {@link selectInput}. */
export type SelectOption = Readonly<{
  value: SoftStr;
  label: SoftStr;
}>;

/**
 * A CONTROLLED dropdown. The selected `value` comes from
 * props (the matching `option` carries `selected`), it is
 * labelled by id, and shows errors via `aria-invalid` +
 * `aria-describedby`. `<select>` is deliberately outside
 * the runtime's controlled-property sync (its selection
 * is driven by the marked option), so this stays a pure
 * view. `onChange` reports the newly-chosen value.
 */
export type SelectProps<Msg> = Readonly<{
  name: SoftStr;
  label: SoftStr;
  value: SoftStr;
  options: ReadonlyArray<SelectOption>;
  error: Option<SoftStr>;
  disabled: boolean;
  onChange: (value: SoftStr) => Msg;
}>;

export const selectInput = <Msg>(
  props: SelectProps<Msg>,
): Html<Msg, "div"> =>
  slot(
    [attr("class", `${cssPrefix}-field`)],
    [
      fieldLabel<Msg>(props.name, props.label),
      select(
        [
          id_(props.name),
          name_(props.name),
          ...errorAria(props.name, props.error),
          ...disabled_(props.disabled),
          style_(
            `${cssPrefix}-input`,
            focusRing,
          ),
          onChange(props.onChange),
        ],
        props.options.map(
          (o: SelectOption) =>
            option(
              [
                attr("value", o.value),
                ...(o.value === props.value
                  ? [attr("selected", "")]
                  : []),
              ],
              [text(o.label)],
            ),
        ),
      ),
      ...fieldError<Msg>(props.name, props.error),
    ],
  );

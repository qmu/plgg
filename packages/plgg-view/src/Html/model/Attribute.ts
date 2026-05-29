import { Box, SoftStr, box, pattern } from "plgg";

/**
 * A single attribute on an {@link Html} element, parameterized by the app's
 * `Msg`. Either a static `name`/`value` pair, or an event handler that turns a
 * DOM event payload (an input's value, or `""` for click/submit) into a `Msg`.
 * This handler channel is what makes the view tree `Html<Msg>` rather than a
 * passive, string-only view tree — events flow back to the app as `Msg` data.
 */
export type Attribute<Msg> =
  | Box<
      "Attr",
      Readonly<{ name: SoftStr; value: SoftStr }>
    >
  | Box<
      "Handler",
      Readonly<{
        event: SoftStr;
        toMsg: (payload: SoftStr) => Msg;
      }>
    >;

/** Pattern matchers for folding an {@link Attribute} with `match`. */
export const attr$ = () => pattern("Attr")();
export const handler$ = () => pattern("Handler")();

/**
 * A static attribute. Carries no `Msg`, so it is `Attribute<never>` — usable in
 * any `Attribute<Msg>` list.
 */
export const attr = (
  name: SoftStr,
  value: SoftStr,
): Attribute<never> => box("Attr")({ name, value });

/**
 * A raw event handler: the runtime calls `toMsg` with a payload string (the
 * target's `value` where it has one, else `""`) and dispatches the result.
 */
export const on = <Msg>(
  event: SoftStr,
  toMsg: (payload: SoftStr) => Msg,
): Attribute<Msg> =>
  box("Handler")({ event, toMsg });

/** Click handler (payload ignored). */
export const onClick = <Msg>(
  msg: Msg,
): Attribute<Msg> => on("click", () => msg);

/** Input handler: receives the input's current value. */
export const onInput = <Msg>(
  toMsg: (value: SoftStr) => Msg,
): Attribute<Msg> => on("input", toMsg);

/** Change handler: receives the control's value. */
export const onChange = <Msg>(
  toMsg: (value: SoftStr) => Msg,
): Attribute<Msg> => on("change", toMsg);

/** Submit handler (payload ignored; the runtime calls `preventDefault`). */
export const onSubmit = <Msg>(
  msg: Msg,
): Attribute<Msg> => on("submit", () => msg);

/** `class` attribute (`class` is a reserved word). */
export const class_ = (
  value: SoftStr,
): Attribute<never> => attr("class", value);

/** `href` attribute. */
export const href = (
  value: SoftStr,
): Attribute<never> => attr("href", value);

/** `type` attribute (`type` is a reserved word). */
export const type_ = (
  value: SoftStr,
): Attribute<never> => attr("type", value);

/** `value` attribute. */
export const value_ = (
  value: SoftStr,
): Attribute<never> => attr("value", value);

/** `name` attribute. */
export const name_ = (
  value: SoftStr,
): Attribute<never> => attr("name", value);

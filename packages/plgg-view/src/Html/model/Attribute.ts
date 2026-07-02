import {
  Box,
  Option,
  SoftStr,
  Float,
  box,
  pattern,
  some,
  none,
  fromNullable,
} from "plgg";

/**
 * One style endpoint of a {@link Motion}: only the two cheap-to-composite
 * properties (opacity + transform), each an {@link Option} so a frame states
 * exactly what it touches. Deliberately a small typed subset (rich typing only
 * where confusion can occur), never an arbitrary CSS bag.
 */
export type Frame = Readonly<{
  opacity: Option<Float>;
  transform: Option<SoftStr>;
}>;

/**
 * One declarative tween, described as pure data — the renderer hands `from`/`to`
 * to the Web Animations API (GPU-composited, interruptible). Carries no `Msg`
 * and no DOM reference, so it is SSR-droppable and lives in the core.
 */
export type Motion = Readonly<{
  from: Frame;
  to: Frame;
  durationMs: number;
  easing: SoftStr;
  /**
   * Optional start delay. With a delay the renderer holds the `from` frame
   * during the wait (WAAPI `fill: "both"`), so e.g. a survivor can sit at its
   * old position while a deleted row fades, then slide — never *over* it.
   */
  delayMs?: number;
}>;

/**
 * A single attribute on an {@link Html} element, parameterized by the app's
 * `Msg`. Either a static `name`/`value` pair, an event handler that turns a
 * DOM event payload (an input's value, or `""` for click/submit) into a `Msg`,
 * or an `Anim` enter/exit transition directive. The handler channel is what
 * makes the view tree `Html<Msg>` rather than a passive, string-only view tree;
 * `Anim` is — like a handler — non-attribute metadata that SSR drops and only
 * the client renderer interprets.
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
    >
  | Box<
      "Anim",
      Readonly<{
        enter: Option<Motion>;
        exit: Option<Motion>;
      }>
    >
  | Box<
      "Css",
      Readonly<{
        classes: SoftStr;
        rules: ReadonlyArray<CssRule>;
      }>
    >
  | Box<
      "Key",
      Readonly<{ value: SoftStr }>
    >;

/**
 * One atomic CSS rule as pure data: a content-hashed `className`, an optional
 * `selector` suffix (`""`, `":hover"`, …), and a single declaration. The
 * client renderer / SSR `class` attribute carries the className; `collectCss`
 * folds the rules of a tree into the deduped stylesheet. Defined here (not in
 * `Style`) so `Html` does not depend on `Style`.
 */
export type CssRule = Readonly<{
  className: SoftStr;
  selector: SoftStr;
  prop: SoftStr;
  value: SoftStr;
}>;

/** Pattern matchers for folding an {@link Attribute} with `match`. */
export const attr$ = () => pattern("Attr")();
export const handler$ = () =>
  pattern("Handler")();
export const anim$ = () => pattern("Anim")();
export const css$ = () => pattern("Css")();
export const key$ = () => pattern("Key")();

/**
 * A static attribute. Carries no `Msg`, so it is `Attribute<never>` — usable in
 * any `Attribute<Msg>` list.
 */
export const attr = (
  name: SoftStr,
  value: SoftStr,
): Attribute<never> =>
  box("Attr")({ name, value });

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

/**
 * Stable identity for keyed reconciliation. Carries no `Msg` (like
 * {@link class_}/{@link transition}), so it drops into any attribute list; SSR
 * drops it (the server has no re-renders) and the client renderer reads it to
 * match a node to its previous self across renders. Keying a list's children is
 * what lets the renderer move/insert/remove the *right* node — so the *right*
 * element plays its enter/exit motion and survivors FLIP into place — instead of
 * the index-based fallback rewriting slots in place.
 */
export const key = (
  value: SoftStr,
): Attribute<never> => box("Key")({ value });

/**
 * Refined easing curves — the single source of truth for motion feel, so the
 * whole system reads consistently instead of leaning on the browser's cheap
 * `ease`/`ease-in`/`ease-out` defaults. `easeOut` (expo-out) gives a confident,
 * smooth settle for things arriving/moving; `easeIn` a clean quick exit;
 * `easeInOut` a balanced glide for repositioning (FLIP).
 */
export const easeOut = "cubic-bezier(0.16, 1, 0.3, 1)";
export const easeIn = "cubic-bezier(0.5, 0, 0.75, 0)";
export const easeInOut =
  "cubic-bezier(0.65, 0, 0.35, 1)";

/** A {@link Frame} from its two optional properties. */
const frame = (
  opacity: Option<Float>,
  transform: Option<SoftStr>,
): Frame => ({ opacity, transform });

/**
 * A declarative enter/exit transition (Svelte's `transition:`/`in:`/`out:`).
 * Carries no `Msg`, so — like {@link class_} — it drops into any attribute
 * list; SSR drops it and the client renderer plays it.
 */
export const transition = (
  motions: Readonly<{
    enter?: Motion;
    exit?: Motion;
  }>,
): Attribute<never> =>
  box("Anim")({
    enter: fromNullable(motions.enter),
    exit: fromNullable(motions.exit),
  });

/** Fade a node in as it enters. */
export const fadeIn = (
  durationMs: number,
): Attribute<never> =>
  transition({
    enter: {
      from: frame(some(box("Float")(0)), none()),
      to: frame(some(box("Float")(1)), none()),
      durationMs,
      easing: easeOut,
    },
  });

/** Fade a node out before it is removed. */
export const fadeOut = (
  durationMs: number,
): Attribute<never> =>
  transition({
    exit: {
      from: frame(some(box("Float")(1)), none()),
      to: frame(some(box("Float")(0)), none()),
      durationMs,
      easing: easeIn,
    },
  });

/**
 * Slide + fade a node in from a vertical offset (e.g. `"12px"`).
 */
export const slideIn = (
  from: SoftStr,
  durationMs: number,
): Attribute<never> =>
  transition({
    enter: {
      from: frame(
        some(box("Float")(0)),
        some(`translateY(${from})`),
      ),
      to: frame(
        some(box("Float")(1)),
        some("translateY(0)"),
      ),
      durationMs,
      easing: easeOut,
    },
  });

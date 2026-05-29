import { Box, SoftStr, pattern } from "plgg";
import { Attribute } from "plgg-view/Html/model/Attribute";

/**
 * The view as **pure data**, parameterized by the app's `Msg` — the clean-slate
 * successor to `VNode`. A `Box` union: an intrinsic `Element` (tag + attributes
 * carrying event handlers + children) or a `Text` leaf. Function "components"
 * are just functions returning `Html<Msg>`; there is no class, no DOM node — the
 * runtime turns this into DOM (client) or a string (SSR).
 */
export type Html<Msg> =
  | Box<"Element", ElementContent<Msg>>
  | Box<"Text", Readonly<{ value: SoftStr }>>;

/**
 * The content of an intrinsic element: a tag, its {@link Attribute}s (static
 * attrs + `Msg`-producing handlers), and its children.
 */
export type ElementContent<Msg> = Readonly<{
  tag: SoftStr;
  attributes: ReadonlyArray<Attribute<Msg>>;
  children: ReadonlyArray<Html<Msg>>;
}>;

/** Pattern matchers for folding an {@link Html} node with `match`. */
export const element$ = () => pattern("Element")();
export const text$ = () => pattern("Text")();

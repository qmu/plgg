import { Box, SoftStr, pattern } from "plgg";
import { Attribute } from "plgg-view/Html/model/Attribute";

/**
 * The view as **pure data**, parameterized by the app's `Msg` and the element's
 * tag `T`. A `Box` union: an intrinsic `Element` (tag + attributes carrying
 * event handlers + children) or a `Text` leaf. Function "components" are just
 * functions returning `Html<Msg>`; there is no class, no DOM node — the runtime
 * turns this into DOM (client) or a string (SSR).
 *
 * `T` brands the element's tag at the type level (the tag is already stored as
 * data, so the brand is real, not phantom — no cast). It defaults to `string`,
 * so the bare `Html<Msg>` stays the permissive supertype every consumer uses,
 * while the tag-specific builders in `element.ts` return a narrowed
 * `Html<Msg, "div">` etc. that lets a parent restrict which children it
 * accepts. The runtime payload is identical regardless of `T`.
 */
export type Html<
  Msg,
  T extends string = string,
> =
  | Box<"Element", ElementContent<Msg, T>>
  | Box<"Text", Readonly<{ value: SoftStr }>>;

/**
 * The content of an intrinsic element: a tag (branded by `T`), its
 * {@link Attribute}s (static attrs + `Msg`-producing handlers), and its
 * children. Children stay the uniform `ReadonlyArray<Html<Msg>>` at the data
 * layer — the content-model restriction lives only in the builder signatures,
 * so the fold/map/render traversals keep treating children homogeneously.
 */
export type ElementContent<
  Msg,
  T extends string = string,
> = Readonly<{
  tag: T;
  attributes: ReadonlyArray<Attribute<Msg>>;
  children: ReadonlyArray<Html<Msg>>;
}>;

/** Pattern matchers for folding an {@link Html} node with `match`. */
export const element$ = () =>
  pattern("Element")();
export const text$ = () => pattern("Text")();

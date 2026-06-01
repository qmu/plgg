import { SoftStr, box } from "plgg";
import {
  Html,
  ElementContent,
} from "plgg-view/Html/model/Html";
import { Attribute } from "plgg-view/Html/model/Attribute";

/**
 * The general builder — the permissive **escape
 * hatch**. Accepts any children and brands the tag
 * only as `string`, so reach for it when the typed
 * content model below does not fit (custom tags,
 * transparency, table/select shapes not yet
 * modelled).
 */
export const el = <Msg>(
  tag: SoftStr,
  attributes: ReadonlyArray<Attribute<Msg>>,
  children: ReadonlyArray<Html<Msg>>,
): Html<Msg> =>
  box("Element")({ tag, attributes, children });

/**
 * A text leaf. Branded `"#text"` and carrying no
 * `Msg`, so it is usable in any `Html<Msg>` tree
 * and slots into any phrasing/flow position.
 */
export const text = (
  value: SoftStr,
): Html<never, "#text"> => box("Text")({ value });

/**
 * Phrasing content — the inline level. A child slot
 * typed `Phrasing<Msg>` accepts only these tags
 * (the set of things that may stand where text
 * would).
 */
export type Phrasing<Msg> = Html<
  Msg,
  | "span"
  | "a"
  | "strong"
  | "em"
  | "label"
  | "button"
  | "input"
  | "#text"
>;

/**
 * Flow content — the block level, a superset of
 * {@link Phrasing}. `li` is deliberately excluded:
 * it belongs only under `ul`, enforced by
 * {@link ListItem}.
 */
export type Flow<Msg> =
  | Phrasing<Msg>
  | Html<
      Msg,
      | "div"
      | "p"
      | "h1"
      | "h2"
      | "ul"
      | "section"
      | "header"
      | "main"
      | "form"
    >;

/**
 * A list item — the only child `ul`/`ol` accept.
 */
export type ListItem<Msg> = Html<Msg, "li">;

/**
 * Exactly one child of tag `T`, for a container
 * that must hold a single specific element. The
 * direct form is a single-value parameter
 * (`(child: Html<Msg, "summary">) => …`); this
 * tuple alias is the array form.
 */
export type One<
  Msg,
  T extends string,
> = readonly [Html<Msg, T>];

/**
 * One or more children of tag `T` (non-empty) — a
 * head-plus-rest tuple, so the empty case is a
 * compile error.
 */
export type NonEmpty<
  Msg,
  T extends string,
> = readonly [
  Html<Msg, T>,
  ...ReadonlyArray<Html<Msg, T>>,
];

/**
 * A flow-content container: brands its own tag and
 * accepts {@link Flow} children. Pins the tag
 * literal through an explicit content type — `box`'s
 * curried call would otherwise widen it to `string`
 * — so the brand survives with no cast.
 */
const flowEl =
  <T extends string>(name: T) =>
  <Msg>(
    attributes: ReadonlyArray<Attribute<Msg>>,
    children: ReadonlyArray<Flow<Msg>>,
  ): Html<Msg, T> =>
    box("Element")<ElementContent<Msg, T>>({
      tag: name,
      attributes,
      children,
    });

/**
 * A phrasing-content container — like
 * {@link flowEl} but accepting only
 * {@link Phrasing} children.
 */
const phrasingEl =
  <T extends string>(name: T) =>
  <Msg>(
    attributes: ReadonlyArray<Attribute<Msg>>,
    children: ReadonlyArray<Phrasing<Msg>>,
  ): Html<Msg, T> =>
    box("Element")<ElementContent<Msg, T>>({
      tag: name,
      attributes,
      children,
    });

/**
 * A list container (`ul`/`ol`): accepts only
 * {@link ListItem} children — `ul([], [div(…)])`
 * is a compile error.
 */
const listEl =
  <T extends string>(name: T) =>
  <Msg>(
    attributes: ReadonlyArray<Attribute<Msg>>,
    children: ReadonlyArray<ListItem<Msg>>,
  ): Html<Msg, T> =>
    box("Element")<ElementContent<Msg, T>>({
      tag: name,
      attributes,
      children,
    });

/**
 * A void element (e.g. `input`): the empty tuple
 * `readonly []` makes "no children" a type-level
 * guarantee rather than a convention.
 */
const voidEl =
  <T extends string>(name: T) =>
  <Msg>(
    attributes: ReadonlyArray<Attribute<Msg>>,
    children: readonly [],
  ): Html<Msg, T> =>
    box("Element")<ElementContent<Msg, T>>({
      tag: name,
      attributes,
      children,
    });

// Flow-content containers.
export const div = flowEl("div");
export const section = flowEl("section");
export const header = flowEl("header");
export const main_ = flowEl("main");
export const form = flowEl("form");
export const li = flowEl("li");
export const a = flowEl("a");

// Phrasing-content containers.
export const span = phrasingEl("span");
export const strong = phrasingEl("strong");
export const em = phrasingEl("em");
export const label = phrasingEl("label");
export const button = phrasingEl("button");
export const h1 = phrasingEl("h1");
export const h2 = phrasingEl("h2");
export const p = phrasingEl("p");

// List container — only `li` children.
export const ul = listEl("ul");

// Void element — no children.
export const input = voidEl("input");

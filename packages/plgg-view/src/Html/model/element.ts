import { SoftStr, box } from "plgg";
import { Html } from "plgg-view/Html/model/Html";
import { Attribute } from "plgg-view/Html/model/Attribute";

/**
 * Constructs an intrinsic element node — the general builder. Tag-specific
 * helpers below are thin wrappers, mirroring Elm's `div`/`button`/… hyperscript.
 */
export const el = <Msg>(
  tag: SoftStr,
  attributes: ReadonlyArray<Attribute<Msg>>,
  children: ReadonlyArray<Html<Msg>>,
): Html<Msg> =>
  box("Element")({ tag, attributes, children });

/**
 * A text leaf. Carries no `Msg`, so it is `Html<never>` — usable in any
 * `Html<Msg>` tree.
 */
export const text = (value: SoftStr): Html<never> =>
  box("Text")({ value });

const tag =
  (name: SoftStr) =>
  <Msg>(
    attributes: ReadonlyArray<Attribute<Msg>>,
    children: ReadonlyArray<Html<Msg>>,
  ): Html<Msg> =>
    el(name, attributes, children);

export const div = tag("div");
export const span = tag("span");
export const p = tag("p");
export const h1 = tag("h1");
export const h2 = tag("h2");
export const ul = tag("ul");
export const li = tag("li");
export const a = tag("a");
export const button = tag("button");
export const input = tag("input");
export const form = tag("form");
export const label = tag("label");
export const main_ = tag("main");
export const section = tag("section");
export const header = tag("header");
export const strong = tag("strong");
export const em = tag("em");

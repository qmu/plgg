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
 * A content slot — a flow-positioned container for
 * ALREADY-BUILT Html of any tag (a rendered Markdown
 * body, opaque highlighter output). Pins its own tag
 * to `"div"` so the slot is itself valid {@link Flow}
 * content and nests in the typed containers, while
 * accepting the permissive `Html<Msg>` children the
 * content model cannot statically constrain. Unlike
 * {@link el} it keeps a concrete tag brand (so it
 * stays {@link Flow}-assignable); unlike {@link
 * flowEl} it does not narrow its children. Type-sound
 * because {@link ElementContent} already stores
 * children as `ReadonlyArray<Html<Msg>>` — the
 * content-model restriction lives only in the other
 * builders' signatures. This is the typed seam for
 * handing a rendered fragment to the document shell.
 */
export const slot = <Msg>(
  attributes: ReadonlyArray<Attribute<Msg>>,
  children: ReadonlyArray<Html<Msg>>,
): Html<Msg, "div"> =>
  box("Element")<ElementContent<Msg, "div">>({
    tag: "div",
    attributes,
    children,
  });

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
  | "code"
  | "img"
  | "br"
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
      | "h3"
      | "h4"
      | "h5"
      | "h6"
      | "ul"
      | "ol"
      | "pre"
      | "hr"
      | "blockquote"
      | "nav"
      | "details"
      | "table"
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
 * The content of `pre`: either a single `code`
 * element (the fenced-block shape `pre>code`) or
 * raw text. Per the plgg-press spike, a code fence
 * renders as `<pre><code>…</code></pre>` and an
 * unhighlighted block as `<pre>text</pre>`.
 */
export type PreContent<Msg> = Html<
  Msg,
  "code" | "#text"
>;

/**
 * What a `table` accepts directly: row groups
 * (`thead`/`tbody`) or bare rows (`tr`).
 */
export type TableContent<Msg> = Html<
  Msg,
  "thead" | "tbody" | "tr"
>;

/**
 * A table row — the only child a row group
 * (`thead`/`tbody`) or a `tr`-bearing `table`
 * accepts.
 */
export type TableRow<Msg> = Html<Msg, "tr">;

/**
 * A table cell — header (`th`) or data (`td`), the
 * only children a `tr` accepts.
 */
export type TableCell<Msg> = Html<
  Msg,
  "th" | "td"
>;

/**
 * What `details` accepts: its `summary` label plus
 * any {@link Flow} content (the disclosure body).
 */
export type DetailsContent<Msg> =
  | Html<Msg, "summary">
  | Flow<Msg>;

/**
 * What the `html` document root accepts: the `head`
 * and the `body`.
 */
export type DocumentContent<Msg> = Html<
  Msg,
  "head" | "body"
>;

/**
 * What `head` accepts: document metadata —
 * `title`, `meta`, `link`, `style`.
 */
export type HeadContent<Msg> = Html<
  Msg,
  "title" | "meta" | "link" | "style"
>;

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

/**
 * A text-only container (`title`/`style`): accepts
 * only {@link text} leaves, so the SSR escaper is
 * the sole gate on its contents.
 */
const textEl =
  <T extends string>(name: T) =>
  <Msg>(
    attributes: ReadonlyArray<Attribute<Msg>>,
    children: ReadonlyArray<Html<Msg, "#text">>,
  ): Html<Msg, T> =>
    box("Element")<ElementContent<Msg, T>>({
      tag: name,
      attributes,
      children,
    });

/**
 * A `pre` container: accepts {@link PreContent} — a
 * `code` child or text — so `pre>code` and a bare
 * `pre` text block are both typed, no `el()` hatch.
 */
const preEl =
  <T extends string>(name: T) =>
  <Msg>(
    attributes: ReadonlyArray<Attribute<Msg>>,
    children: ReadonlyArray<PreContent<Msg>>,
  ): Html<Msg, T> =>
    box("Element")<ElementContent<Msg, T>>({
      tag: name,
      attributes,
      children,
    });

/**
 * A `table` container: accepts {@link TableContent}
 * (row groups or bare rows).
 */
const tableEl =
  <T extends string>(name: T) =>
  <Msg>(
    attributes: ReadonlyArray<Attribute<Msg>>,
    children: ReadonlyArray<TableContent<Msg>>,
  ): Html<Msg, T> =>
    box("Element")<ElementContent<Msg, T>>({
      tag: name,
      attributes,
      children,
    });

/**
 * A row-group container (`thead`/`tbody`): accepts
 * only {@link TableRow} children.
 */
const rowGroupEl =
  <T extends string>(name: T) =>
  <Msg>(
    attributes: ReadonlyArray<Attribute<Msg>>,
    children: ReadonlyArray<TableRow<Msg>>,
  ): Html<Msg, T> =>
    box("Element")<ElementContent<Msg, T>>({
      tag: name,
      attributes,
      children,
    });

/**
 * A `tr` container: accepts only {@link TableCell}
 * children (`th`/`td`).
 */
const rowEl =
  <T extends string>(name: T) =>
  <Msg>(
    attributes: ReadonlyArray<Attribute<Msg>>,
    children: ReadonlyArray<TableCell<Msg>>,
  ): Html<Msg, T> =>
    box("Element")<ElementContent<Msg, T>>({
      tag: name,
      attributes,
      children,
    });

/**
 * A `details` container: accepts
 * {@link DetailsContent} — a `summary` label plus
 * {@link Flow} body content.
 */
const detailsEl =
  <T extends string>(name: T) =>
  <Msg>(
    attributes: ReadonlyArray<Attribute<Msg>>,
    children: ReadonlyArray<DetailsContent<Msg>>,
  ): Html<Msg, T> =>
    box("Element")<ElementContent<Msg, T>>({
      tag: name,
      attributes,
      children,
    });

/**
 * The `html` document root: accepts
 * {@link DocumentContent} — `head` and `body`.
 */
const documentEl =
  <T extends string>(name: T) =>
  <Msg>(
    attributes: ReadonlyArray<Attribute<Msg>>,
    children: ReadonlyArray<DocumentContent<Msg>>,
  ): Html<Msg, T> =>
    box("Element")<ElementContent<Msg, T>>({
      tag: name,
      attributes,
      children,
    });

/**
 * The `head` container: accepts {@link HeadContent}
 * — `title`/`meta`/`link`/`style` metadata.
 */
const headEl =
  <T extends string>(name: T) =>
  <Msg>(
    attributes: ReadonlyArray<Attribute<Msg>>,
    children: ReadonlyArray<HeadContent<Msg>>,
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

export const blockquote = flowEl("blockquote");
export const nav = flowEl("nav");
export const th = flowEl("th");
export const td = flowEl("td");
export const body = flowEl("body");

// Phrasing-content containers.
export const span = phrasingEl("span");
export const strong = phrasingEl("strong");
export const em = phrasingEl("em");
export const label = phrasingEl("label");
export const button = phrasingEl("button");
export const h1 = phrasingEl("h1");
export const h2 = phrasingEl("h2");
export const h3 = phrasingEl("h3");
export const h4 = phrasingEl("h4");
export const h5 = phrasingEl("h5");
export const h6 = phrasingEl("h6");
export const p = phrasingEl("p");
export const code = phrasingEl("code");
export const summary = phrasingEl("summary");

// List containers — only `li` children.
export const ul = listEl("ul");
export const ol = listEl("ol");

// Void elements — no children.
export const input = voidEl("input");
export const img = voidEl("img");
export const br = voidEl("br");
export const hr = voidEl("hr");
export const meta = voidEl("meta");
export const link = voidEl("link");

// `pre` — a `code` child or text.
export const pre = preEl("pre");

// Table family — typed content-model containers.
export const table = tableEl("table");
export const thead = rowGroupEl("thead");
export const tbody = rowGroupEl("tbody");
export const tr = rowEl("tr");

// Disclosure — `details` holds a `summary` + flow.
export const details = detailsEl("details");

// Document shell — first-class typed builders.
export const html = documentEl("html");
export const head = headEl("head");
export const title = textEl("title");
export const style = textEl("style");

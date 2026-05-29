import { SoftStr, match } from "plgg";
import { Html } from "plgg-view/Html/model/Html";
import {
  Attribute,
  attr$,
  handler$,
} from "plgg-view/Html/model/Attribute";
import { foldHtml } from "plgg-view/Html/usecase/foldHtml";
import {
  escapeText,
  escapeAttr,
  isSafeAttrName,
} from "plgg-view/Html/usecase/escape";

/**
 * HTML void elements: self-closing, never carrying children.
 */
const VOID_TAGS: ReadonlyArray<SoftStr> = [
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
];

/**
 * Renders one {@link Attribute} to its leading-space markup — a static attr
 * becomes `name="escaped"` (unsafe names dropped); an event handler emits
 * nothing (the server has no events). The single HTML output seam, so the
 * result is XSS-safe by construction.
 */
const renderAttribute = <Msg>(
  attribute: Attribute<Msg>,
): SoftStr =>
  match(attribute)(
    [
      attr$(),
      ({ content }): SoftStr =>
        isSafeAttrName(content.name)
          ? ` ${content.name}="${escapeAttr(content.value)}"`
          : "",
    ],
    [handler$(), (): SoftStr => ""],
  );

/**
 * Server-side rendering: an {@link Html} tree → an HTML string. Event handlers
 * are dropped; text and attribute values are escaped.
 */
export const renderToString = <Msg>(
  node: Html<Msg>,
): SoftStr =>
  foldHtml<Msg, SoftStr>({
    text: (value) => escapeText(value),
    element: (tag, attributes, children) =>
      VOID_TAGS.some((t) => t === tag)
        ? `<${tag}${attributes.map(renderAttribute).join("")} />`
        : `<${tag}${attributes
            .map(renderAttribute)
            .join("")}>${children.join("")}</${tag}>`,
  })(node);

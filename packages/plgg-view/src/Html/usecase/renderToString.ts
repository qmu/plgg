import { SoftStr, match } from "plgg";
import { Html } from "plgg-view/Html/model/Html";
import {
  Attribute,
  attr$,
  handler$,
  anim$,
  css$,
  key$,
} from "plgg-view/Html/model/Attribute";
import { foldHtml } from "plgg-view/Html/usecase/foldHtml";
import {
  escapeText,
  escapeAttr,
  isSafeAttrName,
  isSafeTag,
  safeAttrValue,
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
 * becomes `name="escaped"` (unsafe names dropped); an event handler and an
 * animation directive both emit nothing (the server has no events and no
 * animation). The single HTML output seam, so the result is XSS-safe by
 * construction.
 */
const renderAttribute = <Msg>(
  attribute: Attribute<Msg>,
): SoftStr =>
  match(attribute)(
    [
      attr$(),
      ({ content }): SoftStr =>
        isSafeAttrName(content.name)
          ? ` ${content.name}="${escapeAttr(safeAttrValue(content.name, content.value))}"`
          : "",
    ],
    [handler$(), (): SoftStr => ""],
    [anim$(), (): SoftStr => ""],
    [key$(), (): SoftStr => ""],
    [
      css$(),
      ({ content }): SoftStr =>
        content.classes === ""
          ? ""
          : ` class="${escapeAttr(content.classes)}"`,
    ],
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
      // an unsafe tag (only reachable via the `el(tag, …)` hatch) is dropped
      // whole — it could otherwise inject markup, and there is no safe way to
      // emit an arbitrary tag string
      !isSafeTag(tag)
        ? ""
        : VOID_TAGS.some((t) => t === tag)
          ? `<${tag}${attributes.map(renderAttribute).join("")} />`
          : `<${tag}${attributes
              .map(renderAttribute)
              .join(
                "",
              )}>${children.join("")}</${tag}>`,
  })(node);

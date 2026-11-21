import { SoftStr, match } from "plgg";
import { Html } from "plgg-view/Html/model/Html";
import {
  Attribute,
  attr,
  attr$,
  handler$,
  eventHandler$,
  host$,
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
          ? ` ${content.name}="${escapeAttr(
              safeAttrValue(
                content.name,
                content.value,
              ),
            )}"`
          : "",
    ],
    [handler$(), (): SoftStr => ""],
    [eventHandler$(), (): SoftStr => ""],
    [host$(), (): SoftStr => ""],
    [anim$(), (): SoftStr => ""],
    [key$(), (): SoftStr => ""],
    [
      css$(),
      ({ content }): SoftStr =>
        content.classes === ""
          ? ""
          : ` class="${escapeAttr(
              content.classes,
            )}"`,
    ],
  );

/**
 * Server-side rendering: an {@link Html} tree → an HTML string. Event handlers
 * are dropped; text and attribute values are escaped.
 */
type Selection = {
  value: string;
  matched: boolean;
};

const named = <Msg>(
  attributes: ReadonlyArray<Attribute<Msg>>,
  name: string,
) =>
  attributes.find(
    (a) =>
      a.__tag === "Attr" &&
      a.content.name.toLowerCase() === name,
  );

const optionLabel = <Msg>(
  children: ReadonlyArray<Html<Msg>>,
): string =>
  children
    .map(
      foldHtml<Msg, string>({
        text: (value) => value,
        raw: () => "",
        element: (_tag, _attrs, values) =>
          values.join(""),
      }),
    )
    .join("")
    .replace(/[\t\n\f\r ]+/g, " ")
    .replace(/^ | $/g, "");

const serialize = <Msg>(
  node: Html<Msg>,
  selection?: Selection,
): string => {
  switch (node.__tag) {
    case "Text":
      return escapeText(node.content.value);
    case "Raw":
      return node.content.html;
    case "Lazy":
      return serialize(
        node.content.render(),
        selection,
      );
    case "Element": {
      const { tag, attributes, children } =
        node.content;
      if (!isSafeTag(tag)) return "";
      let attrs = attributes;
      let childSelection = selection;
      if (tag === "select") {
        const value = named(attributes, "value");
        childSelection =
          value?.__tag === "Attr" &&
          !named(attributes, "multiple")
            ? {
                value: value.content.value,
                matched: false,
              }
            : undefined;
      } else if (tag === "option" && selection) {
        const value = named(attributes, "value");
        const selected =
          !selection.matched &&
          selection.value ===
            (value?.__tag === "Attr"
              ? value.content.value
              : optionLabel(children));
        attrs = attributes.filter(
          (a) =>
            a.__tag !== "Attr" ||
            a.content.name.toLowerCase() !==
              "selected",
        );
        if (selected) {
          selection.matched = true;
          attrs = [
            ...attrs,
            attr("selected", ""),
          ];
        }
      }
      const open =
        "<" +
        tag +
        attrs.map(renderAttribute).join("");
      if (VOID_TAGS.includes(tag))
        return open + " />";
      return (
        (tag === "html"
          ? "<!doctype html>"
          : "") +
        open +
        ">" +
        children
          .map((child) =>
            serialize(child, childSelection),
          )
          .join("") +
        "</" +
        tag +
        ">"
      );
    }
  }
};

export const renderToString = <Msg>(
  node: Html<Msg>,
): SoftStr => serialize(node);

import { SoftStr } from "plgg";
import {
  VNode,
  Props,
  ElementContent,
  escapeText,
  escapeAttr,
  isSafeAttrName,
} from "plgg-view/index";

/**
 * HTML void elements: they are self-closing and never carry children, so the
 * renderer emits no end tag (and ignores any children handed to them).
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
 * Renders one `name="value"` pair, value escaped, dropping unsafe names.
 */
const renderProp = ([name, value]: readonly [
  SoftStr,
  SoftStr,
]): SoftStr =>
  isSafeAttrName(name)
    ? ` ${name}="${escapeAttr(value)}"`
    : "";

/**
 * Renders an attribute map into the leading-space attribute string.
 */
const renderProps = (props: Props): SoftStr =>
  Object.entries(props).map(renderProp).join("");

/**
 * Concatenates rendered children with no separator.
 */
const renderChildren = (
  children: ReadonlyArray<VNode>,
): SoftStr => children.map(renderToString).join("");

/**
 * Renders an element: void tags self-close, everything else wraps its children.
 */
const renderElement = (el: ElementContent): SoftStr =>
  VOID_TAGS.some((t) => t === el.tag)
    ? `<${el.tag}${renderProps(el.props)} />`
    : `<${el.tag}${renderProps(el.props)}>${renderChildren(
        el.children,
      )}</${el.tag}>`;

/**
 * Renders a {@link VNode} tree to an HTML string — the one entry point of this
 * POC (DOM mounting is deferred). A pure fold over the `Box` union: `Text` is
 * escaped, a `Fragment` is just its children, an `Element` is its tag wrapping
 * its escaped attributes and rendered children. Text and attribute escaping
 * happen here, at the only output seam, so the rendered string is XSS-safe by
 * construction.
 */
export const renderToString = (node: VNode): SoftStr =>
  node.__tag === "Text"
    ? escapeText(node.content.value)
    : node.__tag === "Fragment"
      ? renderChildren(node.content.children)
      : renderElement(node.content);

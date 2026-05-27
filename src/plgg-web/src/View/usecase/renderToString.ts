import { SoftStr } from "plgg";
import {
  VNode,
  Props,
  VNodeAlgebra,
  foldVNode,
} from "plgg-view";
import {
  escapeText,
  escapeAttr,
  isSafeAttrName,
} from "plgg-web/index";

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
 * The SSR algebra: fold a {@link VNode} into an HTML string. Text is escaped, a
 * fragment is just its children joined, an element wraps its escaped attributes
 * and rendered children (void tags self-close). Escaping happens here, the only
 * HTML output seam, so the result is XSS-safe by construction.
 */
const htmlAlgebra: VNodeAlgebra<SoftStr> = {
  text: (value) => escapeText(value),
  fragment: (children) => children.join(""),
  element: (tag, props, children) =>
    VOID_TAGS.some((t) => t === tag)
      ? `<${tag}${renderProps(props)} />`
      : `<${tag}${renderProps(props)}>${children.join(
          "",
        )}</${tag}>`,
};

/**
 * Server-side rendering: a {@link VNode} tree → an HTML string.
 */
export const renderToString: (node: VNode) => SoftStr =
  foldVNode(htmlAlgebra);

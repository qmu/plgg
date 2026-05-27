import {
  Box,
  Dict,
  SoftStr,
  Option,
  box,
  some,
  none,
  isSoftStr,
  isBoxWithTag,
} from "plgg";

/**
 * Element attributes, modeled the plgg way as a string-valued map. Values are
 * `SoftStr` because the only sink in this POC is `renderToString`, which emits
 * them as escaped attribute text; richer prop kinds (numbers, booleans) are
 * coerced to `SoftStr` at the `h`/`jsx` seam before they reach the model.
 */
export type Props = Dict<string, SoftStr>;

/**
 * The content of an {@link Element} node: a tag name, its attributes, and its
 * already-normalized children.
 */
export type ElementContent = Readonly<{
  tag: SoftStr;
  props: Props;
  children: ReadonlyArray<VNode>;
}>;

/**
 * The virtual-DOM node — the whole view as pure data, expressed as a plgg `Box`
 * union. An `Element` is a tag with attributes and children; a `Text` node is
 * escaped at render time; a `Fragment` groups children with no wrapping tag.
 * The type is recursive: children are themselves `VNode`s.
 */
export type VNode =
  | Box<"Element", ElementContent>
  | Box<"Text", Readonly<{ value: SoftStr }>>
  | Box<"Fragment", Readonly<{ children: ReadonlyArray<VNode> }>>;

/**
 * Anything accepted as a child before normalization: a node, a primitive that
 * lifts to a `Text` node, a "nothing" (`false`/`null`/`undefined` drop out so
 * `cond && <x/>` works), or a (possibly nested) array of the same.
 */
export type Child =
  | VNode
  | SoftStr
  | number
  | boolean
  | null
  | undefined
  | ReadonlyArray<Child>;

/**
 * Builds an {@link Element} node.
 */
export const element = (
  tag: SoftStr,
  props: Props,
  children: ReadonlyArray<VNode>,
): Box<"Element", ElementContent> =>
  box("Element")({ tag, props, children });

/**
 * Lifts a string into a {@link VNode} `Text` node. Its value is escaped only at
 * render time, never here, so the model stays raw.
 */
export const text = (
  value: SoftStr,
): Box<"Text", Readonly<{ value: SoftStr }>> =>
  box("Text")({ value });

/**
 * Groups children under no wrapping tag.
 */
export const fragment = (
  children: ReadonlyArray<VNode>,
): Box<"Fragment", Readonly<{ children: ReadonlyArray<VNode> }>> =>
  box("Fragment")({ children });

/**
 * Type guard for {@link VNode} — one of the three tagged boxes.
 */
export const isVNode = (value: unknown): value is VNode =>
  isBoxWithTag("Element")(value) ||
  isBoxWithTag("Text")(value) ||
  isBoxWithTag("Fragment")(value);

/**
 * Lifts a single raw child value into zero or more {@link VNode}s. Accepts
 * `unknown` so it also absorbs the loosely-typed `children` the JSX runtime
 * hands back: existing nodes pass through, strings/finite numbers become `Text`,
 * arrays flatten recursively, and everything else (booleans, `null`,
 * `undefined`, functions) drops out.
 */
export const normalizeChild = (
  value: unknown,
): ReadonlyArray<VNode> =>
  isVNode(value)
    ? [value]
    : isSoftStr(value)
      ? [text(value)]
      : typeof value === "number" && Number.isFinite(value)
        ? [text(String(value))]
        : Array.isArray(value)
          ? value.flatMap(normalizeChild)
          : [];

/**
 * Normalizes a list of raw children into a flat `VNode` array.
 */
export const normalizeChildren = (
  children: ReadonlyArray<Child>,
): ReadonlyArray<VNode> => children.flatMap(normalizeChild);

/**
 * Coerces one raw prop value into a `SoftStr`, or `None` when it should be
 * dropped: strings pass through, finite numbers stringify, `true` becomes the
 * empty string (a present boolean attribute) while `false` drops, and anything
 * else (functions, `null`, `undefined`, objects) drops.
 */
export const coercePropValue = (
  value: unknown,
): Option<SoftStr> =>
  isSoftStr(value)
    ? some(value)
    : typeof value === "number" && Number.isFinite(value)
      ? some(String(value))
      : typeof value === "boolean"
        ? value
          ? some("")
          : none()
        : none();

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
 * Element attributes — a string-valued plgg map. Richer JSX prop kinds (numbers,
 * booleans) are coerced to `SoftStr` by the runtime ({@link coercePropValue})
 * before they land here, so the view tree stays plain data.
 */
export type Props = Dict<string, SoftStr>;

/**
 * The content of an intrinsic `Element` node: a tag, its attributes, and its
 * already-normalized children.
 */
export type ElementContent = Readonly<{
  tag: SoftStr;
  props: Props;
  children: ReadonlyArray<VNode>;
}>;

/**
 * The view as **pure data** — the result of processing `.tsx`. A plgg `Box`
 * union: an intrinsic `Element`, a `Text` leaf, or a `Fragment` that groups
 * children with no wrapper. Function components are resolved away into this
 * tree by the runtime, so a `VNode` only ever describes host structure. There
 * is no class, no HTML string, no DOM node — those are not this library's job.
 */
export type VNode =
  | Box<"Element", ElementContent>
  | Box<"Text", Readonly<{ value: SoftStr }>>
  | Box<"Fragment", Readonly<{ children: ReadonlyArray<VNode> }>>;

/**
 * A function component: props in, a {@link VNode} out. This is the unit of
 * composition — you write these in `.tsx` and the runtime invokes them. `P` is
 * the component's own props type (unconstrained: components take any props,
 * unlike intrinsic elements whose attributes are strings).
 */
export type Component<P = Readonly<{}>> = (props: P) => VNode;

/**
 * Anything accepted in child position before normalization: a node, a primitive
 * that lifts to `Text`, a "nothing" (`false`/`null`/`undefined` drop, so
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
 * Type guard for {@link VNode} — one of the three tagged boxes.
 */
export const isVNode = (value: unknown): value is VNode =>
  isBoxWithTag("Element")(value) ||
  isBoxWithTag("Text")(value) ||
  isBoxWithTag("Fragment")(value);

/**
 * Lifts one raw child value into zero or more {@link VNode}s. Accepts `unknown`
 * because the JSX runtime hands children back loosely typed: existing nodes pass
 * through, strings/finite numbers become `Text`, arrays flatten recursively, and
 * everything else (booleans, `null`, `undefined`, functions) drops out.
 */
export const normalizeChild = (
  value: unknown,
): ReadonlyArray<VNode> =>
  isVNode(value)
    ? [value]
    : isSoftStr(value)
      ? [box("Text")({ value })]
      : typeof value === "number" && Number.isFinite(value)
        ? [box("Text")({ value: String(value) })]
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
 * Coerces one raw prop value into a `SoftStr` attribute, or `None` when it
 * should be dropped: strings pass through, finite numbers stringify, `true`
 * becomes the empty string (a present boolean attribute) while `false` drops,
 * and anything else (functions, `null`, `undefined`, objects) drops.
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

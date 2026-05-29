import {
  Box,
  Dict,
  SoftStr,
  Num,
  Bool,
  Option,
  box,
  pattern,
  some,
  none,
  isSoftStr,
  isNum,
  isBool,
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
 * Constructs an intrinsic `Element` node.
 */
export const element = (
  content: ElementContent,
): VNode => box("Element")(content);

/**
 * Constructs a `Text` leaf.
 */
export const text = (value: SoftStr): VNode =>
  box("Text")({ value });

/**
 * Constructs a `Fragment` grouping children with no wrapper.
 */
export const fragment = (
  children: ReadonlyArray<VNode>,
): VNode => box("Fragment")({ children });

/**
 * Pattern matchers for folding a {@link VNode} with `match`, so a fold
 * references each variant by name rather than a bare `__tag` string and stays
 * exhaustive over the three node kinds.
 */
export const element$ = () => pattern("Element")();
export const text$ = () => pattern("Text")();
export const fragment$ = () => pattern("Fragment")();

/**
 * A function component: props in, a {@link VNode} out. This is the unit of
 * composition — you write these in `.tsx` and the runtime invokes them. `P` is
 * the component's own props type (unconstrained: components take any props,
 * unlike intrinsic elements whose attributes are strings).
 */
export type Component<P = Readonly<{}>> = (props: P) => VNode;

/**
 * Anything accepted in child position before normalization: a node, a primitive
 * that lifts to `Text` (`SoftStr`/`Num`), or a "nothing".
 *
 * `Bool`/`null`/`undefined` are the "nothing" cases (so `cond && <x/>` and
 * `x ?? null` work) — they drop during normalization. plgg models absence as
 * `Option`, not a dedicated type, and JSX yields these language-native values
 * directly in child position; they live only here, at the seam, and never enter
 * the {@link VNode} model.
 */
export type Child =
  | VNode
  | SoftStr
  | Num
  | Bool
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
      ? [text(value)]
      : isNum(value) && Number.isFinite(value)
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
    : isNum(value) && Number.isFinite(value)
      ? some(String(value))
      : isBool(value)
        ? value
          ? some("")
          : none()
        : none();

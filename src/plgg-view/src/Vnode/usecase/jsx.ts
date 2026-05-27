import {
  SoftStr,
  pipe,
  matchOption,
} from "plgg";
import {
  VNode,
  Props,
  element,
  fragment,
  normalizeChild,
  coercePropValue,
} from "plgg-view/index";

/**
 * Marker for fragment elements (`<></>`). The automatic runtime calls
 * `jsx(Fragment, { children })`; identity comparison against this symbol is how
 * {@link jsx} recognizes a fragment.
 */
export const Fragment: unique symbol = Symbol(
  "plgg-view.Fragment",
);

/**
 * The props object the JSX transform passes: arbitrary attributes plus an
 * optional `children`. Values are `unknown` because authors can write any
 * expression in `{...}`; {@link coercePropValue} narrows them at this seam.
 */
export type JsxProps = Readonly<Record<string, unknown>>;

/**
 * A function component: plain data in, a {@link VNode} out. No classes, no
 * hooks — composition is ordinary function application.
 */
export type Component = (props: JsxProps) => VNode;

/**
 * What may appear in tag position of a JSX element: an intrinsic tag name, the
 * {@link Fragment} marker, or a {@link Component}.
 */
export type ElementType = SoftStr | typeof Fragment | Component;

/**
 * Reduces the raw JSX props into a string-valued {@link Props} map: `children`
 * and `key` are structural, not attributes, so they are dropped; every other
 * value is run through {@link coercePropValue} and kept only if it survives.
 */
const toProps = (props: JsxProps): Props =>
  Object.entries(props)
    .filter(
      ([name]) => name !== "children" && name !== "key",
    )
    .reduce<Props>(
      (acc, [name, value]) =>
        pipe(
          coercePropValue(value),
          matchOption(
            () => acc,
            (v: SoftStr) => ({ ...acc, [name]: v }),
          ),
        ),
      {},
    );

/**
 * The automatic-runtime entry point. Folds the three tag-position cases into a
 * {@link VNode}: a component is just applied to its props; a {@link Fragment}
 * wraps its normalized children; an intrinsic tag becomes an `Element`.
 */
export const jsx = (
  type: ElementType,
  props: JsxProps,
): VNode =>
  typeof type === "function"
    ? type(props)
    : type === Fragment
      ? fragment(normalizeChild(props["children"]))
      : element(
          type,
          toProps(props),
          normalizeChild(props["children"]),
        );

/**
 * The static-children variant. The transform emits `jsxs` instead of `jsx` when
 * the children are a literal array; the construction is identical here.
 */
export const jsxs = jsx;

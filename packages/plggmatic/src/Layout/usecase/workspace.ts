import { type SoftStr } from "plgg";
import {
  type Html,
  type Attribute,
  el,
  attr,
} from "plgg-view";
import {
  style_,
  flex,
} from "plggmatic/styleEntry";
import {
  type Parts,
  columnWith,
} from "plggmatic/Layout/usecase/combinators";
import {
  type StripGeometry,
  stripStyle,
} from "plggmatic/Layout/model/geometry";
import {
  workspaceClass,
  pinnedClass,
  browserClass,
  menuClass,
  seamClass,
  menuOpenAttr,
  menuCompactAttr,
  phoneAttr,
  widthAttr,
} from "plggmatic/Meta/model/classHooks";

/**
 * What a workspace is showing, beyond its columns: the
 * lengths it is laid out by, whether its menu is shown,
 * whether that menu is folded to a rail, and whether the
 * window holds one column at a time.
 */
export type WorkspaceState = Readonly<{
  geometry: StripGeometry;
  menuOpen: boolean;
  menuCompact: boolean;
  phone: boolean;
}>;

const flag = <Msg>(
  on: boolean,
  name: SoftStr,
): ReadonlyArray<Attribute<Msg>> =>
  on ? [attr(name, "")] : [];

/**
 * The frame a pinned panel and a strip of columns share —
 * the horizontally scrolling element. It carries the
 * geometry as custom properties and the three states as
 * attributes, so {@link workspaceCss} lays everything out
 * with no script of its own. Children are a
 * {@link pinnedPanel} and a {@link browser}, in either
 * order.
 */
export const workspace = <Msg>(
  state: WorkspaceState,
  parts: Parts,
  children: ReadonlyArray<Html<Msg>>,
): Html<Msg> =>
  workspaceWith([], state, parts, children);

/**
 * {@link workspace} with the host's own attributes on the
 * frame — its scroll handler above all: the frame is the
 * element that scrolls, and the geometry needs to hear it.
 */
export const workspaceWith = <Msg>(
  attributes: ReadonlyArray<Attribute<Msg>>,
  state: WorkspaceState,
  parts: Parts,
  children: ReadonlyArray<Html<Msg>>,
): Html<Msg> =>
  el(
    "div",
    [
      style_(workspaceClass, ...parts),
      attr("style", stripStyle(state.geometry)),
      ...flag<Msg>(state.menuOpen, menuOpenAttr),
      ...flag<Msg>(
        state.menuCompact,
        menuCompactAttr,
      ),
      ...flag<Msg>(state.phone, phoneAttr),
      ...attributes,
    ],
    children,
  );

/**
 * The panel pinned to the frame's left edge: it stays put
 * while the strip scrolls under it, and gives up width to
 * the columns down to its floor. An `<aside>` landmark.
 */
export const pinnedPanel = <Msg>(
  parts: Parts,
  children: ReadonlyArray<Html<Msg>>,
): Html<Msg> =>
  el(
    "aside",
    [style_(pinnedClass, ...parts)],
    children,
  );

/**
 * The strip beside the pinned panel: a {@link menuColumn},
 * then columns. The trailing seam — the spacer that lets
 * the last column come to rest beside the panel — is
 * appended here, so a product cannot forget it.
 */
export const browser = <Msg>(
  parts: Parts,
  children: ReadonlyArray<Html<Msg>>,
): Html<Msg> =>
  el(
    "div",
    [style_(browserClass, flex, ...parts)],
    [
      ...children,
      el(
        "div",
        [
          style_(seamClass),
          attr("aria-hidden", "true"),
        ],
        [],
      ),
    ],
  );

/**
 * The strip's menu track. Its width is the geometry's, or
 * the rail's while the workspace is compact.
 */
export const menuColumn = <Msg>(
  parts: Parts,
  children: ReadonlyArray<Html<Msg>>,
): Html<Msg> =>
  columnWith([], [menuClass, ...parts], children);

/**
 * How wide a strip column is: `fit` is one column of the
 * geometry, `wide` two, `read` a reading measure that
 * grows with the window.
 */
export type ColumnWidth = "fit" | "wide" | "read";

/** A strip column of a named width. */
export const widthColumn = <Msg>(
  width: ColumnWidth,
  parts: Parts,
  children: ReadonlyArray<Html<Msg>>,
): Html<Msg> =>
  columnWith(
    [attr(widthAttr, width)],
    parts,
    children,
  );

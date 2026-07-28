import {
  type SoftStr,
  type Option,
  matchOption,
} from "plgg";
import {
  type Html,
  type Attribute,
  attr,
} from "plgg-view";
import {
  type Parts,
  rowWith,
  columnWith,
} from "plggmatic/Layout/usecase/combinators";
import { cssPrefix } from "plggmatic/Meta/model/identity";

/**
 * The MARKERS the navigation runtime navigates by, and the
 * combinators that stamp them. Framework-owned on purpose:
 * a product must never have to spell one of these strings
 * in its own JavaScript for the strip to work, because a
 * string a consumer types is a contract no compiler
 * checks. Import the constant, or use the combinator.
 */

/** The element holding the strip's columns. */
export const stripAttr: SoftStr = `data-${cssPrefix}-strip`;

/**
 * A PLACEABLE document column. Its value is the column's
 * own route, so the runtime can compare what is on screen
 * to what the URL says without a side table.
 */
export const columnAttr: SoftStr = `data-${cssPrefix}-column`;

/**
 * The passage a column is showing, when it is showing one.
 * Carried on the element so the runtime can compare the
 * screen to the URL by VALUE — a column at the right route
 * but the wrong passage is a different column.
 */
export const spanAttr: SoftStr = `data-${cssPrefix}-span`;

/**
 * The single entry point the runtime publishes on
 * `window`. One name, so the pointer, the keyboard and an
 * assistant all drive the same code — there is no second
 * navigation path to diverge from.
 */
export const navHookName: SoftStr = `__${cssPrefix}Nav`;

/** A {@link rowWith} marked as the navigable strip. */
export const strip = <Msg>(
  parts: Parts,
  children: ReadonlyArray<Html<Msg>>,
): Html<Msg> =>
  rowWith([attr(stripAttr, "")], parts, children);

/**
 * A {@link columnWith} marked as a placeable document
 * column at `route`. The runtime fetches a route's own
 * page, takes the element carrying this marker, and puts
 * it in the strip — which is sound only because a column
 * renders identically wherever it sits.
 */
export const documentColumn = <Msg>(
  route: SoftStr,
  span: Option<SoftStr>,
  parts: Parts,
  children: ReadonlyArray<Html<Msg>>,
): Html<Msg> =>
  columnWith(
    [
      attr(columnAttr, route),
      ...matchOption<
        SoftStr,
        ReadonlyArray<Attribute<Msg>>
      >(
        () => [],
        (quoted: SoftStr) => [
          attr(spanAttr, quoted),
        ],
      )(span),
    ],
    parts,
    children,
  );

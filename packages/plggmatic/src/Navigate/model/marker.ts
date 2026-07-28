import { type SoftStr } from "plgg";
import { type Html } from "plgg-view";
import { attr } from "plgg-view";
import {
  type Parts,
  rowWith,
  columnWith,
} from "plggmatic/Layout/usecase/combinators";

/**
 * The MARKERS the navigation runtime navigates by, and the
 * combinators that stamp them. Framework-owned on purpose:
 * a product must never have to spell one of these strings
 * in its own JavaScript for the strip to work, because a
 * string a consumer types is a contract no compiler
 * checks. Import the constant, or use the combinator.
 */

/** The element holding the strip's columns. */
export const stripAttr: SoftStr = "data-pm-strip";

/**
 * A PLACEABLE document column. Its value is the column's
 * own route, so the runtime can compare what is on screen
 * to what the URL says without a side table.
 */
export const columnAttr: SoftStr =
  "data-pm-column";

/**
 * The single entry point the runtime publishes on
 * `window`. One name, so the pointer, the keyboard and an
 * assistant all drive the same code — there is no second
 * navigation path to diverge from.
 */
export const navHookName: SoftStr = "__pmNav";

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
  parts: Parts,
  children: ReadonlyArray<Html<Msg>>,
): Html<Msg> =>
  columnWith(
    [attr(columnAttr, route)],
    parts,
    children,
  );

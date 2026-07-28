import { type SoftStr } from "plgg";
import {
  type Html,
  type Attribute,
  el,
} from "plgg-view";
import {
  type Styles,
  type Variant,
  style_,
  flex,
  flexCol,
} from "plggmatic/styleEntry";
import {
  type PaneRole,
  landmarkTag,
} from "plggmatic/Layout/model/pane";
import { cssPrefix } from "plggmatic/Meta/model/identity";

/**
 * The class hooks the layout skeleton emits, derived from
 * the framework's own {@link cssPrefix}. EXPORTED because a
 * consumer that needs to name one — a stylesheet, a test —
 * must import it rather than type it: a string a consumer
 * types is a contract no compiler checks, and renaming the
 * prefix would silently break every page that spelled it.
 */
export const rowClass: SoftStr = `${cssPrefix}-row`;
export const colClass: SoftStr = `${cssPrefix}-col`;
export const paneClass: SoftStr = `${cssPrefix}-pane`;

/**
 * What a combinator accepts as its style slot: exactly
 * `style_`'s parts (class hooks, atom groups, variants).
 * The combinator merges its own base parts and the
 * consumer's into ONE `style_` call — `style_` is the
 * sole class authority, so two calls on one element
 * would clobber each other.
 */
export type Parts = ReadonlyArray<
  SoftStr | Styles | Variant
>;

/**
 * The screen as a horizontal strip of columns — the
 * column-oriented pattern's outermost piece. Purely
 * compositional: `row` contributes only `display:flex`
 * and its `pm-row` hook; height, snapping, and collapse
 * are the consumer's parts and stylesheet. **Recorded
 * rule**: layout combinators take `(parts, children)`
 * like element builders take `(attributes, children)` —
 * options are style atoms you compose, never fields on a
 * config object.
 */
export const row = <Msg>(
  parts: Parts,
  children: ReadonlyArray<Html<Msg>>,
): Html<Msg> => rowWith([], parts, children);

/**
 * {@link row} with framework-owned ATTRIBUTES alongside
 * its style parts. Not a widening of the recorded
 * `(parts, children)` rule — that rule is about options
 * being style atoms, and this is not an options bag. It
 * exists so a framework module (Navigate's strip markers)
 * can mark the skeleton it emits without either
 * re-deciding the class/flow here or making a consumer
 * spell `pm-row` by hand. Consumers use {@link row}.
 */
export const rowWith = <Msg>(
  attributes: ReadonlyArray<Attribute<Msg>>,
  parts: Parts,
  children: ReadonlyArray<Html<Msg>>,
): Html<Msg> =>
  el(
    "div",
    [
      style_(rowClass, flex, ...parts),
      ...attributes,
    ],
    children,
  );

/**
 * One vertical track of the row. Contributes only the
 * column flow (`flex-direction:column`) and its `pm-col`
 * hook; sizing is a composed atom — `basis("220px")` for
 * a fixed track, `fluid` for the one that fills the
 * remaining row.
 */
export const column = <Msg>(
  parts: Parts,
  children: ReadonlyArray<Html<Msg>>,
): Html<Msg> => columnWith([], parts, children);

/** {@link column} with framework-owned attributes — see
 * {@link rowWith} for why this pair exists. */
export const columnWith = <Msg>(
  attributes: ReadonlyArray<Attribute<Msg>>,
  parts: Parts,
  children: ReadonlyArray<Html<Msg>>,
): Html<Msg> =>
  el(
    "div",
    [
      style_(colClass, flexCol, ...parts),
      ...attributes,
    ],
    children,
  );

/**
 * A landmark content region inside a column: the
 * accessibility skeleton of the pattern. `pane(role)`
 * renders the role's semantic element (`nav`, `main`,
 * `aside` — see {@link landmarkTag}) around arbitrary
 * consumer content, with the `pm-pane` hook. Scroll,
 * padding, and measure caps are composed parts.
 */
export const pane =
  (role: PaneRole) =>
  <Msg>(
    parts: Parts,
    children: ReadonlyArray<Html<Msg>>,
  ): Html<Msg> =>
    el(
      landmarkTag(role),
      [style_(paneClass, ...parts)],
      children,
    );

/** The `navigation` pane — renders a `<nav>` landmark. */
export const navPane = pane("navigation");
/** The `main` pane — renders the `<main>` landmark. */
export const mainPane = pane("main");
/** The `complementary` pane — renders an `<aside>`. */
export const asidePane = pane("complementary");

import {
  Box,
  SoftStr,
  Option,
  box,
  pattern,
} from "plgg";
import { SourceRange } from "plgg-ir-syntax";
import { TypedExpr } from "plgg-ir-language";
import { ResolvedPath } from "plgg-ir-manifest/domain/model/Path";

/**
 * A view's query (design.md §15): what the view
 * explicitly loads. The loaded set — subject root,
 * every include prefix, and lookup aliases — is the
 * ONLY data its layout may reference.
 */
export type Query = Readonly<{
  entity: SoftStr;
  where: Option<TypedExpr>;
  authorizedBy: Option<SoftStr>;
  includes: ReadonlyArray<ResolvedPath>;
  lookups: ReadonlyArray<Lookup>;
}>;

/**
 * One `(lookup <projection> (through <path>))` — the
 * deliberate boundary crossing of design.md §15.
 */
export type Lookup = Readonly<{
  projection: SoftStr;
  through: ResolvedPath;
  range: SourceRange;
}>;

/**
 * Builds a {@link Query}.
 */
export const query = (
  entity: SoftStr,
  where: Option<TypedExpr>,
  authorizedBy: Option<SoftStr>,
  includes: ReadonlyArray<ResolvedPath>,
  lookups: ReadonlyArray<Lookup>,
): Query => ({
  entity,
  where,
  authorizedBy,
  includes,
  lookups,
});

/**
 * One layout node (design.md §11), as **pure data**:
 * consumer-independent structure — roles and semantic
 * references, never components or URLs (design.md
 * §37). Child order is meaning and is preserved
 * verbatim through normalization.
 */
export type LayoutNode =
  | DetailNode
  | SectionNode
  | ListNode
  | ShowNode
  | ActionRefNode
  | NavigateNode;

/** `(detail ...)` — a detail grouping. */
export type DetailNode = Box<
  "DetailNode",
  Readonly<{
    children: ReadonlyArray<LayoutNode>;
    range: SourceRange;
  }>
>;

/** `(section <name> ...)` — a named grouping. */
export type SectionNode = Box<
  "SectionNode",
  Readonly<{
    name: SoftStr;
    children: ReadonlyArray<LayoutNode>;
    range: SourceRange;
  }>
>;

/**
 * `(list <collection-path> ...)` — children render
 * per element, rooted at the target entity's alias.
 */
export type ListNode = Box<
  "ListNode",
  Readonly<{
    path: ResolvedPath;
    children: ReadonlyArray<LayoutNode>;
    range: SourceRange;
  }>
>;

/** `(show <value-path>)`. */
export type ShowNode = Box<
  "ShowNode",
  Readonly<{
    path: ResolvedPath;
    range: SourceRange;
  }>
>;

/** `(action <name>)` — an available action. */
export type ActionRefNode = Box<
  "ActionRefNode",
  Readonly<{
    action: SoftStr;
    range: SourceRange;
  }>
>;

/**
 * `(navigate (to <view>) (with (<param> <path>)...))`
 * — semantic navigation with typed arguments, never a
 * URL (design.md §11, §37).
 */
export type NavigateNode = Box<
  "NavigateNode",
  Readonly<{
    to: SoftStr;
    args: ReadonlyArray<NavigateArg>;
    range: SourceRange;
  }>
>;

/**
 * One navigation argument: the target view's
 * parameter and the value path supplied for it.
 */
export type NavigateArg = Readonly<{
  parameter: SoftStr;
  value: ResolvedPath;
  range: SourceRange;
}>;

/** Builds a {@link DetailNode}. */
export const detailNode = (
  children: ReadonlyArray<LayoutNode>,
  range: SourceRange,
): DetailNode =>
  box("DetailNode")({ children, range });

/** Builds a {@link SectionNode}. */
export const sectionNode = (
  name: SoftStr,
  children: ReadonlyArray<LayoutNode>,
  range: SourceRange,
): SectionNode =>
  box("SectionNode")({ name, children, range });

/** Builds a {@link ListNode}. */
export const listNode = (
  path: ResolvedPath,
  children: ReadonlyArray<LayoutNode>,
  range: SourceRange,
): ListNode =>
  box("ListNode")({ path, children, range });

/** Builds a {@link ShowNode}. */
export const showNode = (
  path: ResolvedPath,
  range: SourceRange,
): ShowNode => box("ShowNode")({ path, range });

/** Builds an {@link ActionRefNode}. */
export const actionRefNode = (
  action: SoftStr,
  range: SourceRange,
): ActionRefNode =>
  box("ActionRefNode")({ action, range });

/** Builds a {@link NavigateNode}. */
export const navigateNode = (
  to: SoftStr,
  args: ReadonlyArray<NavigateArg>,
  range: SourceRange,
): NavigateNode =>
  box("NavigateNode")({ to, args, range });

/** `match` pattern for a {@link DetailNode}. */
export const detailNode$ = () =>
  pattern("DetailNode")();

/** `match` pattern for a {@link SectionNode}. */
export const sectionNode$ = () =>
  pattern("SectionNode")();

/** `match` pattern for a {@link ListNode}. */
export const listNode$ = () =>
  pattern("ListNode")();

/** `match` pattern for a {@link ShowNode}. */
export const showNode$ = () =>
  pattern("ShowNode")();

/** `match` pattern for an {@link ActionRefNode}. */
export const actionRefNode$ = () =>
  pattern("ActionRefNode")();

/** `match` pattern for a {@link NavigateNode}. */
export const navigateNode$ = () =>
  pattern("NavigateNode")();

/**
 * One view of the canonical manifest IR (design.md
 * §11, §14): a subject entity with typed parameters
 * (a parameter named `p` carries the nominal type
 * `p`), an optional aggregate scope, the query, and
 * the layout tree.
 */
export type View = Readonly<{
  name: SoftStr;
  subject: SoftStr;
  parameters: ReadonlyArray<SoftStr>;
  scope: Option<SoftStr>;
  query: Query;
  layout: ReadonlyArray<LayoutNode>;
  range: SourceRange;
}>;

/**
 * Builds a {@link View}.
 */
export const view = (
  name: SoftStr,
  subject: SoftStr,
  parameters: ReadonlyArray<SoftStr>,
  scope: Option<SoftStr>,
  q: Query,
  layout: ReadonlyArray<LayoutNode>,
  range: SourceRange,
): View => ({
  name,
  subject,
  parameters,
  scope,
  query: q,
  layout,
  range,
});

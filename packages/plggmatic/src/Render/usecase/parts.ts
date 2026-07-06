import {
  type SoftStr,
  type Option,
  some,
  none,
  matchOption,
} from "plgg";
import {
  type Html,
  slot,
  span,
  input,
  button,
  a,
  text,
  attr,
  href,
  onClick,
  onInput,
  ul as ulEl,
  li as liElement,
} from "plgg-view";
import { style_ } from "plggmatic/styleEntry";
import { type NavItem } from "plggmatic/Component/model/navItem";
import { navTree } from "plggmatic/Component/usecase/navTree";
import { focusRing } from "plggmatic/Component/model/interaction";
import { cssPrefix } from "plggmatic/Meta/model/identity";
import { confirmDialog } from "plggmatic/Component/usecase/confirmDialog";
import {
  type SchedulerMsg,
  queryInput,
  requestAction,
  confirmAction,
  cancelAction,
} from "plggmatic/Schedule/model/Msg";
import {
  type ConfirmPrompt,
  type ActionButton,
  type QueryState,
  type RowLink,
  type MenuLink,
} from "plggmatic/Schedule/model/Scene";
import { type Field } from "plggmatic/Declare/model/Row";

/**
 * The rendering pieces BOTH mode renderers (multi-column,
 * single-column) share — so the two projections of the
 * same {@link Scene} can never drift (mode parity is the
 * proof obligation of ticket 11): the confirmation
 * overlay, the action buttons, the query box, the list
 * rows, the menu nav, and the detail fields. Navigation
 * is links (the runtime turns an in-app `<a>` click into
 * `onUrlChange`); the query, actions, and confirmation
 * dispatch scheduler `Msg`s.
 */

/**
 * The confirmation, if parked — rendered by ticket 12's
 * framework `confirmDialog` (a real `role="dialog"` /
 * `aria-modal` modal with a backdrop), so both renderers
 * get the accessible dialog. Backdrop-click and Cancel
 * dispatch `cancelAction`, Confirm dispatches
 * `confirmAction`.
 */
export const confirmOverlay = (
  confirm: Option<ConfirmPrompt>,
): ReadonlyArray<Html<SchedulerMsg>> =>
  matchOption<
    ConfirmPrompt,
    ReadonlyArray<Html<SchedulerMsg>>
  >(
    () => [],
    (c: ConfirmPrompt) => [
      confirmDialog<SchedulerMsg>({
        title: c.destructive
          ? "Confirm deletion"
          : "Please confirm",
        body: c.prompt,
        confirmLabel: "Confirm",
        cancelLabel: "Cancel",
        destructive: c.destructive,
        onConfirm: confirmAction(),
        onCancel: cancelAction(),
      }),
    ],
  )(confirm);

/** The action buttons for a collection (empty when none). */
export const actionRow = (
  collection: SoftStr,
  target: Option<SoftStr>,
  actions: ReadonlyArray<ActionButton>,
): ReadonlyArray<Html<SchedulerMsg>> =>
  actions.length === 0
    ? []
    : [
        slot(
          [attr("class", `${cssPrefix}-actions`)],
          actions.map((ab: ActionButton) =>
            button(
              [
                style_(
                  `${cssPrefix}-btn`,
                  focusRing,
                ),
                onClick(
                  requestAction(
                    collection,
                    ab.id,
                    target,
                  ),
                ),
              ],
              [text(ab.label)],
            ),
          ),
        ),
      ];

/** The query search box (empty when the list has no query). */
export const queryField = (
  q: Option<QueryState>,
): ReadonlyArray<Html<SchedulerMsg>> =>
  matchOption<
    QueryState,
    ReadonlyArray<Html<SchedulerMsg>>
  >(
    () => [],
    (state: QueryState) => [
      input(
        [
          attr("type", "search"),
          attr("class", `${cssPrefix}-query`),
          attr("value", state.text),
          attr("placeholder", state.placeholder),
          onInput((v: SoftStr) => queryInput(v)),
        ],
        [],
      ),
    ],
  )(q);

/** One list row as a drilling link (`aria-current` when active). */
export const rowItem = (
  r: RowLink,
): Html<SchedulerMsg, "li"> =>
  liElement(
    [],
    [
      a(
        [
          href(r.href),
          ...(r.active
            ? [attr("aria-current", "page")]
            : []),
          style_(
            `${cssPrefix}-row-link`,
            focusRing,
          ),
        ],
        [text(r.row.label)],
      ),
    ],
  );

/** A row list. */
export const rowList = (
  rows: ReadonlyArray<RowLink>,
): Html<SchedulerMsg, "ul"> =>
  ulEl(
    [style_(`${cssPrefix}-list`)],
    rows.map(rowItem),
  );

/** The menu entries as a `navTree`, active one marked. */
export const menuNav = (
  entries: ReadonlyArray<MenuLink>,
): Html<SchedulerMsg> =>
  navTree(
    entries.map((e: MenuLink): NavItem => ({
      label: e.label,
      href: some(e.href),
      children: [],
    })),
    matchOption<MenuLink, SoftStr>(
      () => "",
      (e: MenuLink) => e.href,
    )(activeEntry(entries)),
  );

const activeEntry = (
  entries: ReadonlyArray<MenuLink>,
): Option<MenuLink> => {
  const hit = entries.find(
    (e: MenuLink) => e.active,
  );
  return hit === undefined ? none() : some(hit);
};

/** A loading hint line (empty when not loading). */
export const loadingHint = (
  loading: boolean,
): ReadonlyArray<Html<SchedulerMsg>> =>
  loading
    ? [
        span(
          [attr("class", `${cssPrefix}-hint`)],
          [text("Loading…")],
        ),
      ]
    : [];

/** A failure hint line (empty when no error). */
export const errorHint = (
  error: Option<SoftStr>,
): ReadonlyArray<Html<SchedulerMsg>> =>
  matchOption<
    SoftStr,
    ReadonlyArray<Html<SchedulerMsg>>
  >(
    () => [],
    (e: SoftStr) => [
      span(
        [attr("class", `${cssPrefix}-error`)],
        [text(`Failed: ${e}`)],
      ),
    ],
  )(error);

/** The detail fields block. */
export const detailFields = (
  fields: ReadonlyArray<Field>,
): Html<SchedulerMsg, "div"> =>
  slot(
    [attr("class", `${cssPrefix}-fields`)],
    fields.map((f: Field) =>
      slot(
        [attr("class", `${cssPrefix}-field`)],
        [text(f.value)],
      ),
    ),
  );

/** A labelled back affordance (a truncating link), if any. */
export const backControl = (
  back: Option<SoftStr>,
): ReadonlyArray<Html<SchedulerMsg>> =>
  matchOption<
    SoftStr,
    ReadonlyArray<Html<SchedulerMsg>>
  >(
    () => [],
    (to: SoftStr) => [
      a(
        [
          href(to),
          attr("aria-label", "Back"),
          style_(`${cssPrefix}-back`, focusRing),
        ],
        [text("← Back")],
      ),
    ],
  )(back);

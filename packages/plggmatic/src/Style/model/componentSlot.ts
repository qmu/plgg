import { type SoftStr } from "plgg";
import { type Theme } from "plggmatic/Style/model/theme";

/**
 * The framework's THEMEABLE COMPONENT SURFACE: the closed
 * set of chrome pieces a consumer may restyle, named by
 * ROLE rather than by the internal `pm-*` class string.
 *
 * This is the answer to the framework-vs-example smell
 * (`demo1/styles.ts` header): the reference used to restyle
 * plggmatic by writing the framework's own class names
 * (`.pm-list`, `.pm-colhead …`) verbatim — a by-name
 * coupling that breaks the moment the framework renames a
 * class. A consumer now targets a declared SLOT
 * ({@link ComponentSlot}); the framework owns the mapping
 * from slot to selector ({@link slotSelector}), so the
 * `pm-*` strings live in ONE place and a rename is a single
 * framework edit, invisible to consumers.
 *
 * Each slot is a full framework selector (compound ones —
 * `colHeadTitle` = the title WITHIN a colhead — included as
 * named members), built from the supplied {@link Theme}'s
 * `prefix` so an overridden namespace stays consistent.
 */
export type ComponentSlot =
  | "scheduler"
  | "col"
  | "rowCol"
  | "rowColHasMenu"
  | "rowColHasForm"
  | "colHasQuery"
  | "colHasFields"
  | "colHead"
  | "colHeadTitle"
  | "colHeadTitleBare"
  | "colHeadTitleLink"
  | "pane"
  | "paneLink"
  | "menuBody"
  | "menuList"
  | "menuLink"
  | "query"
  | "list"
  | "listItem"
  | "listItemAdjacent"
  | "rowLink"
  | "listActions"
  | "listAction"
  | "form"
  | "formFirstChild"
  | "field"
  | "fieldAdjacent"
  | "fieldLabel"
  | "input"
  | "btnPrimary"
  | "formBtnPrimary";

/** Every {@link ComponentSlot}, for exhaustive iteration. */
export const componentSlots: ReadonlyArray<ComponentSlot> =
  [
    "scheduler",
    "col",
    "rowCol",
    "rowColHasMenu",
    "rowColHasForm",
    "colHasQuery",
    "colHasFields",
    "colHead",
    "colHeadTitle",
    "colHeadTitleBare",
    "colHeadTitleLink",
    "pane",
    "paneLink",
    "menuBody",
    "menuList",
    "menuLink",
    "query",
    "list",
    "listItem",
    "listItemAdjacent",
    "rowLink",
    "listActions",
    "listAction",
    "form",
    "formFirstChild",
    "field",
    "fieldAdjacent",
    "fieldLabel",
    "input",
    "btnPrimary",
    "formBtnPrimary",
  ];

// The selector for every slot, parameterised by the class
// prefix `p` (the `--<prefix>` namespace's class token). A
// closed record so a missing slot is a `tsc` error — the
// framework can never leave a declared slot unmapped.
const selectorTable = (
  p: SoftStr,
): Record<ComponentSlot, SoftStr> => ({
  scheduler: `.${p}-scheduler`,
  col: `.${p}-col`,
  rowCol: `.${p}-row .${p}-col`,
  rowColHasMenu: `.${p}-row .${p}-col:has(.${p}-menu-body)`,
  rowColHasForm: `.${p}-row .${p}-col:has(.${p}-form)`,
  colHasQuery: `.${p}-col:has(.${p}-query)`,
  colHasFields: `.${p}-col:has(.${p}-fields)`,
  colHead: `.${p}-colhead`,
  colHeadTitle: `.${p}-colhead .${p}-colhead-title`,
  colHeadTitleBare: `.${p}-colhead-title`,
  colHeadTitleLink: `.${p}-colhead a.${p}-colhead-title`,
  pane: `.${p}-pane`,
  paneLink: `.${p}-pane a`,
  menuBody: `.${p}-menu-body`,
  menuList: `.${p}-menu-body ul`,
  menuLink: `.${p}-menu-body li a`,
  query: `.${p}-query`,
  list: `.${p}-list`,
  listItem: `.${p}-list-item`,
  listItemAdjacent: `.${p}-list-item+.${p}-list-item`,
  rowLink: `.${p}-row-link`,
  listActions: `.${p}-list-actions`,
  listAction: `.${p}-list-action`,
  form: `.${p}-form`,
  formFirstChild: `.${p}-form>*:first-child`,
  field: `.${p}-form .${p}-field`,
  fieldAdjacent: `.${p}-form .${p}-field+.${p}-field`,
  fieldLabel: `.${p}-form .${p}-field-label`,
  input: `.${p}-form .${p}-input`,
  btnPrimary: `.${p}-btn-primary`,
  formBtnPrimary: `.${p}-form .${p}-btn-primary`,
});

/**
 * The framework CSS selector a {@link ComponentSlot} maps
 * to, in the supplied theme's namespace. Curried
 * `slotSelector(theme)(slot)` so a theme-bound emitter
 * fixes the prefix once — the same shape as
 * {@link colorVar}/{@link metricVar}.
 */
export const slotSelector =
  (theme: Theme) =>
  (slot: ComponentSlot): SoftStr =>
    selectorTable(theme.prefix)[slot];

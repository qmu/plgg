import { type SoftStr } from "plgg";
import { cssPrefix } from "plggmatic/Meta/model/identity";

/**
 * **Every class hook plggmatic emits, in one place.**
 *
 * A hook that is not exported is not a contract. The
 * framework renders these names into a consumer's DOM, so
 * a consumer that wants to style one has to name it — and
 * a name typed by hand is a cross-package contract no
 * compiler checks: rename {@link cssPrefix} upstream and
 * the consumer keeps compiling while its pages quietly
 * lose their styling. `scripts/gate-framework-names.sh`
 * fails the build on a typed `pm-` literal in a consumer;
 * this module is what makes that gate satisfiable.
 *
 * **This is the single definition site.** The hooks that
 * already had homes next to their emitters
 * (`rowClass`/`colClass`/`paneClass` in `Layout`,
 * `themeToggleClass`/`sunClass`/`moonClass` in
 * `themeToggle`) now re-export from here rather than
 * deriving their own copy, so there is exactly one
 * definition per hook and no way for two spellings to
 * drift apart. The emitters below import these constants
 * instead of composing `${cssPrefix}-…` inline, which is
 * what makes "the framework renders it" and "the
 * framework guarantees it" the same fact.
 *
 * Grouped by the surface that emits them, and named
 * `<thing>Class` throughout.
 */

/** Derives one hook from the framework prefix. */
const hook = (name: string): SoftStr =>
  `${cssPrefix}-${name}`;

// --- Layout skeleton (Layout/usecase/combinators) ---

export const rowClass: SoftStr = hook("row");
export const colClass: SoftStr = hook("col");
export const paneClass: SoftStr = hook("pane");

// --- Strip chrome (Navigate/usecase/navigationScript) ---

/** A placed column's close control. */
export const foldClass: SoftStr = hook("fold");
/**
 * Set on a column the runtime is closing, for as long as
 * its leaving animation runs. A stylesheet animates on it;
 * with no animation the column is removed at once.
 */
export const leavingAttr: SoftStr = `data-${cssPrefix}-leaving`;
/**
 * Set on a column that was opened IN PLACE of another —
 * the reader chose a different link from the same column.
 * The strip's shape did not change, so a stylesheet should
 * not animate it as an arrival: the room was already there.
 */
export const replacingAttr: SoftStr = `data-${cssPrefix}-replacing`;
/**
 * Set on a link whose target is the column standing
 * immediately to the right of the link's own column: "this
 * is what opened that". Derived from the strip, not from
 * the click, so a reloaded or shared address marks it too.
 */
export const openedAttr: SoftStr = `data-${cssPrefix}-opened`;
/** The row naming every open column. */
export const trailClass: SoftStr = hook("trail");

// --- Property list (Component/usecase/properties) ---

/** A list of settings: one row per property. */
export const propsClass: SoftStr = hook("props");
/** One row: a name and the control that sets it. */
export const propClass: SoftStr = hook("prop");
/** The name in a property row. */
export const propLabelClass: SoftStr =
  hook("prop-label");
/** The control's place in a property row. */
export const propControlClass: SoftStr = hook(
  "prop-control",
);
/** An on/off switch. */
export const switchClass: SoftStr =
  hook("switch");
/** The switch's track. */
export const switchTrackClass: SoftStr = hook(
  "switch-track",
);
/** The switch's thumb. */
export const switchThumbClass: SoftStr = hook(
  "switch-thumb",
);
/** The word beside a switch saying which way it stands. */
export const switchLabelClass: SoftStr = hook(
  "switch-label",
);

// --- Shell (Shell/usecase/shell) ---

/** The frame of the framework's standard screen. */
export const shellClass: SoftStr = hook("shell");
/** The shell's pinned sidebar column. */
export const shellSideClass: SoftStr =
  hook("shell-side");
/** A column's head bar: what the column is called. */
export const shellHeadClass: SoftStr =
  hook("shell-head");
/** The name in a head bar. */
export const shellTitleClass: SoftStr = hook(
  "shell-title",
);
/** A column's body: the part that scrolls. */
export const shellBodyClass: SoftStr =
  hook("shell-body");
/** The product's name in the sidebar's head: the way home. */
export const shellBrandClass: SoftStr = hook(
  "shell-brand",
);
/** The control that folds the sidebar to a strip. */
export const shellFoldClass: SoftStr =
  hook("shell-fold");
/** The foot of the sidebar: the appearance toggle's place. */
export const shellFootClass: SoftStr =
  hook("shell-foot");
/** A document column of the shell. */
export const shellPageClass: SoftStr =
  hook("shell-page");
/** A document column's content: prose, figures, examples. */
export const docClass: SoftStr = hook("doc");
/**
 * A document column that is ONE FIGURE: the figure takes
 * the whole body, which neither pads nor scrolls it.
 */
export const figurePageClass: SoftStr = hook(
  "figure-page",
);
/** The figure's place in such a column. */
export const figureBodyClass: SoftStr = hook(
  "figure-body",
);
/**
 * The far-right chrome rail of the shell: a narrow bar of
 * controls and outside links, never navigation.
 */
export const shellRailClass: SoftStr =
  hook("shell-rail");
/** The stack of things a rail carries. */
export const shellRailGroupClass: SoftStr = hook(
  "shell-rail-group",
);
/** A run of links that leave the screen (a repository,
 * a profile). */
export const chromeLinksClass: SoftStr = hook(
  "chrome-links",
);
/** One such link. */
export const chromeLinkClass: SoftStr = hook(
  "chrome-link",
);
/** The words of one such link. */
export const chromeLinkLabelClass: SoftStr = hook(
  "chrome-link-label",
);
/** A line under the sidebar's head saying what the
 * product is. */
export const shellCaptionClass: SoftStr = hook(
  "shell-caption",
);
/** A single link closing the sidebar. */
export const shellSideLinkClass: SoftStr = hook(
  "shell-side-link",
);
/** The closing line of a document column. */
export const docFootClass: SoftStr =
  hook("doc-foot");
/** A line beside the name in a head bar, saying what it is. */
export const shellNoteClass: SoftStr =
  hook("shell-note");
/**
 * Set on the shell (or any ancestor, `<html>` included)
 * while its sidebar is folded.
 */
export const shellMinAttr: SoftStr = `data-${cssPrefix}-shell-min`;

/**
 * The bar a narrow window shows above the strip: the menu
 * control and the product's name.
 */
export const shellBarClass: SoftStr =
  hook("shell-bar");
/** The product's name in that bar: the way home. */
export const shellBarBrandClass: SoftStr = hook(
  "shell-bar-brand",
);
/** The control that opens the sidebar as a drawer. */
export const shellMenuButtonClass: SoftStr = hook(
  "shell-menu-btn",
);
/**
 * The hidden checkbox that holds the drawer's state on a
 * page with no program: its label is the menu control,
 * and the stylesheet reads `:checked`.
 */
export const shellMenuClass: SoftStr =
  hook("shell-menu");
/** That checkbox's id, which its labels point at. */
export const shellMenuId: SoftStr = `${cssPrefix}-shell-menu`;
/** What dims the page behind an open drawer. */
export const shellBackdropClass: SoftStr = hook(
  "shell-backdrop",
);
/**
 * Set on the shell while its drawer is open, by a program
 * that holds that state itself (the alternative to the
 * checkbox).
 */
export const shellOpenAttr: SoftStr = `data-${cssPrefix}-shell-open`;

/**
 * A callout in a page's prose: a boxed aside — a note, a
 * tip, a warning. {@link calloutToneClass} says which.
 */
export const calloutClass: SoftStr =
  hook("callout");
/** A callout's heading line. */
export const calloutTitleClass: SoftStr = hook(
  "callout-title",
);
/** The tones a callout comes in. */
export type CalloutTone =
  | "info"
  | "note"
  | "tip"
  | "warning"
  | "danger";
/** The class that gives a callout its tone. */
export const calloutToneClass = (
  tone: CalloutTone,
): SoftStr => hook("callout-" + tone);

// --- Shared strip (Style/usecase/shareCss) ---

/** A strip whose document columns share the room. */
export const shareClass: SoftStr = hook("share");
/** A document column that takes two columns' worth. */
export const spanTwoClass: SoftStr =
  hook("span-2");
/**
 * The custom property a host sets on a shared strip to
 * the width pinned over it (a sticky sidebar), so the
 * columns divide only the room that is left.
 */
export const shareInsetVar: SoftStr = `--${cssPrefix}-share-inset`;

/** The control that brings the previous column into view. */
export const carouselPrevClass: SoftStr = hook(
  "carousel-prev",
);
/** The control that brings the next column into view. */
export const carouselNextClass: SoftStr = hook(
  "carousel-next",
);

// --- Workspace (Layout/usecase/workspace) ---

/** The frame a pinned panel and a strip share. */
export const workspaceClass: SoftStr =
  hook("workspace");
/** The panel pinned to the frame's left edge. */
export const pinnedClass: SoftStr =
  hook("pinned");
/** The strip beside the pinned panel: menu, columns, seam. */
export const browserClass: SoftStr =
  hook("browser");
/** The strip's menu track. */
export const menuClass: SoftStr = hook("menu");
/** The spacer after the last column. */
export const seamClass: SoftStr = hook("seam");
/** Set on the workspace while its menu is shown. */
export const menuOpenAttr: SoftStr = `data-${cssPrefix}-menu-open`;
/** Set on the workspace while its menu is a narrow rail. */
export const menuCompactAttr: SoftStr = `data-${cssPrefix}-menu-compact`;
/** Set on the workspace when the window holds one column. */
export const phoneAttr: SoftStr = `data-${cssPrefix}-phone`;
/**
 * Set on the workspace while the framework itself is
 * scrolling it, so a stylesheet can lift scroll-snap for
 * the length of the glide.
 */
export const programmaticScrollAttr: SoftStr = `data-${cssPrefix}-programmatic-scroll`;
/** A strip column's width kind (`fit`/`wide`/`read`). */
export const widthAttr: SoftStr = `data-${cssPrefix}-width`;

// --- Sidebar (Component/usecase/sidebarNav) ---

/** The sidebar's `<nav>`. */
export const navClass: SoftStr = hook("nav");
/** The sidebar counting its rows 01, 02, …. */
export const navNumberedClass: SoftStr = hook(
  "nav-numbered",
);
/** One titled group of rows. */
export const navGroupClass: SoftStr =
  hook("nav-group");
/** A group's title (its `<summary>` when it toggles). */
export const navGroupTitleClass: SoftStr = hook(
  "nav-group-title",
);
/** A row that is a link. */
export const navLinkClass: SoftStr =
  hook("nav-link");
/**
 * The words of a row, apart from the row itself: what an
 * appearance marks when the row is the current one.
 */
export const navLabelClass: SoftStr =
  hook("nav-label");
/** A row that is plain text. */
export const navFlatClass: SoftStr =
  hook("nav-flat");
/** A nested group inside a group. */
export const navSubgroupClass: SoftStr = hook(
  "nav-subgroup",
);
/** A nested group's title. */
export const navSubgroupTitleClass: SoftStr =
  hook("nav-subgroup-title");

// --- Appearance toggle (Component/usecase/themeToggle) ---

export const themeToggleClass: SoftStr = hook(
  "theme-toggle",
);
export const sunClass: SoftStr = hook("sun");
export const moonClass: SoftStr = hook("moon");

// --- Buttons, shared by the form view, the renderers ---
// --- and the confirm dialog ---

export const btnClass: SoftStr = hook("btn");
export const btnPrimaryClass: SoftStr = hook(
  "btn-primary",
);
export const btnDangerClass: SoftStr =
  hook("btn-danger");
export const actionsClass: SoftStr =
  hook("actions");
export const disabledClass: SoftStr =
  hook("disabled");

// --- Confirm dialog (Component/usecase/confirmDialog) ---

export const modalClass: SoftStr = hook("modal");
export const backdropClass: SoftStr =
  hook("backdrop");
export const dialogClass: SoftStr =
  hook("dialog");
export const dialogTitleClass: SoftStr = hook(
  "dialog-title",
);
export const dialogActionsClass: SoftStr = hook(
  "dialog-actions",
);

// --- Toasts (Component/usecase/toast). A toast's tone ---
// --- hook is derived, since the tone is a value ---

export const toasterClass: SoftStr =
  hook("toaster");
export const toastClass: SoftStr = hook("toast");
export const toastCloseClass: SoftStr = hook(
  "toast-close",
);

/**
 * The tone modifier a toast carries beside
 * {@link toastClass} — `pm-toast-success`,
 * `pm-toast-danger`, and so on. A function rather than a
 * constant because the tone is a value, and a consumer
 * styling one tone should still not have to spell the
 * prefix.
 */
export const toastToneClass = (
  tone: SoftStr,
): SoftStr => hook(`toast-${tone}`);

// --- Form controls (Component/usecase/{textInput, ---
// --- textArea, selectInput, checkbox}, Form/usecase) ---

export const formClass: SoftStr = hook("form");
export const fieldsClass: SoftStr =
  hook("fields");
export const fieldClass: SoftStr = hook("field");
export const fieldLabelClass: SoftStr = hook(
  "field-label",
);
export const fieldErrorClass: SoftStr = hook(
  "field-error",
);
export const fieldValueClass: SoftStr = hook(
  "field-value",
);
export const inputClass: SoftStr = hook("input");
export const checkClass: SoftStr = hook("check");
export const checkboxClass: SoftStr =
  hook("checkbox");
export const checkLabelClass: SoftStr = hook(
  "check-label",
);

// --- Typed field renderings (Render/usecase/parts) ---

export const fieldNumClass: SoftStr =
  hook("field-num");
export const fieldFlagClass: SoftStr =
  hook("field-flag");
export const fieldMomentClass: SoftStr = hook(
  "field-moment",
);
export const fieldRefClass: SoftStr =
  hook("field-ref");
export const fieldMediaClass: SoftStr = hook(
  "field-media",
);

// --- Column head (Component/usecase/colHead) ---

export const colHeadClass: SoftStr =
  hook("colhead");
export const colHeadTitleClass: SoftStr = hook(
  "colhead-title",
);
export const colHeadLinkClass: SoftStr = hook(
  "colhead-link",
);

// --- Breadcrumbs (Component/usecase/breadcrumb) ---

export const crumbsClass: SoftStr =
  hook("crumbs");
export const crumbHereClass: SoftStr =
  hook("crumb-here");
export const crumbLinkClass: SoftStr =
  hook("crumb-link");
export const crumbSepClass: SoftStr =
  hook("crumb-sep");

// --- Renderers (Render/usecase/{parts, singleColumn, ---
// --- multiColumn}) ---

export const schedulerClass: SoftStr =
  hook("scheduler");
export const singleClass: SoftStr =
  hook("single");
export const backClass: SoftStr = hook("back");
export const hintClass: SoftStr = hook("hint");
export const errorClass: SoftStr = hook("error");
export const menuBodyClass: SoftStr =
  hook("menu-body");
export const listClass: SoftStr = hook("list");
export const listItemClass: SoftStr =
  hook("list-item");
export const listActionsClass: SoftStr = hook(
  "list-actions",
);
export const listActionClass: SoftStr = hook(
  "list-action",
);
export const rowLinkClass: SoftStr =
  hook("row-link");
export const boardClass: SoftStr = hook("board");
export const tileClass: SoftStr = hook("tile");
export const tileBodyClass: SoftStr =
  hook("tile-body");
export const tileLinkClass: SoftStr =
  hook("tile-link");
export const tileLabelClass: SoftStr =
  hook("tile-label");
export const tileCaptionClass: SoftStr = hook(
  "tile-caption",
);
export const queryClass: SoftStr = hook("query");
export const queryChoiceClass: SoftStr = hook(
  "query-choice",
);

/**
 * A plggmatic CSS custom property, by name:
 * `cssVar("surface")` → `--pm-surface`.
 *
 * The colour tokens the emitters write are read back by a
 * consumer's own stylesheet, so the `--pm-*` namespace is
 * as much a contract as the class hooks — and spelling it
 * by hand has the same failure mode. Distinct from
 * `colorVar`, which yields the `var(--pm-…)` REFERENCE for
 * a `Color` under a `Theme`; this is the bare property
 * name, for a consumer composing raw CSS text.
 */
export const cssVar = (name: SoftStr): SoftStr =>
  `--${cssPrefix}-${name}`;

/**
 * A reference to a plggmatic custom property:
 * `cssVarRef("surface")` → `var(--pm-surface)`. The form a
 * consumer's CSS declaration actually wants.
 */
export const cssVarRef = (
  name: SoftStr,
): SoftStr => `var(${cssVar(name)})`;

/**
 * A class SELECTOR for a hook: `selector(paneClass)` →
 * `.pm-pane`. Sugar for a consumer writing a stylesheet as
 * a template string, where `.${paneClass}` reads worse
 * than the call.
 */
export const selector = (
  hookClass: SoftStr,
): SoftStr => `.${hookClass}`;

// --- Basic parts (Component/usecase/{display,feedback,navigation,choices}) ---

/** A small mark of state or count. */
export const badgeClass: SoftStr = hook("badge");
/** A badge in a semantic tone. */
export const badgeToneClass = (
  tone: SoftStr,
): SoftStr => hook(`badge-${tone}`);
/** A label of classification, removable or not. */
export const tagClass: SoftStr = hook("tag");
/** The control that removes a tag. */
export const tagRemoveClass: SoftStr =
  hook("tag-remove");
/** One bounded group of content. */
export const cardClass: SoftStr = hook("card");
export const cardHeadClass: SoftStr =
  hook("card-head");
export const cardBodyClass: SoftStr =
  hook("card-body");
export const cardFootClass: SoftStr =
  hook("card-foot");
/** The scrolling frame of a data table. */
export const tableWrapClass: SoftStr =
  hook("table-wrap");
/** A table of rows and columns. */
export const tableClass: SoftStr = hook("table");
/** A cell holding a number, set to the right. */
export const numericClass: SoftStr = hook("num");
/** Pairs of a term and its value. */
export const descClass: SoftStr = hook("desc");
/** A line between two groups. */
export const dividerClass: SoftStr =
  hook("divider");
/** The round mark of a person or a thing. */
export const avatarClass: SoftStr =
  hook("avatar");
/** Source shown as written. */
export const codeBlockClass: SoftStr =
  hook("code");
/** What stands where there is nothing yet. */
export const emptyClass: SoftStr = hook("empty");
export const emptyTitleClass: SoftStr = hook(
  "empty-title",
);
/** A list of rows of one shape. */
export const itemsClass: SoftStr = hook("items");
export const itemsRowClass: SoftStr =
  hook("items-row");
export const itemsTitleClass: SoftStr = hook(
  "items-title",
);
export const itemsNoteClass: SoftStr =
  hook("items-note");
export const itemsTrailClass: SoftStr = hook(
  "items-trail",
);

/** A notice set in the page. */
export const alertClass: SoftStr = hook("alert");
export const alertToneClass = (
  tone: SoftStr,
): SoftStr => hook(`alert-${tone}`);
export const alertTitleClass: SoftStr = hook(
  "alert-title",
);
/** How far a task has come. */
export const progressClass: SoftStr =
  hook("progress");
export const progressTrackClass: SoftStr = hook(
  "progress-track",
);
export const progressBarClass: SoftStr = hook(
  "progress-bar",
);
/** Set on a progress whose end is not known. */
export const busyAttr: SoftStr = `data-${cssPrefix}-busy`;
/** The turning mark of waiting. */
export const spinnerClass: SoftStr =
  hook("spinner");
export const spinnerMarkClass: SoftStr = hook(
  "spinner-mark",
);
/** The shape of content that has not come yet. */
export const skeletonClass: SoftStr =
  hook("skeleton");
export const skeletonLineClass: SoftStr = hook(
  "skeleton-line",
);
/** Carries the short text shown on hover or focus. */
export const tipAttr: SoftStr = `data-${cssPrefix}-tip`;
export const tipClass: SoftStr = hook("tip");

/** A row of tabs. */
export const tabsClass: SoftStr = hook("tabs");
export const tabClass: SoftStr = hook("tab");
/** The row of page numbers. */
export const pagerClass: SoftStr = hook("pager");
export const pagerItemClass: SoftStr =
  hook("pager-item");
/** The steps of a procedure. */
export const stepsClass: SoftStr = hook("steps");
export const stepClass: SoftStr = hook("step");
/** Sections that open and close under their headings. */
export const accordionClass: SoftStr =
  hook("accordion");
export const accordionItemClass: SoftStr = hook(
  "accordion-item",
);
export const accordionBodyClass: SoftStr = hook(
  "accordion-body",
);
/** A button that lets a list of choices down. */
export const menuButtonClass: SoftStr = hook(
  "menu-button",
);
export const menuListClass: SoftStr =
  hook("menu-list");
export const menuItemClass: SoftStr =
  hook("menu-item");
/** A button of a glyph alone. */
export const iconButtonClass: SoftStr =
  hook("icon-btn");

/** A group of radio buttons. */
export const radiosClass: SoftStr =
  hook("radios");
export const radioClass: SoftStr = hook("radio");
/** Two to four choices side by side, one pressed. */
export const segmentedClass: SoftStr =
  hook("segmented");
export const segmentClass: SoftStr =
  hook("segment");
/** A value within a range. */
export const rangeClass: SoftStr = hook("range");
export const rangeValueClass: SoftStr = hook(
  "range-value",
);
/** A field with a mark before its input. */
export const searchClass: SoftStr =
  hook("search");

/** A button that lets a small panel down. */
export const popoverClass: SoftStr =
  hook("popover");
export const popoverBodyClass: SoftStr = hook(
  "popover-body",
);
/** A panel that comes in from an edge, over the page. */
export const drawerClass: SoftStr =
  hook("drawer");
export const drawerHeadClass: SoftStr = hook(
  "drawer-head",
);
export const drawerBodyClass: SoftStr = hook(
  "drawer-body",
);
/** Says which edge a drawer comes in from. */
export const sideAttr: SoftStr = `data-${cssPrefix}-side`;
/** Several of a few choices, all of them in view. */
export const checksClass: SoftStr =
  hook("checks");
export const checksItemClass: SoftStr = hook(
  "checks-item",
);
/** A column heading that orders the table. */
export const sortClass: SoftStr = hook("sort");
/** A month, a day to a cell. */
export const calendarClass: SoftStr =
  hook("calendar");
export const calendarHeadClass: SoftStr = hook(
  "calendar-head",
);
export const calendarGridClass: SoftStr = hook(
  "calendar-grid",
);
export const calendarDayClass: SoftStr = hook(
  "calendar-day",
);

/** A row of controls that act on one thing. */
export const toolbarClass: SoftStr =
  hook("toolbar");
/** Controls of a toolbar that belong together, joined. */
export const toolGroupClass: SoftStr =
  hook("tool-group");
/** One control of a toolbar. */
export const toolClass: SoftStr = hook("tool");
/** Set on a tool drawn as a glyph alone. */
export const toolIconClass: SoftStr =
  hook("tool-icon");

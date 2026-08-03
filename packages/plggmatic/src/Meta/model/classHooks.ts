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

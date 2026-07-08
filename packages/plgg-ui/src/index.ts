/**
 * plgg-ui — the plgg-family UI engine. The root barrel is
 * the RUNTIME surface: an explicit named-export list of
 * layout combinators, components, forms, the declarative
 * vocabulary, the scheduler, and the renderers. The THEME
 * surface (token utilities, scheme-aware color atoms, CSS
 * emitters, and the `themeToggle*` family) lives on the
 * `plgg-ui/style` subpath (see `src/styleEntry.ts`) so
 * their Tailwind-style names (`p`, `text`, …) never
 * collide with the Html element builders here, and so the
 * subpath boundary equals the runtime/theme surface
 * boundary a consumer imports across.
 */
export {
  frameworkName,
  cssPrefix,
} from "plgg-ui/Meta/model/identity";
export {
  type PaneRole,
  type Parts,
  landmarkTag,
  row,
  column,
  pane,
  navPane,
  mainPane,
  asidePane,
} from "plgg-ui/Layout";
// The `themeToggle*` family (component + class/CSS/static
// helpers) is part of the THEME surface, so it is routed
// through `plgg-ui/style` (see `src/styleEntry.ts`); its
// source stays physically in `Component/`, only the export
// is routed. Everything else here is the runtime surface.
export {
  type InteractionState,
  type ButtonProps,
  type TextLinkProps,
  type HeadingLevel,
  type NavItem,
  focusRing,
  hoverDim,
  pressDim,
  button,
  textLink,
  heading,
  prose,
  navTree,
  type ColHeadProps,
  type Crumb,
  colHead,
  breadcrumb,
  type TextInputProps,
  type TextAreaProps,
  type SelectOption,
  type SelectProps,
  type CheckboxProps,
  type ConfirmDialogProps,
  type Tone,
  type ToastProps,
  textInput,
  textArea,
  selectInput,
  checkbox,
  confirmDialog,
  tones,
  toast,
  toaster,
} from "plgg-ui/Component";

// --- Form: caster-parsed forms + submission (ticket 12) -
export {
  type ControlKind,
  type SubmissionState,
  type FieldSpec,
  type FormErrors,
  type Payload,
  type FormViewProps,
  controlKinds,
  idleSubmission,
  pendingSubmission,
  isPending,
  parseForm,
  errorFor,
  formView,
} from "plgg-ui/Form";

// --- Render: screen-mode renderers (ticket 10/11) -----
export {
  type Mode,
  type Screen,
  modes,
  toggleMode,
  currentScreen,
  type HeaderLink,
  type ExtraColumn,
  type MultiColumnOptions,
  multiColumn,
  multiColumnWith,
  crumbsOf,
  singleColumn,
  renderMode,
} from "plgg-ui/Render";

// --- Declarative vocabulary (ticket 09) ---------------
// The framework half: a mode-agnostic declaration (D10)
// from which `schedule` derives a TEA program. Renderers
// (tickets 10/11) consume the derived `Scene`; no type
// here names a column, pane, drawer, or screen.
export {
  type Field,
  type Row,
  field,
  // aliased: `row` is the Layout pane combinator above;
  // the Row data constructor takes the `make` prefix.
  row as makeRow,
} from "plgg-ui/Declare/model/Row";
export {
  type Path,
  type TypedSource,
  type Source,
  sync,
  async,
} from "plgg-ui/Declare/model/Source";
export {
  type Query,
  query,
  matchesQuery,
} from "plgg-ui/Declare/model/Query";
export {
  type Verb,
  type Confirm,
  type Action,
  immediate,
  confirm,
  action,
  isDestructive,
} from "plgg-ui/Declare/model/Action";
export {
  type Collection,
  collection,
  collectionById,
  actionById,
} from "plgg-ui/Declare/model/Collection";
export {
  type MenuEntry,
  type Menu,
  menuEntry,
  menu,
} from "plgg-ui/Declare/model/Menu";
export {
  type Declaration,
  declare,
} from "plgg-ui/Declare/model/Declaration";

// --- Scheduler (ticket 09) ----------------------------
export {
  type Slot,
  type PendingAction,
  type Model as ScheduledModel,
  emptyModel,
  slotOf,
} from "plgg-ui/Schedule/model/Model";
export {
  type SchedulerMsg,
  urlChanged,
  openMenu,
  select,
  queryInput,
  requestAction,
  confirmAction,
  cancelAction,
  loaded,
  failed,
} from "plgg-ui/Schedule/model/Msg";
export {
  type ConfirmPrompt,
  type ActionButton,
  type RowLink,
  type MenuLink,
  type QueryState,
  type Level,
  type Scene,
  menuLevel$,
  listLevel$,
  detailLevel$,
} from "plgg-ui/Schedule/model/Scene";
export {
  type UrlSlice,
  parseUrl,
  toUrl as sceneToUrl,
} from "plgg-ui/Schedule/usecase/codec";
export {
  type Scheduled,
  schedule,
} from "plgg-ui/Schedule/usecase/schedule";

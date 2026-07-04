/**
 * plggmatic — a column-oriented UI design framework on
 * the plgg family. The root barrel is an explicit
 * named-export list; it grows as the framework does
 * (tokens, pane alignment, components). Style utilities
 * live on the `plggmatic/style` subpath so their
 * Tailwind-style names (`p`, `text`, …) never collide
 * with Html element builders here.
 */
export {
  frameworkName,
  cssPrefix,
} from "plggmatic/Meta/model/identity";
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
} from "plggmatic/Layout";
export {
  type InteractionState,
  type ButtonProps,
  type TextLinkProps,
  type HeadingLevel,
  type ThemeToggleProps,
  type NavItem,
  focusRing,
  hoverDim,
  pressDim,
  button,
  textLink,
  heading,
  prose,
  themeToggle,
  staticThemeToggle,
  themeToggleClass,
  themeToggleCss,
  navTree,
  type ColHeadProps,
  type Crumb,
  colHead,
  breadcrumb,
} from "plggmatic/Component";

// --- Render: screen-mode renderers (ticket 10/11) -----
export {
  type Mode,
  type Screen,
  modes,
  toggleMode,
  currentScreen,
  multiColumn,
  singleColumn,
  renderMode,
} from "plggmatic/Render";

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
} from "plggmatic/Declare/model/Row";
export {
  type Path,
  type TypedSource,
  type Source,
  sync,
  async,
} from "plggmatic/Declare/model/Source";
export {
  type Query,
  query,
  matchesQuery,
} from "plggmatic/Declare/model/Query";
export {
  type Verb,
  type Confirm,
  type Action,
  immediate,
  confirm,
  action,
  isDestructive,
} from "plggmatic/Declare/model/Action";
export {
  type Collection,
  collection,
  collectionById,
  actionById,
} from "plggmatic/Declare/model/Collection";
export {
  type MenuEntry,
  type Menu,
  menuEntry,
  menu,
} from "plggmatic/Declare/model/Menu";
export {
  type Declaration,
  declare,
} from "plggmatic/Declare/model/Declaration";

// --- Scheduler (ticket 09) ----------------------------
export {
  type Slot,
  type PendingAction,
  type Model as ScheduledModel,
  emptyModel,
  slotOf,
} from "plggmatic/Schedule/model/Model";
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
} from "plggmatic/Schedule/model/Msg";
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
} from "plggmatic/Schedule/model/Scene";
export {
  type UrlSlice,
  parseUrl,
  toUrl as sceneToUrl,
} from "plggmatic/Schedule/usecase/codec";
export {
  type Scheduled,
  schedule,
} from "plggmatic/Schedule/usecase/schedule";

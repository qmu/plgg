/**
 * The plggmatic Layout module: the column-oriented
 * pattern as COMPOSITION. A screen is an ordered
 * {@link row} of {@link column}s, each holding
 * {@link pane} landmarks — small builders that take
 * `(parts, children)` like element builders take
 * `(attributes, children)`. There is no layout config
 * object and no interpreter: sizing (`basis`/`fluid`),
 * scroll, and responsiveness are style parts and the
 * consumer's own stylesheet targeting the `pm-row`/
 * `pm-col`/`pm-pane` hooks. An explicit named barrel
 * (house style); it grows one recorded rule at a time.
 */
export {
  type PaneRole,
  landmarkTag,
} from "plggmatic/Layout/model/pane";
export {
  type Parts,
  rowClass,
  colClass,
  paneClass,
  row,
  rowWith,
  column,
  columnWith,
  pane,
  navPane,
  mainPane,
  asidePane,
} from "plggmatic/Layout/usecase/combinators";
export {
  type StripMetrics,
  type MenuTrack,
  type StripGeometry,
  stripMetrics,
  stripGeometry,
  stripVar,
  stripStyle,
  visibleColumnStart,
  reachableScroll,
} from "plggmatic/Layout/model/geometry";
export {
  type Span,
  revealTarget,
  glideEase,
} from "plggmatic/Layout/model/reveal";
export {
  type RevealOptions,
  revealOptions,
  revealColumn,
} from "plggmatic/Layout/usecase/revealColumn";
export {
  type WorkspaceState,
  type ColumnWidth,
  workspace,
  workspaceWith,
  pinnedPanel,
  browser,
  menuColumn,
  widthColumn,
} from "plggmatic/Layout/usecase/workspace";
export {
  type PreferenceStore,
  readPreference,
  savePreference,
} from "plggmatic/Layout/usecase/preference";

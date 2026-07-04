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
  navTree,
} from "plggmatic/Component";

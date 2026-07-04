/**
 * The plggmatic Component module: the seed set of
 * fundamental components, each a pure `(props) =>
 * Html<Msg>` styled through the token utilities, each
 * carrying exactly one recorded interaction rule (see
 * each function's doc comment). An explicit named barrel
 * (house style); the set is deliberately small — form
 * controls, tables, and overlays arrive in later
 * tickets, each with its own rule. The shared
 * interaction-state vocabulary is defined once in
 * `model/interaction` and imported by all.
 */
export {
  type InteractionState,
  focusRing,
  hoverDim,
  pressDim,
} from "plggmatic/Component/model/interaction";
export {
  type ButtonProps,
  button,
} from "plggmatic/Component/usecase/button";
export {
  type TextLinkProps,
  textLink,
} from "plggmatic/Component/usecase/textLink";
export {
  type HeadingLevel,
  heading,
  prose,
} from "plggmatic/Component/usecase/typography";
export {
  type ThemeToggleProps,
  themeToggle,
} from "plggmatic/Component/usecase/themeToggle";
export { type NavItem } from "plggmatic/Component/model/navItem";
export { navTree } from "plggmatic/Component/usecase/navTree";

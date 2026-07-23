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
} from "plgg-cms/ui/Component/model/interaction";
export {
  type ButtonProps,
  button,
} from "plgg-cms/ui/Component/usecase/button";
export {
  type TextLinkProps,
  textLink,
} from "plgg-cms/ui/Component/usecase/textLink";
export {
  type HeadingLevel,
  heading,
  prose,
} from "plgg-cms/ui/Component/usecase/typography";
export {
  type ThemeToggleProps,
  themeToggle,
  staticThemeToggle,
  themeToggleClass,
  themeToggleCss,
} from "plgg-cms/ui/Component/usecase/themeToggle";
export { type NavItem } from "plgg-cms/ui/Component/model/navItem";
export { navTree } from "plgg-cms/ui/Component/usecase/navTree";
export {
  type ColHeadProps,
  colHead,
} from "plgg-cms/ui/Component/usecase/colHead";
export {
  type Crumb,
  breadcrumb,
} from "plgg-cms/ui/Component/usecase/breadcrumb";
// Form controls + action overlays (ticket 12). The
// barrel's earlier promise ("form controls, tables, and
// overlays arrive in later tickets") is now delivered for
// controls, the confirm dialog, and toasts; tables remain.
export {
  type TextInputProps,
  textInput,
} from "plgg-cms/ui/Component/usecase/textInput";
export {
  type TextAreaProps,
  textArea,
} from "plgg-cms/ui/Component/usecase/textArea";
export {
  type SelectOption,
  type SelectProps,
  selectInput,
} from "plgg-cms/ui/Component/usecase/selectInput";
export {
  type CheckboxProps,
  checkbox,
} from "plgg-cms/ui/Component/usecase/checkbox";
export {
  type ConfirmDialogProps,
  confirmDialog,
} from "plgg-cms/ui/Component/usecase/confirmDialog";
export {
  type Tone,
  type ToastProps,
  tones,
  toast,
  toaster,
} from "plgg-cms/ui/Component/usecase/toast";

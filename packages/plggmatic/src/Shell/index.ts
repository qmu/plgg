/**
 * The plggmatic Shell module: the framework's STANDARD
 * SCREEN and its look — what a product gets when it says
 * "build it with plggmatic" and nothing more. A sidebar
 * pinned on the left and the open pages sharing the width
 * beside it ({@link shell}), drawn by one stylesheet
 * ({@link kitCss}) that also dresses the framework's
 * buttons, fields, dialog and toasts.
 *
 * Everything below it (the strip, the shared widths, the
 * carousel, the sidebar) is still usable on its own; this
 * module is the assembly, so that the default is the good
 * one. An explicit named barrel (house style).
 */
export {
  type ShellPage,
  type ShellProps,
  shell,
} from "plggmatic/Shell/usecase/shell";
export { shellCss } from "plggmatic/Shell/usecase/shellCss";
export { controlsCss } from "plggmatic/Shell/usecase/controlsCss";
export { kitCss } from "plggmatic/Shell/usecase/kit";

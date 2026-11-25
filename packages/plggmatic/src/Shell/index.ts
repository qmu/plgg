/**
 * The plggmatic Shell module: the framework's STANDARD
 * SCREEN — what a product gets when it says "build it with
 * plggmatic" and nothing more. A sidebar pinned on the
 * left and the open pages sharing the width beside it
 * ({@link shell}), and the one call that styles it
 * ({@link kitCss}): the UI system's sheet, then an
 * appearance's.
 *
 * The two are kept apart. `System` says where things are
 * and how they behave; `Appearance` says how they look,
 * and the monochrome one is only the default. An explicit
 * named barrel (house style).
 */
export {
  type ShellPage,
  type ShellProps,
  type ShellDrawer,
  shell,
} from "plggmatic/Shell/usecase/shell";
export {
  kitCss,
  kitSystemCss,
  kitAppearanceCss,
} from "plggmatic/Shell/usecase/kit";
export { systemCss } from "plggmatic/System/usecase/systemCss";
export {
  type Mark,
  type Appearance,
  monochrome,
  soft,
} from "plggmatic/Appearance/model/appearance";
export { appearanceCss } from "plggmatic/Appearance/usecase/appearanceCss";
export { asAppearance } from "plggmatic/Appearance/usecase/asAppearance";

import { type SoftStr } from "plgg";
import {
  type Html,
  button as buttonEl,
  svg,
  path,
  attr,
  type_,
  onClick,
} from "plgg-view";
import {
  type Scheme,
  style_,
  bg,
  textColor,
  border,
  rounded,
  p,
  pointer,
} from "plggmatic/styleEntry";
import {
  focusRing,
  hoverDim,
} from "plggmatic/Component/model/interaction";

// The oracle's sun (8-ray) and crescent-moon paths,
// single `currentColor` fills, ported from plggpress's
// navBar so the toggle inherits the control's ink and
// flips with the theme like text.
const SUN_D: SoftStr =
  "M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12zM11 1h2v3h-2zm0 19h2v3h-2zM3.515 4.929l1.414-1.414L7.05 5.636 5.636 7.05 3.515 4.93zM16.95 18.364l1.414-1.414 2.121 2.121-1.414 1.414-2.121-2.121zm2.121-14.85l1.414 1.415-2.121 2.121-1.414-1.414 2.121-2.121zM5.636 16.95l1.414 1.414-2.121 2.121-1.414-1.414 2.121-2.121zM23 11v2h-3v-2zM4 11v2H1v-2z";
const MOON_D: SoftStr =
  "M9.822 2.238a9 9 0 0 0 11.94 11.94C20.768 18.654 16.775 22 12 22 6.477 22 2 17.523 2 12c0-4.775 3.346-8.768 7.822-9.762z";

const icon = (d: SoftStr): Html<never, "svg"> =>
  svg(
    [
      attr("viewBox", "0 0 24 24"),
      attr("width", "18"),
      attr("height", "18"),
      attr("fill", "currentColor"),
      attr("aria-hidden", "true"),
    ],
    [path([attr("d", d)], [])],
  );

/**
 * A theme toggle's props. `scheme` is the CURRENTLY
 * active scheme (so the button shows where a click will
 * take you); `toggle` is the `Msg` a click produces.
 */
export type ThemeToggleProps<Msg> = Readonly<{
  scheme: Scheme;
  toggle: Msg;
}>;

/**
 * The appearance-switch component, exercising the token
 * layer's scheme mechanism. **Recorded rule**: the
 * framework ships the VIEW ONLY — the toggle renders the
 * current scheme's icon (sun in light, moon in dark) and
 * emits a `toggle` `Msg`; applying the `dark` class to
 * `<html>` is the app's effect seam, wired through the
 * framework-owned appearance contract —
 * `applyScheme` / `appearanceStorageKey` (the preserved
 * `vp-appearance` key) / `appearanceInitScript` in
 * `Style/usecase/appearanceScript.ts` — so the component
 * stays pure. The `aria-label` names the destination
 * scheme, and the icon is a non-color cue (shape, not
 * hue) for the current one. Carries the shared focus
 * ring and hover feedback.
 */
export const themeToggle = <Msg>(
  props: ThemeToggleProps<Msg>,
): Html<Msg, "button"> =>
  buttonEl(
    [
      type_("button"),
      attr(
        "aria-label",
        props.scheme === "light"
          ? "Switch to dark mode"
          : "Switch to light mode",
      ),
      onClick(props.toggle),
      style_(
        bg("surface"),
        textColor("text"),
        border,
        rounded("full"),
        p(2),
        pointer,
        focusRing,
        hoverDim,
      ),
    ],
    [
      props.scheme === "light"
        ? icon(SUN_D)
        : icon(MOON_D),
    ],
  );

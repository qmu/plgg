import { type SoftStr } from "plgg";
import { type Theme } from "plggmatic/Style/model/theme";
import { metricCss } from "plggmatic/Style/usecase/metricCss";
import { schemeCss } from "plggmatic/Style/usecase/schemeCss";
import { themeToggleCss } from "plggmatic/Component/usecase/themeToggle";
import { systemCss } from "plggmatic/System/usecase/systemCss";
import {
  type Appearance,
  monochrome,
} from "plggmatic/Appearance/model/appearance";
import { appearanceCss } from "plggmatic/Appearance/usecase/appearanceCss";

/**
 * EVERYTHING a plggmatic screen needs, as two halves in
 * the one order that works:
 *
 * 1. **the system** — the metrics and `systemCss`: where
 *    things are and how they behave;
 * 2. **an appearance** — the palette's scheme and
 *    `appearanceCss`: how they look. {@link monochrome}
 *    unless the product says otherwise.
 *
 * ```ts
 * style.textContent = kitCss(defaultTheme);          // the default look
 * style.textContent = kitCss(myTheme, myAppearance); // the product's own
 * ```
 *
 * The halves are separable on purpose — {@link kitSystemCss}
 * and {@link kitAppearanceCss} — so a product can change
 * its appearance at run time by replacing the second and
 * leaving the first alone: nothing moves, everything is
 * redressed. Escape-safe.
 */
export const kitCss = (
  theme: Theme,
  appearance: Appearance = monochrome,
): SoftStr =>
  kitSystemCss(theme) +
  kitAppearanceCss(theme, appearance);

/** The system half: metrics, structure, behaviour. */
export const kitSystemCss = (
  theme: Theme,
): SoftStr => metricCss(theme) + systemCss(theme);

/** The appearance half: the palette and the look. */
export const kitAppearanceCss = (
  theme: Theme,
  appearance: Appearance = monochrome,
): SoftStr =>
  schemeCss(theme) +
  themeToggleCss +
  appearanceCss(theme)(appearance);

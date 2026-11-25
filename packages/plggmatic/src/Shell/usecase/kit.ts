import { type SoftStr } from "plgg";
import { type Theme } from "plggmatic/Style/model/theme";
import { metricCss } from "plggmatic/Style/usecase/metricCss";
import { schemeCss } from "plggmatic/Style/usecase/schemeCss";
import {
  shareCss,
  shareOptions,
} from "plggmatic/Style/usecase/shareCss";
import { carouselCss } from "plggmatic/Style/usecase/carouselCss";
import { sidebarNavCss } from "plggmatic/Component/usecase/sidebarNav";
import { themeToggleCss } from "plggmatic/Component/usecase/themeToggle";
import { shellCss } from "plggmatic/Shell/usecase/shellCss";
import { controlsCss } from "plggmatic/Shell/usecase/controlsCss";

/**
 * EVERYTHING the standard screen needs, in the one order
 * that works: the theme's custom properties, then the
 * shell, then what the shell holds. A product injects this
 * once and writes no layout of its own:
 *
 * ```ts
 * style.textContent = kitCss(defaultTheme);
 * root.replaceChildren(render(shell({ … })));
 * ```
 *
 * Order matters in two places and is why this exists
 * rather than a list in a README: the shared strip must
 * follow the shell (both size the same columns, at equal
 * specificity), and the scheme must precede everything
 * that reads a `--pm-*` property. Escape-safe.
 */
export const kitCss = (theme: Theme): SoftStr =>
  metricCss(theme) +
  schemeCss(theme) +
  shellCss(theme) +
  shareCss(theme)(shareOptions) +
  carouselCss(theme) +
  sidebarNavCss(theme) +
  themeToggleCss +
  controlsCss(theme);

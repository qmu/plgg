// Twin of the Design tokens page's code fences. The
// non-color token vocabulary: the prose type scale, the
// closed font-weight set, the breakpoint query builders
// (TS constants, never custom properties), the
// shell-metric custom properties, the z-index bands, and
// the framework's reduced-motion block.
import {
  style_,
  typeStyle,
  weight,
  medium,
  lineHeight,
  zIndex,
  measure,
  minWidth,
  maxWidth,
  metricVar,
  metricCss,
  reducedMotionCss,
} from "plggmatic/style";
import { div, text } from "plgg-view";

// A heading styled from the prose type scale: font-size,
// (unitless) line-height, and weight all come from one
// token, so the rendered scale can never drift from the
// map. `typeStyle("h1")` renders 1.875rem / 1.25 / 400.
export const title = div(
  [style_(typeStyle("h1"))],
  [text("Design tokens")],
);

// The individual atoms compose too — a medium-weight,
// generously-led line capped at the reading `measure` (the
// 48rem shell-metric custom property).
export const lede = div(
  [
    style_(
      weight(medium),
      lineHeight("1.75"),
      measure,
    ),
  ],
  [text("Tokens, not magic numbers.")],
);

// A raised overlay layer, from a semantic z-index band
// rather than an ad-hoc integer.
export const scrim = div(
  [style_(zIndex("overlay"))],
  [text("A modal layer")],
);

// Breakpoints are TS constants (a `@media` query cannot
// resolve `var()`), so they are consumed as strings by
// CSS-emitting code — never as `--pm-*` properties. Shell
// metrics ARE custom properties, emitted once by
// `metricCss`; the reduced-motion block is framework-owned
// and composed in rather than re-authored.
export const responsiveCss: string =
  metricCss +
  `@media ${minWidth("lg")}{.app{max-width:${metricVar("shell-max")}}}` +
  `@media ${maxWidth("sm")}{.app{padding:0}}` +
  reducedMotionCss;

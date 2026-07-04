// Twin of the Color scheme page's code fence. Themed
// color atoms resolve through `var(--pm-*)` custom
// properties, so one `dark` class on `<html>` reschemes
// the whole tree; `schemeCss` is the custom-property
// block that defines them.
import {
  bg,
  textColor,
  border,
  p,
  rounded,
  style_,
  schemeCss,
  schemeCssOf,
  asPalette,
  defaultPalette,
  contrastRatio,
  colorHex,
  appearanceInitScript,
  injectAppearanceScript,
} from "plggmatic/style";
import { div, text } from "plgg-view";
import { matchResult } from "plgg";

export const card = div(
  [
    style_(
      bg("surface"),
      textColor("text"),
      border,
      p(4),
      rounded("md"),
    ),
  ],
  [text("A themed surface")],
);

// `:root{--pm-surface:…}html.dark{--pm-surface:…}` —
// inject once into the document <style>.
export const baseColorCss = schemeCss;

// Override the palette: validate an app's brand colors at
// the boundary with `asPalette` (config-borne `unknown` →
// `Result`), then emit the scheme CSS from it. A malformed
// or incomplete palette is an `Err` naming the failing
// path — never a silent hole. (Here we re-validate the
// default itself for illustration.)
export const brandColorCss = matchResult(
  () => schemeCss,
  (palette: typeof defaultPalette) =>
    schemeCssOf(palette),
)(asPalette(defaultPalette));

// Audit any pairing with the same WCAG math the phase-1
// gate uses — `asPalette` validates shape, not taste, so
// an override author checks contrast themselves.
export const primaryOnSurface = contrastRatio(
  colorHex("light", "primary-text"),
  colorHex("light", "surface"),
);

// The no-FOUC persistence contract: inject the init script
// before `</head>` (after the SSR escaper). It reads the
// `vp-appearance` key else `prefers-color-scheme` and sets
// `html.dark` before first paint.
export const pageWithAppearance =
  injectAppearanceScript("<head></head>");
export const initScript = appearanceInitScript;

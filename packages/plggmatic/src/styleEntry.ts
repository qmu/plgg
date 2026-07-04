/**
 * The `plggmatic/style` subpath: the framework's style
 * vocabulary. It starts as plgg-view's inline-style
 * utilities and token maps, and plggmatic's own tokens
 * (color scheme, spacing, pane geometry) extend it in
 * place — consumers import the whole vocabulary from
 * this one entry. Kept off the root barrel because
 * utility names (`p`, `text`, …) collide with Html
 * element builders.
 *
 * plggmatic's themed color atoms (`bg`, `color`,
 * `textColor`, `border`, `borderColor`, `outline`) and
 * its `Color`/`Scheme` types are re-exported AFTER the
 * plgg-view star, so they SHADOW plgg-view's same-named
 * literal-hex utilities: importing `bg` from
 * `plggmatic/style` yields the `var(--pm-*)`,
 * scheme-aware version. Everything else (layout,
 * spacing, sizing, radius, font-size, `style_`) is
 * plgg-view's, unchanged.
 */
export * from "plgg-view/style";
export {
  type Color,
  type SemanticRole,
  type Neutral,
  type Scheme,
  type HexColor,
  type Palette,
  type SchemeRoot,
  type SchemeStorage,
  type TypeRole,
  type FontWeight,
  type TypeScale,
  type CompactType,
  type Breakpoint,
  type Metric,
  type ZBand,
  colors,
  schemes,
  colorHex,
  colorVar,
  asHexColor,
  defaultPalette,
  asPalette,
  paletteHex,
  hex,
  contrastRatio,
  appearanceStorageKey,
  decideScheme,
  appearanceInitScript,
  injectAppearanceScript,
  applyScheme,
  typeRoles,
  fontWeights,
  regular,
  medium,
  semibold,
  typeScale,
  sansFontStack,
  breakpoints,
  breakpointPx,
  minWidth,
  maxWidth,
  metrics,
  metricValue,
  metricVar,
  zBands,
  zValue,
  bg,
  color,
  textColor,
  border,
  borderColor,
  outline,
  basis,
  fluid,
  // `weight` SHADOWS plgg-view's untyped `weight` (star
  // above) with the closed FontWeight-typed atom.
  weight,
  lineHeight,
  zIndex,
  typeStyle,
  measure,
  schemeCss,
  schemeCssOf,
  metricCss,
  reducedMotionCss,
} from "plggmatic/Style";

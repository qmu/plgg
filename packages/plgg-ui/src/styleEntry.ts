/**
 * The `plgg-ui/style` subpath: the engine's THEME surface.
 * It starts as plgg-view's inline-style utilities and
 * token maps, and plgg-ui's own tokens (color scheme,
 * spacing, pane geometry) extend it in place — consumers
 * import the whole vocabulary from this one entry. Kept
 * off the root barrel because utility names (`p`, `text`,
 * …) collide with Html element builders.
 *
 * plgg-ui's themed color atoms (`bg`, `color`,
 * `textColor`, `border`, `borderColor`, `outline`) and
 * its `Color`/`Scheme` types are re-exported AFTER the
 * plgg-view star, so they SHADOW plgg-view's same-named
 * literal-hex utilities: importing `bg` from
 * `plgg-ui/style` yields the `var(--pm-*)`, scheme-aware
 * version. Everything else (layout, spacing, sizing,
 * radius, font-size, `style_`) is plgg-view's, unchanged.
 *
 * The `themeToggle*` family is routed here too (its source
 * stays in `Component/`): the appearance toggle is theme
 * machinery, so routing it through `/style` makes this
 * subpath boundary equal the runtime/theme surface
 * boundary a consumer imports across.
 */
export * from "plgg-view/style";
// Routed from the SPECIFIC themeToggle module, not the
// `Component` barrel: pulling the whole barrel would drag
// every component (each imports atoms from this `/style`
// barrel) into styleEntry's own evaluation graph and
// close import cycles. themeToggle's source stays in
// `Component/`.
export {
  type ThemeToggleProps,
  themeToggle,
  staticThemeToggle,
  themeToggleClass,
  themeToggleCss,
} from "plgg-ui/Component/usecase/themeToggle";
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
  neutrals,
  semanticRoles,
  variants,
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
  type SyntaxKind,
  syntaxKinds,
  syntaxPalette,
  syntaxHex,
  syntaxVar,
  schemeCss,
  schemeCssOf,
  chromeCss,
  metricCss,
  reducedMotionCss,
  syntaxCss,
} from "plgg-ui/Style";

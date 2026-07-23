/**
 * The plggmatic Style module: the framework's typed
 * color-scheme seed. An explicit named barrel (house
 * style) — it grows one recorded token/utility at a time
 * as components demand them, never as a pre-built
 * catalog. Surfaced to consumers through the
 * `plggmatic/style` subpath (see `src/styleEntry.ts`),
 * where these color atoms shadow plgg-view's literal-hex
 * ones.
 */
export {
  type Color,
  // `SemanticRole`/`Neutral` are re-exported; the token
  // `Variant` union is intentionally NOT — plgg-view's
  // style surface already exports a `Variant` (the
  // {selector, styles} CSS variant) and `styleEntry`
  // re-exports it, so the token variant stays importable
  // from `plggmatic/Style/model/token` to avoid shadowing.
  type SemanticRole,
  type Neutral,
  colors,
  // The token-vocabulary arrays (values, not the `Variant`
  // type above): a consumer building a token reference — the
  // demo-2 swatch grid — groups by these.
  neutrals,
  semanticRoles,
  variants,
  colorVar,
} from "plggpress/themeSupport/Style/model/token";
// The parameterized design language: the closed `Theme`
// contract + the neutral `defaultTheme` (today's monochrome
// `--pm-*`). Emitters take a `Theme`; the atoms and the
// `themeToggle*` chrome bind `colorVar`/`metricVar` to
// `defaultTheme`.
export {
  type Theme,
  defaultTheme,
} from "plggpress/themeSupport/Style/model/theme";
export {
  type Scheme,
  schemes,
} from "plggpress/themeSupport/Style/model/scheme";
export {
  type TypeRole,
  type FontWeight,
  type TypeScale,
  type CompactType,
  typeRoles,
  fontWeights,
  regular,
  medium,
  semibold,
  typeScale,
  sansFontStack,
} from "plggpress/themeSupport/Style/model/typography";
export {
  type Breakpoint,
  breakpoints,
  breakpointPx,
  minWidth,
  maxWidth,
} from "plggpress/themeSupport/Style/model/breakpoint";
export {
  type Metric,
  metrics,
  metricValue,
  metricVar,
} from "plggpress/themeSupport/Style/model/metric";
export {
  type ZBand,
  zBands,
  zValue,
} from "plggpress/themeSupport/Style/model/zIndex";
export {
  type HexColor,
  asHexColor,
} from "plggpress/themeSupport/Style/model/hexColor";
export {
  type Palette,
  defaultPalette,
  asPalette,
  paletteHex,
  colorHex,
  hex,
} from "plggpress/themeSupport/Style/model/palette";
export {
  appearanceStorageKey,
  decideScheme,
} from "plggpress/themeSupport/Style/model/appearance";
export {
  type SchemeRoot,
  type SchemeStorage,
  appearanceInitScript,
  injectAppearanceScript,
  applyScheme,
} from "plggpress/themeSupport/Style/usecase/appearanceScript";
export { contrastRatio } from "plggpress/themeSupport/Style/usecase/contrast";
export {
  bg,
  color,
  textColor,
  border,
  borderColor,
  outline,
  basis,
  fluid,
  lineHeight,
  weight,
  zIndex,
  typeStyle,
  measure,
} from "plggpress/themeSupport/Style/usecase/utilities";
export {
  schemeCss,
  schemeCssOf,
} from "plggpress/themeSupport/Style/usecase/schemeCss";
export { chromeCss } from "plggpress/themeSupport/Style/usecase/chromeCss";
export { metricCss } from "plggpress/themeSupport/Style/usecase/metricCss";
export { reducedMotionCss } from "plggpress/themeSupport/Style/usecase/reducedMotion";
export {
  type SyntaxKind,
  syntaxKinds,
  syntaxPalette,
  syntaxHex,
  syntaxVar,
} from "plggpress/themeSupport/Style/model/syntax";
export { syntaxCss } from "plggpress/themeSupport/Style/usecase/syntaxCss";

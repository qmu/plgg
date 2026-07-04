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
  colorVar,
} from "plggmatic/Style/model/token";
export {
  type Scheme,
  schemes,
} from "plggmatic/Style/model/scheme";
export {
  type HexColor,
  asHexColor,
} from "plggmatic/Style/model/hexColor";
export {
  type Palette,
  defaultPalette,
  asPalette,
  paletteHex,
  colorHex,
  hex,
} from "plggmatic/Style/model/palette";
export {
  appearanceStorageKey,
  decideScheme,
} from "plggmatic/Style/model/appearance";
export {
  type SchemeRoot,
  type SchemeStorage,
  appearanceInitScript,
  injectAppearanceScript,
  applyScheme,
} from "plggmatic/Style/usecase/appearanceScript";
export { contrastRatio } from "plggmatic/Style/usecase/contrast";
export {
  bg,
  color,
  textColor,
  border,
  borderColor,
  outline,
  basis,
  fluid,
} from "plggmatic/Style/usecase/utilities";
export {
  schemeCss,
  schemeCssOf,
} from "plggmatic/Style/usecase/schemeCss";

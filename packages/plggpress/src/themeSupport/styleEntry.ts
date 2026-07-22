/**
 * The `plggpress/themeSupport/styleEntry` subpath — now a
 * THIN RE-EXPORT of the real `plggmatic/style` surface.
 *
 * plggpress once vendored a byte-for-byte COPY of
 * plggmatic's Style/Component/Meta layers under
 * `themeSupport/` because it did not depend on the
 * framework. Mission
 * `plggpress-column-layout-and-voice-ai-editing` retires
 * that copy: plggpress now takes a real `plggmatic`
 * dependency and renders through the framework, so the
 * theme surface is the framework's own. This module stays
 * only as the historical import path the theme layer
 * (`shell`, `baseCss`, `navBar`, `appearanceScripts`)
 * still spells — every symbol it forwards is
 * `plggmatic/style`'s, unchanged. The monochrome qmu
 * palette is plggmatic's `defaultTheme`, so the visual
 * result is identical.
 */
export * from "plggmatic/style";

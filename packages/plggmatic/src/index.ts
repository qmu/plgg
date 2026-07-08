/**
 * plggmatic — the Pragmatic design system on the plgg
 * family. The engine + theme mechanism it used to own was
 * extracted to `plgg-ui` (the `plggmatic-extraction-cut`
 * trip, ticket A1); this package now re-exports that
 * engine so its surface is preserved byte-for-byte while
 * the cutover lands.
 *
 * The runtime surface comes straight from `plgg-ui`'s root
 * barrel. The `themeToggle*` family — which `plgg-ui`
 * routes onto its `/style` subpath — is re-exported HERE
 * on the root, so plggmatic's historical root surface
 * (where its consumers still import `themeToggle*`) does
 * not change. Ticket A2 reduces this to a thin facade and
 * repoints those consumers onto `plgg-ui` directly.
 */
export * from "plgg-ui";
export {
  type ThemeToggleProps,
  themeToggle,
  staticThemeToggle,
  themeToggleClass,
  themeToggleCss,
} from "plgg-ui/style";
// The Pragmatic brand substance plggmatic owns (A3): the
// branded default Theme + palette-override API.
export {
  pragmaticTheme,
  pragmaticThemeWithPalette,
} from "plggmatic/brand";

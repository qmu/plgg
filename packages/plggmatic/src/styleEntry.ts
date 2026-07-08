/**
 * The `plggmatic/style` subpath: the Pragmatic design
 * system's theme vocabulary. The theme mechanism moved to
 * `plgg-ui` (ticket A1); this re-exports `plgg-ui/style`
 * whole so plggmatic's `/style` surface is preserved. The
 * scheme-aware color atoms still SHADOW plgg-view's
 * literal-hex utilities (plgg-ui re-exports them after the
 * plgg-view star), and the `themeToggle*` family is
 * carried through as well. Ticket A2 reduces this to a
 * thin facade; A3 gives plggmatic ownership of the branded
 * `Theme` contract layered over this surface.
 */
export * from "plgg-ui/style";
// The Pragmatic brand substance plggmatic OWNS on top of the
// re-exported plgg-ui engine: the branded default `Theme`
// and the palette-override API (ticket A3, the empty-shell
// answer).
export {
  pragmaticTheme,
  pragmaticThemeWithPalette,
} from "plggmatic/brand";

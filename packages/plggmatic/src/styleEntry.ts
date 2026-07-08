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

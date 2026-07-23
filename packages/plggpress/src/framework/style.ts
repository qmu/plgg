// Public subpath entry mirroring `plgg-view/style` — the
// inline-style utilities + `style_`. Kept on its own entry
// for the same reason the wrapped package does: its
// Tailwind-style names (`p`, `text`, …) collide with the Html
// element builders of the same name on the root barrel. Pure
// re-export; no logic lives here.
export * from "plgg-view/style";

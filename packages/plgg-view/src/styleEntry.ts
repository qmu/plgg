// Public subpath entry: the inline-style utilities + `style_`. Exposed on its
// own `plgg-view/style` specifier (not the core entry) so its Tailwind-style
// names — `p`, `text`, … — don't collide with the Html element builders of the
// same name. Pure and SSR-safe.
export * from "plgg-view/Style";

// Renamed from `style.ts` to avoid a case collision with the `Style/`
// directory on case-insensitive filesystems (a lowercase `style.ts`
// beside `Style/` makes `tsc` fail with TS1149). The public
// `plgg-view/style` subpath is preserved via `package.json` `exports`
// (which point at `dist/styleEntry.*`). Do NOT rename this back to
// `style.ts`.
//
// Public subpath entry: the inline-style utilities + `style_`. Exposed on its
// own `plgg-view/style` specifier (not the core entry) so its Tailwind-style
// names — `p`, `text`, … — don't collide with the Html element builders of the
// same name. Pure and SSR-safe.
export * from "plgg-view/Style";

// Registers the plgg-test ESM resolver hook. Loaded via Node's
// `--import` so it is installed before any spec module is resolved.
// Kept as plain `.mjs` (no type-stripping needed) because it runs at
// the very process entry; it points at the TS hook, which Node strips
// on load.
import { register } from "node:module";

register(
  "./hook.ts",
  import.meta.url,
);

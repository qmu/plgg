import { renderApp } from "./index";

/**
 * Node demo — see the output without a browser:
 *
 *   cd src/example-view && npx tsx src/demo.ts
 *
 * Prints the same HTML string the browser entry ([./mount.tsx]) would inject.
 */
console.log(renderApp());

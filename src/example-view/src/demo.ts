import { App } from "./index";

/**
 * Node demo — see what plgg-view produces from the .tsx components:
 *
 *   cd src/example-view && npx tsx src/demo.ts
 *
 * `App()` is the processed view — a pure-data plgg `VNode` tree. There is no
 * HTML and no DOM in this POC; printing the tree as JSON shows exactly what the
 * components compiled to.
 */
console.log(JSON.stringify(App(), null, 2));

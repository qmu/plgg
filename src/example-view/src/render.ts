import { pipe } from "plgg";
import { renderToString } from "plgg-view";
import { App } from "./App";

/**
 * Renders the whole app to an HTML string — a one-line, data-last pipeline:
 * build the `VNode` tree (`App()`), then fold it to HTML (`renderToString`).
 * This is the single output of the library in this POC; it is what both the
 * browser entry ([./mount.tsx]) and the Node demo ([./demo.ts]) call.
 */
export const renderApp = (): string =>
  pipe(App(), renderToString);

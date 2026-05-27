import { renderApp } from "./render";

/**
 * Browser entry — how this library renders client-side today.
 *
 * `plgg-view` is static SSR-to-string for now (DOM mounting is deferred), so on
 * the client you render the tree to HTML and hand the string to the DOM once.
 * Wire this module from your page, e.g. `<div id="app-root"></div>` plus
 * `<script type="module" src="./mount.js"></script>` (after bundling).
 *
 * It is intentionally kept out of the package barrel: it touches `document`, so
 * it only runs in a browser and must not be imported by Node code or tests.
 */
const root = document.getElementById("app-root");

if (root !== null) {
  root.innerHTML = renderApp();
}

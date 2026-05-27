import { render } from "plgg-web/client";
import { App } from "./App";

/**
 * The client entry — bundled (see vite.config.ts) into dist/client.js, which the
 * server serves at /client.js and the SSR document loads via
 * `<script type="module">`. On load it renders the *same* `App` into the
 * server-rendered `#root`, taking over the markup (CSR).
 */
const root = document.getElementById("root");

if (root !== null) {
  render(App(), root);
}

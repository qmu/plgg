import { pipe, fromNullable, mapOption } from "plgg";
import { render } from "plgg-web/client";
import { App } from "../App";

/**
 * (2) Client-side rendering. Bundled (see vite.config.ts) into dist/client.js,
 * which the SSR document loads via `<script type="module">`. On load it renders
 * the *same* `App` into the server-rendered `#root`, taking over the markup.
 *
 * The mount point is looked up the plgg way: `getElementById` is nullable, so it
 * is lifted into an `Option` (`fromNullable`) and rendered only when present —
 * no native null check.
 */
pipe(
  fromNullable(document.getElementById("root")),
  mapOption((root: Element) => render(App(), root)),
);

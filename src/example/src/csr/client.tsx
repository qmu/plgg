import {
  InvalidError,
  pipe,
  fromNullable,
  mapOption,
  matchResult,
  decodeJson,
  chainResult,
} from "plgg";
import { render } from "plgg-server/client";
import { App } from "../App";
import { asArticles } from "../modeling/Article";

/**
 * (2) Client-side rendering / hydration. Bundled (see vite.config.ts) into
 * dist/client.js, which the SSR document loads via `<script type="module">`. It
 * fetches the same `/api/articles` data the server rendered from — native
 * `fetch` (a browser global) keeps `node:http` out of this bundle; the typed
 * plgg-http-client is used by the node `client` demo instead — decodes it the
 * plgg way (`decodeJson` → `asArticles`), and re-renders the same `App` into the
 * server-rendered `#root`, taking over the markup.
 */
const hydrate = (root: Element): Promise<void> =>
  fetch("/api/articles")
    .then((res) => res.text())
    .then((text) =>
      pipe(
        decodeJson(text),
        chainResult(asArticles),
        matchResult(
          (e: InvalidError): void =>
            console.error(
              `hydrate failed: ${e.message}`,
            ),
          (articles): void =>
            render(App({ articles }), root),
        ),
      ),
    );

pipe(
  fromNullable(document.getElementById("root")),
  mapOption(hydrate),
);

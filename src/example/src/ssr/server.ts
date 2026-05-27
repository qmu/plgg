import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pipe, ok } from "plgg";
import {
  web,
  get,
  toFetch,
  serve,
  pageResponse,
  javascriptResponse,
} from "plgg-web";
import { App } from "../App";

/**
 * (1) Server-side rendering. `GET /` renders `App` to a full HTML document with
 * `pageResponse` (SSR) and points the page at `/client.js`; `GET /client.js`
 * serves the client bundle (built by `vite build` into ../../dist/client.js)
 * which re-renders the same `App` in the browser (CSR).
 *
 * Run: `npm run build` then `npm run serve` (tsx src/ssr/server.ts).
 */
const clientBundle = readFileSync(
  join(__dirname, "..", "..", "dist", "client.js"),
  "utf8",
);

const app = pipe(
  web(),
  get("/", async () =>
    ok(
      pageResponse({
        title: "plgg-web isomorphic demo",
        root: App(),
        clientEntry: "/client.js",
      }),
    ),
  ),
  get("/client.js", async () =>
    ok(javascriptResponse(clientBundle)),
  ),
);

pipe(
  app,
  toFetch,
  serve({ port: 3000 }, () =>
    console.log("listening on http://localhost:3000"),
  ),
);

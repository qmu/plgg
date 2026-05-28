import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pipe } from "plgg";
import { toFetch, serve } from "plgg-server";
import { createArticlesDb } from "../db/open";
import { buildApp } from "../server/app";

/**
 * The full-stack demo server. It opens a seeded plgg-sql (node:sqlite) database,
 * builds the app (SSR page + JSON API + CSR bundle), and serves it. The browser
 * hydrates from `/api/articles`; `npm run client` runs the plgg-http-client demo
 * against the same API.
 *
 * Run: `npm run build` (bundles dist/client.js) then `npm run serve`.
 */
const clientBundle = readFileSync(
  join(__dirname, "..", "..", "dist", "client.js"),
  "utf8",
);

createArticlesDb().then((db) =>
  pipe(
    buildApp(db, clientBundle),
    toFetch,
    serve({ port: 3000 }, () =>
      console.log(
        "listening on http://localhost:3000",
      ),
    ),
  ),
);

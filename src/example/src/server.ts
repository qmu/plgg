import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pipe } from "plgg";
import { toFetch, serve } from "plgg-server";
import { createTodosDb } from "./db";
import { buildApp } from "./controller";

/**
 * The full-stack To-Do server. It opens a seeded in-memory plgg-sql (node:sqlite)
 * database, builds the controller (SSR page + JSON CRUD API + CSR bundle), and
 * serves it. The browser bundle hydrates from `/api/todos` and drives all
 * subsequent reads + mutations through `plgg-fetch` (`client.tsx`).
 *
 * Run: `npm run build` (bundles dist/client.js) then `npm run serve`.
 */
const clientBundle = readFileSync(
  join(__dirname, "..", "dist", "client.js"),
  "utf8",
);

createTodosDb().then((db) =>
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

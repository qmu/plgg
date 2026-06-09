/**
 * SSR entry — the server half of the isomorphic demo.
 *
 * The same pure `view` that the client runs is rendered to an HTML string here
 * via plgg-server's `pageResponse` (which folds `Html<Msg>` through plgg-view's
 * `renderToString`, dropping handlers). The page embeds `<div id="root">` with
 * the server-rendered markup plus a `<script src="/main.js">` that boots the
 * client `sandbox`; the client then rebuilds `view(init)` into the same node on
 * mount and takes over (a full first paint, not hydration — reusing the server's
 * markup waits for a hydration pass; subsequent re-renders diff/patch in place).
 *
 * Run it:
 *   npm run build      # bundles the client to dist/main.js (served below)
 *   npx tsx src/server.ts
 *   open http://localhost:3000
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  Result,
  SoftStr,
  pipe,
  ok,
  err,
  tryCatch,
  matchResult,
} from "plgg";
import {
  web,
  get,
  toFetch,
  pageResponse,
  javascriptResponse,
  notFound,
  HttpResponse,
  HttpError,
} from "plgg-server";
import { serve } from "plgg-server/node";
import { view, init } from "./app";

/**
 * The built client bundle the SSR page points its module script at. Resolved
 * from the working directory — run `npm run serve:ssr` from the package root.
 */
const BUNDLE_PATH = join(
  process.cwd(),
  "dist",
  "main.js",
);

/** Reads the bundle as a `Result` — a missing build degrades to a 404. */
const readBundle = tryCatch((path: SoftStr) =>
  readFileSync(path, "utf8"),
);

/**
 * A content hash of the client bundle, computed once at startup. Stamped into
 * the `/main.js?v=…` script URL and the `ETag`, so a new build always busts
 * every caching layer (browser and CDN edge) instead of serving stale client
 * JS over fresh SSR markup. A missing bundle degrades to a constant token.
 */
const bundleVersion: SoftStr = pipe(
  tryCatch((path: SoftStr) =>
    createHash("sha256")
      .update(readFileSync(path))
      .digest("hex"),
  )(BUNDLE_PATH),
  matchResult(
    (): SoftStr => "dev",
    (hex: SoftStr): SoftStr => hex.slice(0, 16),
  ),
);

const app = pipe(
  web(),

  // SSR: render the shared `view(init)` into a full document. The same view the
  // client mounts — one source of truth for both render targets.
  get("/", async () =>
    ok(
      pageResponse({
        title: "plgg To-Do — SSR + CSR",
        root: view(init),
        clientEntry: `/main.js?v=${bundleVersion}`,
      }),
    ),
  ),

  // Serve the client bundle (plgg-server has no static layer, so a route reads
  // it off disk and hands it to `javascriptResponse`).
  get("/main.js", async () =>
    pipe(
      readBundle(BUNDLE_PATH),
      matchResult(
        (): Result<HttpResponse, HttpError> =>
          err(
            notFound(
              "/main.js — run `npm run build` first",
            ),
          ),
        (
          body: SoftStr,
        ): Result<HttpResponse, HttpError> =>
          ok(
            javascriptResponse(body, 200, {
              "cache-control": "no-cache",
              etag: `"${bundleVersion}"`,
            }),
          ),
      ),
    ),
  ),
);

pipe(
  app,
  toFetch,
  serve({ port: 3000 }, () =>
    console.log(
      "listening on http://localhost:3000",
    ),
  ),
);

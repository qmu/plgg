/**
 * SSR entry — the server half of the isomorphic demo.
 *
 * The same pure `view` that the client runs is rendered to an HTML string here
 * via plgg-server's `pageResponse` (which folds `Html<Msg>` through plgg-view's
 * `renderToString`, dropping handlers). The page embeds `<div id="root">` with
 * the server-rendered markup plus a `<script src="/main.js">` that boots the
 * client `sandbox`; the client then re-renders `view(init)` into the same node
 * and takes over (full re-render — true hydration waits for a `Cmd` phase).
 *
 * Run it:
 *   npm run build      # bundles the client to dist/main.js (served below)
 *   npx tsx src/server.ts
 *   open http://localhost:3000
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

const app = pipe(
  web(),

  // SSR: render the shared `view(init)` into a full document. The same view the
  // client mounts — one source of truth for both render targets.
  get("/", async () =>
    ok(
      pageResponse({
        title: "plgg To-Do — SSR + CSR",
        root: view(init),
        clientEntry: "/main.js",
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
          ok(javascriptResponse(body)),
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

/**
 * Static-build entry — the SSG counterpart of `server.ts`. Renders the same
 * pure `view` to a static HTML file via plgg-server's node-only `./ssg` entry,
 * then reports the outcome as a value (never throws).
 *
 * Caveat (not a feature): plgg-view does not hydrate — each emitted page is a
 * full first paint that the client mount re-renders from `view(init)`. Scope is
 * HTML only: this build does not copy the client JS bundle, images, or fonts.
 *
 * Run it:
 *   node src/build.ts
 *   open dist/site/index.html
 */
import { join } from "node:path";
import {
  type Defect,
  pipe,
  ok,
  matchResult,
} from "plgg";
import {
  web,
  get,
  pageResponse,
} from "plgg-server";
import {
  generateStatic,
  type SsgError,
} from "plgg-server/ssg";
import { view, init } from "./app.ts";

const app = pipe(
  web(),
  get("/", async () =>
    ok(
      pageResponse({
        title: "plgg To-Do — SSG",
        root: view(init),
        clientEntry: "/main.js",
      }),
    ),
  ),
);

const OUT_DIR = join(
  process.cwd(),
  "dist",
  "site",
);

generateStatic(app)({
  paths: ["/"],
  outDir: OUT_DIR,
}).then(
  matchResult(
    (e: SsgError | Defect): void =>
      console.error("SSG build failed", e),
    (files: ReadonlyArray<string>): void =>
      console.log("wrote", files),
  ),
);

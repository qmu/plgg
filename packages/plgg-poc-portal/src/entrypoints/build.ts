/**
 * SSG entry — renders the portal to a static
 * `dist/site/index.html` via plgg-server's node-only
 * `./ssg` surface. The portal ships no client bundle
 * (`clientEntry` omitted): it is a pure index page whose
 * only interactions are links, so static HTML is the
 * whole app.
 *
 * Run: `npm run build`, then serve `dist/site/` (see
 * `serve.ts`).
 */
import { join } from "node:path";
import {
  type Defect,
  pipe,
  ok,
  matchResult,
} from "plgg";
import { web, get, pageResponse } from "plgg-server";
import {
  generateStatic,
  type SsgError,
} from "plgg-server/ssg";
import { view } from "../view.ts";
import { POCS } from "../pocs.ts";

const app = pipe(
  web(),
  get("/", async () =>
    ok(
      pageResponse({
        title: "plggpress PoC portal",
        root: view(POCS),
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
    (e: SsgError | Defect): void => {
      console.error("SSG build failed", e);
      process.exitCode = 1;
    },
    (files: ReadonlyArray<string>): void =>
      console.log("wrote", files),
  ),
);

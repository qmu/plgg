import {
  mkdtemp,
  mkdir,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  test,
  check,
  okThen,
  errThen,
  toBe,
} from "plgg-test";
import { none } from "plgg";
import {
  type HttpRequest,
  type HttpResponse,
  handle,
} from "plggpress/framework";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import { pressRouter } from "plggpress/router/pressRouter";

const config: SiteConfig = {
  title: "S",
  description: "d",
  base: "/",
  nav: [],
  sidebar: [],
  social: [],
  // No home DATA: a `layout: home` page degrades to its
  // Markdown body rather than failing.
  dev: { allowedHosts: [] },
  models: none(),
  rawHtml: none(),
  slugger: none(),
};

const req = (path: string): HttpRequest => ({
  method: "GET",
  path,
  query: {},
  headers: {},
  params: {},
  body: "",
  bytes: none(),
});

// A fixture corpus exercising every router branch:
//  - foo/index.md   → the SECOND file candidate
//  - index.md       → home layout with NO home data
//  - bad.md         → a parse failure (unterminated fence)
//  - /missing/      → no backing file
const root = await mkdtemp(
  join(tmpdir(), "plggpress-router-"),
);
await mkdir(join(root, "foo"), {
  recursive: true,
});
await writeFile(
  join(root, "foo", "index.md"),
  "# Foo\n\nbody\n",
  "utf8",
);
await writeFile(
  join(root, "index.md"),
  "---\nlayout: home\n---\n\n# Home\n",
  "utf8",
);
await writeFile(
  join(root, "bad.md"),
  "---\nlayout: home\n",
  "utf8",
);

const app = pressRouter(root, config, "/", [
  "/foo/",
  "/",
  "/bad/",
  "/missing/",
]);

const status = (res: HttpResponse): number =>
  res.status.content;

test("serves a page backed by <dir>/index.md (second candidate)", async () =>
  check(
    await handle(app, req("/foo/")),
    okThen((res: HttpResponse) =>
      toBe(200)(status(res)),
    ),
  ));

test("serves a layout:home page with no home data as its Markdown body", async () =>
  check(
    await handle(app, req("/")),
    okThen((res: HttpResponse) =>
      toBe(200)(status(res)),
    ),
  ));

test("folds a Markdown parse failure into a typed HttpError", async () =>
  check(
    await handle(app, req("/bad/")),
    errThen((e: { __tag: string }) =>
      toBe("InternalError")(e.__tag),
    ),
  ));

test("folds a missing source file into a typed HttpError", async () =>
  check(
    await handle(app, req("/missing/")),
    errThen((e: { __tag: string }) =>
      toBe("InternalError")(e.__tag),
    ),
  ));

import {
  mkdtemp,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  test,
  check,
  all,
  okThen,
  errThen,
  toBe,
} from "plgg-test";
import {
  type SoftStr,
  type Defect,
  type PromisedResult,
  none,
  err,
  matchOption,
} from "plgg";
import {
  type HttpRequest,
  type HttpResponse,
  handle,
} from "plggmatic";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import { type BrokenLinks } from "plggpress/CheckLinks/model/CheckLinks";
import { buildSpecOf } from "plggpress/Press/usecase/appSpecs";

const config: SiteConfig = {
  title: "S",
  description: "d",
  base: "/",
  nav: [],
  sidebar: [],
  social: [],
  dev: { allowedHosts: [] },
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

// A fixture corpus: a healthy page linking to itself and
// a page carrying a broken internal link.
const root = await mkdtemp(
  join(tmpdir(), "plggpress-appspecs-"),
);
await writeFile(
  join(root, "index.md"),
  "# Home\n\n[self](/)\n",
  "utf8",
);
await writeFile(
  join(root, "broken.md"),
  "# Broken\n\n[gone](/nope/)\n",
  "utf8",
);

const spec = buildSpecOf(config, root, "/");

/**
 * The sentinel a missing link check surfaces as — a spec
 * failure distinct from any real check outcome.
 */
type LinkCheckMissing = Readonly<{
  __tag: "LinkCheckMissing";
}>;

/**
 * Run the spec's optional link check over `paths` — the
 * `None` branch is a spec failure, surfaced as the
 * {@link LinkCheckMissing} sentinel `Err`.
 */
const runLinkCheck = (
  paths: ReadonlyArray<SoftStr>,
): PromisedResult<
  unknown,
  Defect | BrokenLinks | LinkCheckMissing
> =>
  matchOption(
    (): PromisedResult<
      unknown,
      Defect | BrokenLinks | LinkCheckMissing
    > =>
      Promise.resolve(
        err({ __tag: "LinkCheckMissing" }),
      ),
    (
      run: (
        paths: ReadonlyArray<SoftStr>,
      ) => PromisedResult<
        unknown,
        Defect | BrokenLinks
      >,
    ): PromisedResult<
      unknown,
      Defect | BrokenLinks | LinkCheckMissing
    > => run(paths),
  )(spec.linkCheck);

test("buildSpecOf.router serves a discovered route through the press render path", async () =>
  check(
    await handle(spec.router(["/"]), req("/")),
    okThen((res: HttpResponse) =>
      toBe(200)(res.status.content),
    ),
  ));

test("buildSpecOf carries the rendered theme 404 body", () =>
  all([
    check(
      spec.notFoundHtml.includes(
        "Page not found",
      ),
      toBe(true),
    ),
    check(
      spec.notFoundHtml.includes("<!doctype"),
      toBe(true),
    ),
  ]));

test("buildSpecOf.linkCheck passes a healthy corpus", async () =>
  check(
    await runLinkCheck(["/"]),
    okThen(() => toBe(true)(true)),
  ));

test("buildSpecOf.linkCheck fails the build on a broken internal link", async () =>
  check(
    await runLinkCheck(["/", "/broken/"]),
    errThen((e: { __tag: string }) =>
      toBe("BrokenLinks")(e.__tag),
    ),
  ));

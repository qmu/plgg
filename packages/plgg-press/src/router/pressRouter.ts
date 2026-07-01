import { join } from "node:path";
import { readFile } from "node:fs/promises";
import {
  type SoftStr,
  type Result,
  type PromisedResult,
  type InvalidError,
  ok,
  err,
  isOk,
  pipe,
  mapErr,
  mapResult,
  chainResult,
  matchOption,
} from "plgg";
import {
  type Html,
  renderToString,
} from "plgg-view";
import {
  type MarkdownDoc,
  renderMarkdownWith,
} from "plgg-md";
import { asHighlighter } from "plgg-highlight";
import {
  type Web,
  type Handler,
  type Context,
  type HttpResponse,
  type HttpError,
  web,
  get,
  splitPath,
  htmlResponse,
  internalError,
  notFound,
} from "plgg-server";
import {
  type SiteConfig,
  type HomeConfig,
} from "plgg-press/SiteConfig/model/SiteConfig";
import { href } from "plgg-press/Href/usecase/href";
import { injectThemeScripts } from "plgg-press/theme/themeScript";
import { shell } from "plgg-press/theme/shell";
import { page } from "plgg-press/theme/page";
import { homeHero } from "plgg-press/theme/homeHero";

/**
 * The source `*.md` candidates a route path can have come
 * from — the exact inverse of `discoverPaths`'
 * route-mapping, which collapses BOTH `foo.md` and
 * `foo/index.md` onto `/foo/`. The root `/` is `index.md`;
 * every other path is tried as `<segs>.md` first, then
 * `<segs>/index.md`. Reading whichever exists keeps the
 * handler generic — it reconstructs the file from the
 * request path alone, so one handler serves every route.
 */
export const candidateFiles = (
  contentDir: SoftStr,
  path: SoftStr,
): ReadonlyArray<SoftStr> =>
  pipe(
    splitPath(path),
    (
      segs: ReadonlyArray<SoftStr>,
    ): ReadonlyArray<SoftStr> =>
      segs.length === 0
        ? [join(contentDir, "index.md")]
        : [
            join(contentDir, ...segs) + ".md",
            join(contentDir, ...segs, "index.md"),
          ],
  );

/**
 * Reads one `*.md` file, lifting any fs throw (a missing
 * candidate, a permission error) into an
 * {@link HttpError} — never an escaped exception.
 */
const readOne = (
  file: SoftStr,
): PromisedResult<SoftStr, HttpError> =>
  readFile(file, "utf8").then(
    (source: SoftStr): Result<SoftStr, HttpError> =>
      ok(source),
    (error: unknown): Result<SoftStr, HttpError> =>
      err(internalError(String(error))),
  );

/**
 * Tries the candidate source files in order, returning the
 * first that reads. A `discoverPaths`-found route always
 * has a backing file, so this normally hits the first (or
 * second) candidate; the seed `notFound` is the value
 * returned only if every candidate is unreadable.
 */
const readSource = (
  files: ReadonlyArray<SoftStr>,
): PromisedResult<SoftStr, HttpError> =>
  files.reduce(
    (
      acc: PromisedResult<SoftStr, HttpError>,
      file: SoftStr,
    ): PromisedResult<SoftStr, HttpError> =>
      acc.then(
        (
          soFar: Result<SoftStr, HttpError>,
        ): PromisedResult<SoftStr, HttpError> =>
          isOk(soFar)
            ? Promise.resolve(soFar)
            : readOne(file),
      ),
    Promise.resolve(
      err<HttpError>(notFound(files.join(", "))),
    ),
  );

/**
 * Whether the page opted into the generic home layout via
 * its `layout: home` frontmatter marker.
 */
const isHome = (doc: MarkdownDoc): boolean =>
  pipe(
    doc.frontmatter.layout,
    matchOption(
      (): boolean => false,
      (layout: SoftStr): boolean =>
        layout === "home",
    ),
  );

/**
 * The content region to wrap: the generic
 * {@link homeHero} rendered from `config.home` DATA when
 * the page is `layout: home` AND the config carries home
 * data, otherwise the rendered Markdown body. A
 * `layout: home` page with no configured home data
 * degrades to its Markdown body rather than failing.
 */
const contentOf = (
  config: SiteConfig,
  base: SoftStr,
  doc: MarkdownDoc,
): Html<never> =>
  isHome(doc)
    ? pipe(
        config.home,
        matchOption(
          (): Html<never> => doc.body,
          (home: HomeConfig): Html<never> =>
            homeHero(home, base),
        ),
      )
    : doc.body;

/**
 * Composes one page: pick the content region, wrap it in
 * the {@link page} layout (top {@link navBar} + the
 * {@link sidebarTree} marked at the route being rendered,
 * or the full-width hero for `layout: home`), then in the
 * theme document {@link shell} (which derives the
 * `<title>` and inlines the collected atomic CSS). `route`
 * is the path being rendered — the `activePath` the chrome
 * marks — threaded from the per-route handler.
 */
const pageView = (
  config: SiteConfig,
  base: SoftStr,
  doc: MarkdownDoc,
  route: SoftStr,
): Html<never> =>
  shell(
    config,
    doc,
    page(
      config,
      doc,
      contentOf(config, base, doc),
      route,
      base,
    ),
  );

/**
 * The shared route handler: read the route's source file,
 * render it through the injected highlighter + base-aware
 * {@link href} resolver, wrap via the theme, and answer an
 * `htmlResponse`. A parse failure folds to a typed
 * {@link HttpError} (`internalError`) so the SSG crawl
 * short-circuits loudly. Reads the request path from the
 * {@link Context}, so the same handler serves every
 * registered route.
 */
const pageHandler =
  (
    contentDir: SoftStr,
    config: SiteConfig,
    base: SoftStr,
  ): Handler =>
  (
    c: Context,
  ): PromisedResult<HttpResponse, HttpError> =>
    readSource(
      candidateFiles(contentDir, c.req.path),
    ).then(
      chainResult(
        (
          source: SoftStr,
        ): Result<HttpResponse, HttpError> =>
          pipe(
            renderMarkdownWith(
              asHighlighter(),
              href(base),
            )(source),
            mapErr(
              (e: InvalidError): HttpError =>
                internalError(e.content.message),
            ),
            mapResult(
              (doc: MarkdownDoc): HttpResponse =>
                htmlResponse(
                  injectThemeScripts(
                    renderToString(
                      pageView(
                        config,
                        base,
                        doc,
                        c.req.path,
                      ),
                    ),
                  ),
                ),
            ),
          ),
      ),
    );

/**
 * The internal content router: ONE GET route per
 * `discoverPaths` result, every route bound to the shared
 * {@link pageHandler}. Built data-last over the discovered
 * paths through `web()`/`get()`, so feeding the same
 * `paths` to `generateStatic` renders exactly the routes
 * registered here — the crawl can never 404. Pure data; no
 * filesystem touch until a handler runs (acceptable
 * `node:fs` in the build tool, never in the pure Ssg
 * core).
 */
export const pressRouter = (
  contentDir: SoftStr,
  config: SiteConfig,
  base: SoftStr,
  paths: ReadonlyArray<SoftStr>,
): Web =>
  paths.reduce(
    (app: Web, path: SoftStr): Web =>
      get(
        path,
        pageHandler(contentDir, config, base),
      )(app),
    web(),
  );

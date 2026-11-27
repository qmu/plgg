import {
  get,
  javascriptResponse,
} from "plgg-server";
import {
  builtins,
  islandPage,
  islandAsset,
  type Part,
} from "plggpress/SiteConfig/usecase/diagramFence";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import {
  type SoftStr,
  type Option,
  type Result,
  type PromisedResult,
  type InvalidError,
  ok,
  err,
  isOk,
  pipe,
  getOr,
  mapErr,
  mapResult,
  chainResult,
  toOption,
  matchOption,
} from "plgg";
import {
  type Column,
  type Composition,
  restParam,
  spanParam,
  decodeComposition,
  injectNavigationScript,
} from "plggmatic";
import {
  type Html,
  renderToString,
} from "plggpress/framework";
import {
  type MarkdownDoc,
  renderMarkdownWithOptions,
} from "plggpress/framework";
import { asHighlighter } from "plggpress/framework";
import { pressRenderOptions } from "plggpress/SiteConfig/usecase/renderSeams";
import {
  type Web,
  type Handler,
  type Context,
  type HttpResponse,
  type HttpError,
  splitPath,
  query,
  htmlResponse,
  internalError,
  notFound,
} from "plggpress/framework";
import { buildRouter } from "plggpress/framework";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import {
  href,
  hrefFrom,
  unbase,
} from "plggpress/Href/usecase/href";
import { injectAppearanceScripts } from "plggpress/theme/appearanceScripts";
import { markedBody } from "plggpress/Locate/usecase/markSpan";
import { shell } from "plggpress/theme/shell";
import {
  type PageColumn,
  page,
} from "plggpress/theme/page";

/**
 * One column of a composition after its source rendered:
 * the route it came from (which the strip marks, so the
 * client runtime can compare screen to URL) and the
 * document itself.
 */
type RenderedColumn = Readonly<{
  route: SoftStr;
  span: Option<SoftStr>;
  body: Html<never>;
  doc: MarkdownDoc;
  parts: readonly Part[];
}>;

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
 * The place a route's page is WRITTEN from, in the form
 * {@link hrefFrom} reads: `/guide/dsl` (no trailing slash)
 * for a page that is its own file, `/guide/` for a
 * folder's `index.md`. The route alone cannot tell —
 * `foo.md` and `foo/index.md` are the same route — and the
 * two resolve `./x` differently, so the file on disk
 * decides, by the same precedence {@link candidateFiles}
 * reads in.
 */
export const linkPlace = (
  contentDir: SoftStr,
  route: SoftStr,
): SoftStr =>
  pipe(
    splitPath(route),
    (segs: ReadonlyArray<SoftStr>): SoftStr =>
      segs.length === 0
        ? "/"
        : existsSync(
              join(contentDir, ...segs) + ".md",
            )
          ? "/" + segs.join("/")
          : "/" + segs.join("/") + "/",
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
    (
      source: SoftStr,
    ): Result<SoftStr, HttpError> => ok(source),
    (
      error: unknown,
    ): Result<SoftStr, HttpError> =>
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
 * Composes one page: wrap the composition's rendered
 * Markdown bodies in the {@link page} layout (the
 * sidebar-first shell marked at the route being rendered —
 * the landing page renders as ordinary prose through the
 * same shell, qmu.co.jp's model), then in the theme
 * document {@link shell} (which derives the `<title>` and
 * inlines the collected atomic CSS). `route` is the path
 * being rendered — the `activePath` the chrome marks —
 * threaded from the per-route handler.
 *
 * The `<title>`, the canonical link and the marked chrome
 * all follow the HEAD document alone, so opening columns
 * never changes what the page claims to be.
 */
const pageView = (
  config: SiteConfig,
  base: SoftStr,
  head: RenderedColumn,
  rest: ReadonlyArray<RenderedColumn>,
  route: SoftStr,
): Html<never> =>
  shell(
    config,
    head.doc,
    page(
      config,
      [head, ...rest].map(
        (column: RenderedColumn): PageColumn => ({
          route: column.route,
          span: column.span,
          title: pipe(
            column.doc.firstHeading,
            getOr(column.route),
          ),
          sheet:
            column.doc.frontmatter.layout
              .__tag === "Some" &&
            column.doc.frontmatter.layout
              .content === "sheet",
          description:
            column.doc.frontmatter.description,
          body: column.body,
        }),
      ),
      route,
      base,
    ),
  );

/**
 * Read and render ONE column of a composition: its route's
 * source file through the injected highlighter +
 * base-aware {@link href} resolver. The route is unbased
 * first, because a column the browser named came from an
 * `href`-resolved link (always base-prefixed) while the
 * router's routes never are.
 */
const renderColumn =
  (
    contentDir: SoftStr,
    config: SiteConfig,
    base: SoftStr,
    parts: readonly Part[],
  ) =>
  (
    column: Column,
  ): PromisedResult<RenderedColumn, HttpError> =>
    readSource(
      candidateFiles(
        contentDir,
        unbase(base)(column.route),
      ),
    ).then(
      chainResult(
        (
          source: SoftStr,
        ): Result<RenderedColumn, HttpError> => {
          const used = new Set<Part>();
          return pipe(
            renderMarkdownWithOptions(
              pressRenderOptions(
                config,
                asHighlighter(),
                // a page's relative links are written
                // from its own place, not from wherever
                // its column happens to be shown
                hrefFrom(
                  base,
                  linkPlace(
                    contentDir,
                    unbase(base)(column.route),
                  ),
                ),
                parts,
                (message) =>
                  console.warn(
                    column.route + ": " + message,
                  ),
                used,
              ),
            )(source),
            mapErr(
              (e: InvalidError): HttpError =>
                internalError(e.content.message),
            ),
            mapResult(
              (
                doc: MarkdownDoc,
              ): RenderedColumn => ({
                route: column.route,
                span: column.span,
                body: markedBody(
                  doc.body,
                  column.span,
                ),
                doc,
                parts: [...used],
              }),
            ),
          );
        },
      ),
    );

/**
 * The columns to the head's right that actually rendered.
 * A composition URL is untrusted input — typed by hand,
 * truncated by a chat client, or naming a page that has
 * since been deleted — so a column that cannot be read is
 * DROPPED from the strip rather than turned into an error
 * page. The head keeps the ordinary 404/500 behaviour: the
 * URL's own path is a page, and a missing page is a 404.
 */
const rendered = (
  results: ReadonlyArray<
    Result<RenderedColumn, HttpError>
  >,
): ReadonlyArray<RenderedColumn> =>
  results.reduce<ReadonlyArray<RenderedColumn>>(
    (
      acc: ReadonlyArray<RenderedColumn>,
      result: Result<RenderedColumn, HttpError>,
    ): ReadonlyArray<RenderedColumn> =>
      pipe(
        toOption(result),
        matchOption(
          (): ReadonlyArray<RenderedColumn> =>
            acc,
          (
            column: RenderedColumn,
          ): ReadonlyArray<RenderedColumn> => [
            ...acc,
            column,
          ],
        ),
      ),
    [],
  );

/**
 * The shared route handler: decode the COMPOSITION the URL
 * carries (its own path is the head column; `c` and `q`
 * decorate it), render every column, wrap via the theme,
 * and answer an `htmlResponse`. A parse failure in the head
 * folds to a typed {@link HttpError} (`internalError`) so
 * the SSG crawl short-circuits loudly. Reads everything
 * from the {@link Context}, so the same handler serves
 * every registered route — and no route is added for the
 * composition, which is a decoration of the pages that
 * already exist.
 */
/** A route with no slash at its end, so `/a` and `/a/`
 * are one page. */
const bareRoute = (route: SoftStr): SoftStr =>
  route.length > 1
    ? route.replace(/\/+$/, "")
    : route;

const pageHandler =
  (
    contentDir: SoftStr,
    config: SiteConfig,
    base: SoftStr,
    parts: readonly Part[],
    url: (part: Part) => string,
    known: ReadonlySet<SoftStr>,
  ): Handler =>
  (
    c: Context,
  ): PromisedResult<HttpResponse, HttpError> =>
    pipe(
      decodeComposition(
        c.req.path,
        pipe(c, query(restParam)),
        pipe(c, query(spanParam)),
      ),
      (
        composition: Composition,
      ): PromisedResult<
        HttpResponse,
        HttpError
      > =>
        Promise.all([
          renderColumn(
            contentDir,
            config,
            base,
            parts,
          )(composition.head),
          Promise.all(
            // a column to the right is a page of this site
            // or it is nothing: a route the site did not
            // register never becomes a file name
            composition.rest
              .filter((column: Column) =>
                known.has(
                  bareRoute(column.route),
                ),
              )
              .slice(0, 12)
              .map(
                renderColumn(
                  contentDir,
                  config,
                  base,
                  parts,
                ),
              ),
          ).then(rendered),
        ]).then(
          ([head, rest]: readonly [
            Result<RenderedColumn, HttpError>,
            ReadonlyArray<RenderedColumn>,
          ]): Result<HttpResponse, HttpError> =>
            pipe(
              head,
              mapResult(
                (
                  column: RenderedColumn,
                ): HttpResponse =>
                  htmlResponse(
                    injectNavigationScript(
                      injectAppearanceScripts(
                        islandPage(
                          renderToString(
                            pageView(
                              config,
                              base,
                              column,
                              rest,
                              c.req.path,
                            ),
                          ),
                          [
                            ...column.parts,
                            ...rest.flatMap(
                              (c) => c.parts,
                            ),
                          ],
                          url,
                        ),
                      ),
                    ),
                  ),
              ),
            ),
        ),
    );

/**
 * The internal content router: the framework's
 * {@link buildRouter} assembly — ONE GET route per
 * `discoverPaths` result, every route bound to the shared
 * {@link pageHandler} (the press content→render→layout
 * specifics). Feeding the same `paths` to
 * `generateStatic` renders exactly the routes registered
 * here — the crawl can never 404. Pure data; no
 * filesystem touch until a handler runs (acceptable
 * `node:fs` in the build tool, never in the pure Ssg
 * core).
 */
export const pressRouter = (
  contentDir: SoftStr,
  config: SiteConfig,
  base: SoftStr,
  paths: readonly string[],
  parts: readonly Part[] = builtins,
  emit?: (part: Part) => string,
): Web => {
  const router = (url: (part: Part) => string) =>
    buildRouter(
      paths,
      pageHandler(
        contentDir,
        config,
        base,
        parts,
        url,
        new Set(paths.map(bareRoute)),
      ),
    );
  if (emit) return router(emit);
  const assets = new Map(
    parts.map((part) => [
      part,
      islandAsset(part),
    ]),
  );
  const url = (part: Part) =>
    href(base)(
      "/" +
        (assets.get(part) ?? islandAsset(part))
          .file,
    );
  return Array.from(assets).reduce(
    (app, [part, asset]) =>
      get(url(part), () =>
        Promise.resolve(
          ok(
            javascriptResponse(
              asset.bytes.toString("utf8"),
            ),
          ),
        ),
      )(app),
    router(url),
  );
};

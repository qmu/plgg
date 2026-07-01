import { readFile } from "node:fs/promises";
import {
  type SoftStr,
  type Result,
  type PromisedResult,
  type Defect,
  type InvalidError,
  ok,
  err,
  isOk,
  pipe,
  defect,
  mapErr,
  mapResult,
  chainResult,
} from "plgg";
import {
  type MarkdownDoc,
  renderMarkdownWith,
  plainHighlighter,
} from "plgg-md";
import { href } from "plgg-press/Href/usecase/href";
import { candidateFiles } from "plgg-press/router/pressRouter";
import {
  type PageLinks,
  pageLinks,
} from "plgg-press/CheckLinks/model/CheckLinks";

/**
 * Reads the first candidate source file that exists, in
 * order. A `discoverPaths`-found route always has a backing
 * file, so a total miss is genuinely unexpected — it folds
 * to a {@link Defect}, never an escaped throw.
 */
const readFirst =
  (route: SoftStr) =>
  (
    files: ReadonlyArray<SoftStr>,
  ): PromisedResult<SoftStr, Defect> =>
    files.reduce(
      (
        acc: PromisedResult<SoftStr, Defect>,
        file: SoftStr,
      ): PromisedResult<SoftStr, Defect> =>
        acc.then(
          (
            soFar: Result<SoftStr, Defect>,
          ): PromisedResult<SoftStr, Defect> =>
            isOk(soFar)
              ? Promise.resolve(soFar)
              : readFile(file, "utf8").then(
                  (
                    source: SoftStr,
                  ): Result<SoftStr, Defect> =>
                    ok(source),
                  (): Result<SoftStr, Defect> =>
                    soFar,
                ),
        ),
      Promise.resolve(
        err<Defect>(
          defect(
            `no readable source for route ${route}`,
          ),
        ),
      ),
    );

/**
 * Collects one page's {@link PageLinks}: read its source,
 * render through the SAME base-aware {@link href} resolver
 * the router uses (so `links` are base-prefixed exactly as
 * emitted) under the compiler-free {@link plainHighlighter}
 * (highlighting is irrelevant to links/slugs), and project
 * out the route, deduped heading `slugs`, and emitted
 * `links`. A parse miss folds to a {@link Defect}.
 */
const collectOne =
  (contentDir: SoftStr, base: SoftStr) =>
  (
    route: SoftStr,
  ): PromisedResult<PageLinks, Defect> =>
    readFirst(route)(
      candidateFiles(contentDir, route),
    ).then(
      chainResult(
        (
          source: SoftStr,
        ): Result<PageLinks, Defect> =>
          pipe(
            renderMarkdownWith(
              plainHighlighter,
              href(base),
            )(source),
            mapErr(
              (e: InvalidError): Defect =>
                defect(e.content.message),
            ),
            mapResult(
              (doc: MarkdownDoc): PageLinks =>
                pageLinks(
                  route,
                  doc.slugs,
                  doc.links,
                ),
            ),
          ),
      ),
    );

/**
 * The build-time crawl that surfaces the per-page link
 * surface `checkLinks` consumes: render every discovered
 * route's Markdown and collect its {@link PageLinks},
 * short-circuiting to the first failure. This is the ONLY
 * dead-link step that touches `node:fs`; the checker itself
 * stays pure over the array this yields. Data-last in
 * `paths`.
 */
export const collectPageLinks =
  (contentDir: SoftStr, base: SoftStr) =>
  (
    paths: ReadonlyArray<SoftStr>,
  ): PromisedResult<
    ReadonlyArray<PageLinks>,
    Defect
  > =>
    paths.reduce(
      (
        acc: PromisedResult<
          ReadonlyArray<PageLinks>,
          Defect
        >,
        route: SoftStr,
      ): PromisedResult<
        ReadonlyArray<PageLinks>,
        Defect
      > =>
        acc.then(
          (
            soFar: Result<
              ReadonlyArray<PageLinks>,
              Defect
            >,
          ): PromisedResult<
            ReadonlyArray<PageLinks>,
            Defect
          > =>
            isOk(soFar)
              ? collectOne(contentDir, base)(
                  route,
                ).then(
                  mapResult(
                    (
                      page: PageLinks,
                    ): ReadonlyArray<PageLinks> => [
                      ...soFar.content,
                      page,
                    ],
                  ),
                )
              : Promise.resolve(soFar),
        ),
      Promise.resolve(
        ok<ReadonlyArray<PageLinks>>([]),
      ),
    );

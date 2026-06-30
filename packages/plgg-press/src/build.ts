import {
  type SoftStr,
  type Result,
  type PromisedResult,
  type Defect,
  ok,
  isOk,
  pipe,
  proc,
  mapResult,
} from "plgg";
import { renderToString } from "plgg-view";
import {
  type SsgError,
  generateStatic,
  discoverPaths,
  copyAssets,
  write404,
} from "plgg-server/ssg";
import {
  type PressOptions,
  type BuildReport,
} from "plgg-press/Press/model/PressOptions";
import { pressRouter } from "plgg-press/router/pressRouter";
import { notFound } from "plgg-press/theme/notFound";
import { injectThemeScripts } from "plgg-press/theme/themeScript";
import {
  type PageLinks,
  type BrokenLinks,
} from "plgg-press/CheckLinks/model/CheckLinks";
import { collectPageLinks } from "plgg-press/CheckLinks/usecase/collectPageLinks";
import { checkLinks } from "plgg-press/CheckLinks/usecase/checkLinks";

/**
 * Build the static site from a content corpus into
 * `opts.outDir`, as one typed transform pipeline that
 * never throws:
 *
 * 1. {@link discoverPaths} crawls the corpus for `*.md`
 *    route paths;
 * 1b. {@link collectPageLinks} + {@link checkLinks}
 *    validate every internal link and `#anchor` against
 *    the discovered routes and emitted heading slugs — a
 *    broken link fails the build (a {@link BrokenLinks})
 *    BEFORE anything is written;
 * 2. {@link generateStatic} renders every path through the
 *    internal {@link pressRouter} (Markdown → highlight →
 *    theme) and writes each to `outDir/<path>/index.html`,
 *    short-circuiting on the first render failure;
 * 3. {@link copyAssets} mirrors `assetsDir` verbatim;
 * 4. {@link write404} persists the theme `notFound` view as
 *    `outDir/404.html`.
 *
 * `opts.base` is threaded into the theme + injected `href`
 * resolver so the deploy base is applied in exactly one
 * place. The error channel folds to `SsgError | Defect` at
 * the edge — a render miss, a non-2xx page, an unsafe
 * write, or an unexpected throw all surface as data.
 */
export const build = (
  opts: PressOptions,
): PromisedResult<
  BuildReport,
  SsgError | Defect | BrokenLinks
> =>
  proc(
    discoverPaths(opts.contentDir),
    (
      paths: ReadonlyArray<SoftStr>,
    ): PromisedResult<
      ReadonlyArray<SoftStr>,
      Defect | BrokenLinks
    > =>
      collectPageLinks(
        opts.contentDir,
        opts.base,
      )(paths).then(
        (
          collected: Result<
            ReadonlyArray<PageLinks>,
            Defect
          >,
        ): Result<
          ReadonlyArray<SoftStr>,
          Defect | BrokenLinks
        > =>
          isOk(collected)
            ? pipe(
                checkLinks(opts.base)(
                  collected.content,
                ),
                mapResult(
                  (): ReadonlyArray<SoftStr> =>
                    paths,
                ),
              )
            : collected,
      ),
    (
      paths: ReadonlyArray<SoftStr>,
    ): PromisedResult<
      ReadonlyArray<SoftStr>,
      SsgError | Defect
    > =>
      generateStatic(
        pressRouter(
          opts.contentDir,
          opts.config,
          opts.base,
          paths,
        ),
      )({
        paths,
        outDir: opts.outDir,
      }),
    (
      pages: ReadonlyArray<SoftStr>,
    ): PromisedResult<
      ReadonlyArray<SoftStr>,
      SsgError
    > =>
      copyAssets(opts.assetsDir)(
        opts.outDir,
      ).then(
        mapResult(
          (
            assets: ReadonlyArray<SoftStr>,
          ): ReadonlyArray<SoftStr> => [
            ...pages,
            ...assets,
          ],
        ),
      ),
    (
      files: ReadonlyArray<SoftStr>,
    ): PromisedResult<
      ReadonlyArray<SoftStr>,
      SsgError
    > =>
      write404(opts.outDir)(
        injectThemeScripts(
          renderToString(notFound(opts.config)),
        ),
      ).then(
        mapResult(
          (
            file: SoftStr,
          ): ReadonlyArray<SoftStr> => [
            ...files,
            file,
          ],
        ),
      ),
    (
      files: ReadonlyArray<SoftStr>,
    ): Result<BuildReport, never> =>
      ok<BuildReport>({
        outDir: opts.outDir,
        pages: files,
      }),
  );

import {
  type SoftStr,
  type Result,
  type PromisedResult,
  type Defect,
  type Option,
  ok,
  proc,
  mapResult,
  matchOption,
} from "plgg";
import { type Web } from "plgg-server";
import {
  type SsgError,
  generateStatic,
  discoverPaths,
  copyAssets,
  write404,
} from "plgg-server/ssg";
import {
  type AppOptions,
  type BuildReport,
} from "plggpress/framework/App/model/AppOptions";

/**
 * The app-supplied pieces a static build needs from its
 * consumer:
 *
 * - `router` — a factory turning the discovered route set
 *   into a plgg-server {@link Web} app (the app's
 *   content→render→layout specifics, assembled via
 *   {@link buildRouter}).
 * - `notFoundHtml` — the already-rendered 404 body written
 *   as `outDir/404.html` (the framework never renders — the
 *   app owns its theme).
 * - `linkCheck` — an OPTIONAL policy run after discovery
 *   and BEFORE anything is written, so a broken link fails
 *   the build as data; `none()` skips it.
 */
export type BuildSpec<E> = Readonly<{
  router: (
    paths: ReadonlyArray<SoftStr>,
  ) => Web;
  notFoundHtml: SoftStr;
  linkCheck: Option<
    (
      paths: ReadonlyArray<SoftStr>,
    ) => PromisedResult<unknown, E>
  >;
}>;

/**
 * Build the static site from a content corpus into
 * `opts.outDir`, as one typed transform pipeline that
 * never throws:
 *
 * 1. {@link discoverPaths} crawls the corpus for route
 *    paths;
 * 1b. the optional `spec.linkCheck` validates the routes
 *    BEFORE anything is written — an `Err` (an app-typed
 *    `E`) fails the build;
 * 2. {@link generateStatic} renders every path through the
 *    app's `spec.router` and writes each to
 *    `outDir/<path>/index.html`;
 * 3. {@link copyAssets} mirrors `assetsDir` verbatim;
 * 4. {@link write404} persists `spec.notFoundHtml` as
 *    `outDir/404.html`.
 *
 * The framework owns the orchestration; the app supplies
 * the router factory, the 404 body, and any link-check
 * policy. The error channel folds to
 * `SsgError | Defect | E` at the edge.
 */
export const build = <E>(
  opts: AppOptions,
  spec: BuildSpec<E>,
): PromisedResult<
  BuildReport,
  SsgError | Defect | E
> =>
  proc(
    discoverPaths(opts.contentDir),
    (
      paths: ReadonlyArray<SoftStr>,
    ): PromisedResult<
      ReadonlyArray<SoftStr>,
      E
    > =>
      matchOption(
        (): PromisedResult<
          ReadonlyArray<SoftStr>,
          E
        > => Promise.resolve(ok(paths)),
        (
          check: (
            paths: ReadonlyArray<SoftStr>,
          ) => PromisedResult<unknown, E>,
        ): PromisedResult<
          ReadonlyArray<SoftStr>,
          E
        > =>
          check(paths).then(
            mapResult(
              (): ReadonlyArray<SoftStr> => paths,
            ),
          ),
      )(spec.linkCheck),
    (
      paths: ReadonlyArray<SoftStr>,
    ): PromisedResult<
      ReadonlyArray<SoftStr>,
      SsgError | Defect
    > =>
      generateStatic(spec.router(paths))({
        paths,
        outDir: opts.outDir,
      }),
    (
      pages: ReadonlyArray<SoftStr>,
    ): PromisedResult<
      ReadonlyArray<SoftStr>,
      SsgError | Defect
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
        spec.notFoundHtml,
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

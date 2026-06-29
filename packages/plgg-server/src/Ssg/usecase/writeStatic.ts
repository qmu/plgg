import {
  mkdir,
  writeFile,
  readdir,
  copyFile,
} from "node:fs/promises";
import type { Dirent } from "node:fs";
import {
  dirname,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import {
  SoftStr,
  Result,
  PromisedResult,
  ok,
  err,
  isOk,
  tryCatch,
} from "plgg";
import { splitPath } from "plgg-server/index";
import {
  SsgPage,
  SsgError,
  writeFailed,
} from "plgg-server/Ssg/model/Ssg";

/**
 * The node:fs / node:path seam — the ONLY file in the SSG feature touching the
 * filesystem; the render core under `Ssg/usecase/renderRoutes` stays pure and
 * runtime-neutral. Mirrors how `serve.ts` confines `node:http`. Surfaced solely
 * through the node entry `src/ssgEntry.ts`, never the runtime-neutral barrel.
 */

/**
 * Directories the {@link discoverPaths} crawl never descends into.
 */
const EXCLUDED_DIRS: ReadonlyArray<SoftStr> =
  ["node_modules", "scripts", "dist"];

/**
 * Path-traversal guard returned as a value: reject `.`/`..`/separator-bearing
 * segments and assert the resolved `target` stays under `resolve(outDir)`.
 * Shared by the page writer and the asset copier.
 */
const guardTarget =
  (outDir: SoftStr) =>
  (path: SoftStr) =>
  (
    target: SoftStr,
  ): Result<SoftStr, SsgError> => {
    const unsafe = splitPath(path).some(
      (s: SoftStr): boolean =>
        s === "." ||
        s === ".." ||
        s.includes(sep) ||
        s.includes("/"),
    );
    const root = resolve(outDir);
    const resolved = resolve(target);
    return unsafe
      ? err(
          writeFailed(
            path,
            "unsafe path segment",
          ),
        )
      : resolved === root ||
          resolved.startsWith(root + sep)
        ? ok(target)
        : err(
            writeFailed(
              path,
              "path escapes outDir",
            ),
          );
  };

/**
 * Directory-index target under `outDir` (`/about` -> `outDir/about/index.html`),
 * guarded by {@link guardTarget}.
 */
const safeTarget =
  (outDir: SoftStr) =>
  (
    path: SoftStr,
  ): Result<SoftStr, SsgError> =>
    guardTarget(outDir)(path)(
      join(
        outDir,
        ...splitPath(path),
        "index.html",
      ),
    );

/**
 * Sequentially runs `step` over `items`, short-circuiting to the first
 * {@link SsgError} and collecting the ok file paths. The accumulator is itself
 * a `PromisedResult`, so a single failure makes the whole array `err`. Shared
 * fold behind {@link writeStatic} and {@link copyAssets}.
 */
const collectSeq =
  <A>(
    step: (
      a: A,
    ) => PromisedResult<SoftStr, SsgError>,
  ) =>
  (
    items: ReadonlyArray<A>,
  ): PromisedResult<
    ReadonlyArray<SoftStr>,
    SsgError
  > =>
    items.reduce(
      (
        acc: PromisedResult<
          ReadonlyArray<SoftStr>,
          SsgError
        >,
        item: A,
      ): PromisedResult<
        ReadonlyArray<SoftStr>,
        SsgError
      > =>
        acc.then(
          (
            soFar: Result<
              ReadonlyArray<SoftStr>,
              SsgError
            >,
          ): PromisedResult<
            ReadonlyArray<SoftStr>,
            SsgError
          > =>
            isOk(soFar)
              ? step(item).then(
                  (
                    one: Result<
                      SoftStr,
                      SsgError
                    >,
                  ): Result<
                    ReadonlyArray<SoftStr>,
                    SsgError
                  > =>
                    isOk(one)
                      ? ok([
                          ...soFar.content,
                          one.content,
                        ])
                      : one,
                )
              : Promise.resolve(soFar),
        ),
      Promise.resolve(
        ok<ReadonlyArray<SoftStr>>([]),
      ),
    );

/**
 * Writes one page's HTML to its directory-index target: guard → `mkdir -p` →
 * `writeFile`, each fs call lifted into an `SsgError`-typed `Result` (no throw
 * escapes the seam).
 */
const writePage =
  (outDir: SoftStr) =>
  (
    page: SsgPage,
  ): PromisedResult<SoftStr, SsgError> => {
    const guard = safeTarget(outDir)(page.path);
    return isOk(guard)
      ? tryCatch(
          (file: SoftStr): Promise<SoftStr> =>
            mkdir(dirname(file), {
              recursive: true,
            })
              .then(() =>
                writeFile(
                  file,
                  page.html,
                  "utf8",
                ),
              )
              .then((): SoftStr => file),
          (error: unknown): SsgError =>
            writeFailed(
              page.path,
              String(error),
            ),
        )(guard.content)
      : Promise.resolve(guard);
  };

/**
 * Writes every rendered page under `outDir`, short-circuiting to the first
 * {@link SsgError}; yields the written file paths. Data-last in `pages` so it
 * ends a render pipeline.
 */
export const writeStatic =
  (outDir: SoftStr) =>
  (
    pages: ReadonlyArray<SsgPage>,
  ): PromisedResult<
    ReadonlyArray<SoftStr>,
    SsgError
  > =>
    collectSeq(writePage(outDir))(pages);

/**
 * Route segments for a discovered `*.md` relative path: drop the `.md`
 * extension off the basename, then drop a trailing `index` so the directory
 * itself becomes the route.
 */
const routeSegments = (
  rel: SoftStr,
): ReadonlyArray<SoftStr> =>
  rel
    .split(sep)
    .map(
      (
        s: SoftStr,
        i: number,
        arr: ReadonlyArray<SoftStr>,
      ): SoftStr =>
        i === arr.length - 1
          ? s.slice(0, -3)
          : s,
    )
    .filter(
      (
        s: SoftStr,
        i: number,
        arr: ReadonlyArray<SoftStr>,
      ): boolean =>
        !(
          i === arr.length - 1 &&
          s === "index"
        ),
    );

/**
 * Folds route segments into a route path: empty -> `/` (a directory root),
 * otherwise a slash-wrapped path (`["foo"]` -> `/foo/`).
 */
const fromSegments = (
  segs: ReadonlyArray<SoftStr>,
): SoftStr =>
  segs.length === 0
    ? "/"
    : "/" + segs.join("/") + "/";

/**
 * Maps a content-relative `*.md` path to its route path (`index.md` -> the
 * directory root, `foo.md` -> `/foo/`, `guide/intro.md` -> `/guide/intro/`).
 */
const toRoutePath = (rel: SoftStr): SoftStr =>
  fromSegments(routeSegments(rel));

/**
 * Recursively walks `rootDir` and returns the route paths of every `*.md`
 * file (skipping {@link EXCLUDED_DIRS}). fs errors (e.g. a missing `rootDir`)
 * are lifted into a `writeFailed`-style {@link SsgError}. Feeds `renderRoutes`.
 */
export const discoverPaths = (
  rootDir: SoftStr,
): PromisedResult<
  ReadonlyArray<SoftStr>,
  SsgError
> =>
  tryCatch(
    (
      dir: SoftStr,
    ): Promise<ReadonlyArray<SoftStr>> =>
      readdir(dir, {
        recursive: true,
      }).then(
        (
          entries: ReadonlyArray<SoftStr>,
        ): ReadonlyArray<SoftStr> =>
          entries
            .filter((e: SoftStr): boolean =>
              e.endsWith(".md"),
            )
            .filter(
              (e: SoftStr): boolean =>
                !e
                  .split(sep)
                  .some(
                    (s: SoftStr): boolean =>
                      EXCLUDED_DIRS.includes(s),
                  ),
            )
            .map(toRoutePath),
      ),
    (error: unknown): SsgError =>
      writeFailed(rootDir, String(error)),
  )(rootDir);

/**
 * `ENOENT` value-check — narrows `unknown` with `in`, never a cast — so a
 * missing assets dir folds into a no-op rather than a build failure.
 */
const isEnoent = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "ENOENT";

/**
 * Lists the files under `srcDir` (recursive), treating a missing `srcDir` as
 * an empty no-op and any other fs error as a typed {@link SsgError}.
 */
const listAssetFiles = (
  srcDir: SoftStr,
): PromisedResult<
  ReadonlyArray<Dirent>,
  SsgError
> =>
  readdir(srcDir, {
    recursive: true,
    withFileTypes: true,
  }).then(
    (
      entries: ReadonlyArray<Dirent>,
    ): Result<
      ReadonlyArray<Dirent>,
      SsgError
    > =>
      ok(
        entries.filter(
          (e: Dirent): boolean => e.isFile(),
        ),
      ),
    (
      error: unknown,
    ): Result<
      ReadonlyArray<Dirent>,
      SsgError
    > =>
      isEnoent(error)
        ? ok<ReadonlyArray<Dirent>>([])
        : err(
            writeFailed(
              srcDir,
              String(error),
            ),
          ),
  );

/**
 * Copies one asset file into `outDir`, mirroring its `srcDir`-relative path:
 * guard → `mkdir -p` → `copyFile`, each fs call lifted into an `SsgError`.
 */
const copyOne =
  (srcDir: SoftStr) =>
  (outDir: SoftStr) =>
  (
    entry: Dirent,
  ): PromisedResult<SoftStr, SsgError> => {
    const srcFull = join(
      entry.parentPath,
      entry.name,
    );
    const rel = relative(srcDir, srcFull);
    const guard = guardTarget(outDir)(rel)(
      join(outDir, ...splitPath(rel)),
    );
    return isOk(guard)
      ? tryCatch(
          (file: SoftStr): Promise<SoftStr> =>
            mkdir(dirname(file), {
              recursive: true,
            })
              .then(() =>
                copyFile(srcFull, file),
              )
              .then((): SoftStr => file),
          (error: unknown): SsgError =>
            writeFailed(rel, String(error)),
        )(guard.content)
      : Promise.resolve(guard);
  };

/**
 * Recursively mirrors every file under `srcDir` into `outDir`, reusing the
 * traversal guard; a missing `srcDir` is an empty no-op. Yields the written
 * file paths. Data-last in `outDir`.
 */
export const copyAssets =
  (srcDir: SoftStr) =>
  (
    outDir: SoftStr,
  ): PromisedResult<
    ReadonlyArray<SoftStr>,
    SsgError
  > =>
    listAssetFiles(srcDir).then(
      (
        listed: Result<
          ReadonlyArray<Dirent>,
          SsgError
        >,
      ): PromisedResult<
        ReadonlyArray<SoftStr>,
        SsgError
      > =>
        isOk(listed)
          ? collectSeq(
              copyOne(srcDir)(outDir),
            )(listed.content)
          : Promise.resolve(listed),
    );

/**
 * Writes `outDir/404.html` (the HTML is rendered by the theme shell and passed
 * in) so GitHub Pages serves a not-found page for unknown deep paths. Yields
 * the written file path.
 */
export const write404 =
  (outDir: SoftStr) =>
  (
    html: SoftStr,
  ): PromisedResult<SoftStr, SsgError> =>
    tryCatch(
      (dir: SoftStr): Promise<SoftStr> =>
        mkdir(dir, { recursive: true })
          .then(() =>
            writeFile(
              join(dir, "404.html"),
              html,
              "utf8",
            ),
          )
          .then(
            (): SoftStr =>
              join(dir, "404.html"),
          ),
      (error: unknown): SsgError =>
        writeFailed(
          "/404.html",
          String(error),
        ),
    )(outDir);

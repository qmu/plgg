import {
  mkdir,
  writeFile,
} from "node:fs/promises";
import {
  dirname,
  join,
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
 * runtime-neutral. Mirrors how `serve.ts` confines `node:http`.
 */

/**
 * Directory-index target under `outDir`, with a path-traversal guard returned
 * as a value: reject `.`/`..`/separator-bearing segments and assert the
 * resolved file stays under `resolve(outDir)`.
 */
const safeTarget =
  (outDir: SoftStr) =>
  (
    path: SoftStr,
  ): Result<SoftStr, SsgError> => {
    const segments = splitPath(path);
    const unsafe = segments.some(
      (s: SoftStr): boolean =>
        s === "." ||
        s === ".." ||
        s.includes(sep) ||
        s.includes("/"),
    );
    const target = join(
      outDir,
      ...segments,
      "index.html",
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
    pages.reduce(
      (
        acc: PromisedResult<
          ReadonlyArray<SoftStr>,
          SsgError
        >,
        page: SsgPage,
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
              ? writePage(outDir)(page).then(
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

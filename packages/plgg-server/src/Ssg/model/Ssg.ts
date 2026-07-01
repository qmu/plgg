import { Box, SoftStr, box, pattern } from "plgg";
import {
  HttpStatus,
  HttpError,
} from "plgg-server/index";

/**
 * One rendered page: the crawl path it came from and the HTML the handler
 * produced. Pure data, consumed by the fs seam — no `node:fs` involved.
 */
export type SsgPage = Readonly<{
  path: SoftStr;
  html: SoftStr;
}>;

/**
 * Constructs an {@link SsgPage}.
 */
export const ssgPage = (
  path: SoftStr,
  html: SoftStr,
): SsgPage => ({ path, html });

/**
 * Static-generation failures as values — a tagged `Box` union (the same data
 * idiom as `HttpError`), folding through `match` by tag. The four variants map
 * onto the strict failure modes of a crawl-and-write build.
 */
export type SsgError =
  | Box<
      "RenderFailed",
      { path: SoftStr; error: HttpError }
    >
  | Box<
      "NonOkStatus",
      { path: SoftStr; status: HttpStatus }
    >
  | Box<"NonHtmlBody", { path: SoftStr }>
  | Box<
      "WriteFailed",
      { path: SoftStr; message: SoftStr }
    >;

/** `handle` returned an {@link HttpError} for the path. */
export const renderFailed = (
  path: SoftStr,
  error: HttpError,
): SsgError =>
  box("RenderFailed")({ path, error });

/** The handler answered a non-2xx status. */
export const nonOkStatus = (
  path: SoftStr,
  status: HttpStatus,
): SsgError =>
  box("NonOkStatus")({ path, status });

/** The body was a `Bytes`/`Stream` arm, not HTML. */
export const nonHtmlBody = (
  path: SoftStr,
): SsgError => box("NonHtmlBody")({ path });

/** A node:fs write or the traversal guard rejected. */
export const writeFailed = (
  path: SoftStr,
  message: SoftStr,
): SsgError =>
  box("WriteFailed")({ path, message });

export const renderFailed$ = () =>
  pattern("RenderFailed")();
export const nonOkStatus$ = () =>
  pattern("NonOkStatus")();
export const nonHtmlBody$ = () =>
  pattern("NonHtmlBody")();
export const writeFailed$ = () =>
  pattern("WriteFailed")();

/**
 * A static build: the explicit paths to render (no auto-discovery in v1) and
 * the output directory.
 */
export type SsgConfig = Readonly<{
  paths: ReadonlyArray<SoftStr>;
  outDir: SoftStr;
}>;

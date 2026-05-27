import { Box, SoftStr, box, pattern } from "plgg";
import {
  Method,
  HttpStatus,
  HttpResponse,
  textResponse,
} from "plgg-http-router/index";

/**
 * Routing/handling failures as values, modeled as a plgg `Box` union so they
 * can be carried through `Result` and folded into a response at the seam. Each
 * variant's `content` is a structured object payload (not a bare string), so the
 * vocabulary composes with the rest of the `Box`-wrapped error model.
 */
export type HttpError =
  | Box<"NotFound", { path: SoftStr }>
  | Box<
      "MethodNotAllowed",
      { allowed: ReadonlyArray<Method> }
    >
  | Box<"BadRequest", { message: SoftStr }>
  | Box<"Unsupported", { message: SoftStr }>
  | Box<"Unauthorized", { message: SoftStr }>
  | Box<"Forbidden", { message: SoftStr }>
  | Box<
      "StatusError",
      { status: HttpStatus; message: SoftStr }
    >
  | Box<"InternalError", { message: SoftStr }>;

/**
 * No route matched the request path.
 */
export const notFound = (
  path: SoftStr,
): HttpError => box("NotFound")({ path });

/**
 * The path matched but no route accepts the request method.
 */
export const methodNotAllowed = (
  allowed: ReadonlyArray<Method>,
): HttpError =>
  box("MethodNotAllowed")({ allowed });

/**
 * The request was malformed.
 */
export const badRequest = (
  message: SoftStr,
): HttpError => box("BadRequest")({ message });

/**
 * The request method is not supported by this server.
 */
export const unsupported = (
  message: SoftStr,
): HttpError => box("Unsupported")({ message });

/**
 * The request lacks valid authentication credentials (401). Distinct from
 * {@link forbidden}: the client is unauthenticated, not merely under-privileged.
 */
export const unauthorized = (
  message: SoftStr,
): HttpError => box("Unauthorized")({ message });

/**
 * The client is authenticated but not permitted to access the resource (403).
 */
export const forbidden = (
  message: SoftStr,
): HttpError => box("Forbidden")({ message });

/**
 * A failure at an arbitrary status code, for cases the explicit variants do
 * not cover. The carried {@link HttpStatus} keeps the code in valid range.
 */
export const statusError = (
  status: HttpStatus,
  message: SoftStr,
): HttpError =>
  box("StatusError")({ status, message });

/**
 * An unexpected failure occurred while handling the request.
 */
export const internalError = (
  message: SoftStr,
): HttpError => box("InternalError")({ message });

/*
 * Pattern matchers for folding an {@link HttpError} with `match`, so call sites
 * reference the variant by name (`match(e)([notFound$(), …])`) rather than a
 * bare tag string. Each mirrors its constructor above.
 */
export const notFound$ = () =>
  pattern("NotFound")();
export const methodNotAllowed$ = () =>
  pattern("MethodNotAllowed")();
export const badRequest$ = () =>
  pattern("BadRequest")();
export const unsupported$ = () =>
  pattern("Unsupported")();
export const unauthorized$ = () =>
  pattern("Unauthorized")();
export const forbidden$ = () =>
  pattern("Forbidden")();
export const statusError$ = () =>
  pattern("StatusError")();
export const internalError$ = () =>
  pattern("InternalError")();

/**
 * De-duplicates while preserving first-seen order.
 */
const unique = (
  xs: ReadonlyArray<Method>,
): ReadonlyArray<Method> =>
  xs.filter((x, i) => xs.indexOf(x) === i);

/**
 * Folds an {@link HttpError} into the {@link HttpResponse} it represents.
 */
export const httpErrorToResponse = (
  error: HttpError,
): HttpResponse =>
  error.__tag === "NotFound"
    ? textResponse("Not Found", 404)
    : error.__tag === "MethodNotAllowed"
      ? textResponse("Method Not Allowed", 405, {
          allow: unique(
            error.content.allowed,
          ).join(", "),
        })
      : error.__tag === "BadRequest"
        ? textResponse(error.content.message, 400)
        : error.__tag === "Unsupported"
          ? textResponse(error.content.message, 501)
          : error.__tag === "Unauthorized"
            ? textResponse(error.content.message, 401)
            : error.__tag === "Forbidden"
              ? textResponse(
                  error.content.message,
                  403,
                )
              : error.__tag === "StatusError"
                ? textResponse(
                    error.content.message,
                    error.content.status.content,
                  )
                : textResponse(
                    "Internal Server Error",
                    500,
                  );

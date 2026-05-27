import { Box, SoftStr, box } from "plgg";
import {
  Method,
  HttpStatus,
  HttpResponse,
  textResponse,
} from "plgg-http-router/index";

/**
 * Routing/handling failures as values, modeled as a plgg `Box` union so they
 * can be carried through `Result` and folded into a response at the seam.
 */
export type HttpError =
  | Box<"NotFound", SoftStr>
  | Box<"MethodNotAllowed", ReadonlyArray<Method>>
  | Box<"BadRequest", SoftStr>
  | Box<"Unsupported", SoftStr>
  | Box<"Unauthorized", SoftStr>
  | Box<"Forbidden", SoftStr>
  | Box<"StatusError", { status: HttpStatus; message: SoftStr }>
  | Box<"InternalError", SoftStr>;

/**
 * No route matched the request path.
 */
export const notFound = (
  path: SoftStr,
): HttpError => box("NotFound")(path);

/**
 * The path matched but no route accepts the request method.
 */
export const methodNotAllowed = (
  allowed: ReadonlyArray<Method>,
): HttpError => box("MethodNotAllowed")(allowed);

/**
 * The request was malformed.
 */
export const badRequest = (
  message: SoftStr,
): HttpError => box("BadRequest")(message);

/**
 * The request method is not supported by this server.
 */
export const unsupported = (
  message: SoftStr,
): HttpError => box("Unsupported")(message);

/**
 * The request lacks valid authentication credentials (401). Distinct from
 * {@link forbidden}: the client is unauthenticated, not merely under-privileged.
 */
export const unauthorized = (
  message: SoftStr,
): HttpError => box("Unauthorized")(message);

/**
 * The client is authenticated but not permitted to access the resource (403).
 */
export const forbidden = (
  message: SoftStr,
): HttpError => box("Forbidden")(message);

/**
 * A failure at an arbitrary status code, for cases the explicit variants do
 * not cover. The carried {@link HttpStatus} keeps the code in valid range.
 */
export const statusError = (
  status: HttpStatus,
  message: SoftStr,
): HttpError => box("StatusError")({ status, message });

/**
 * An unexpected failure occurred while handling the request.
 */
export const internalError = (
  message: SoftStr,
): HttpError => box("InternalError")(message);

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
          allow: unique(error.content).join(", "),
        })
      : error.__tag === "BadRequest"
        ? textResponse(error.content, 400)
        : error.__tag === "Unsupported"
          ? textResponse(error.content, 501)
          : error.__tag === "Unauthorized"
            ? textResponse(error.content, 401)
            : error.__tag === "Forbidden"
              ? textResponse(error.content, 403)
              : error.__tag === "StatusError"
                ? textResponse(
                    error.content.message,
                    error.content.status.content,
                  )
                : textResponse(
                    "Internal Server Error",
                    500,
                  );

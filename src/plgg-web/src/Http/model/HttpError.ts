import { Box, SoftStr, box } from "plgg";
import {
  Method,
  HttpResponse,
  textResponse,
} from "plgg-web/index";

/**
 * Routing/handling failures as values, modeled as a plgg `Box` union so they
 * can be carried through `Result` and folded into a response at the seam.
 */
export type HttpError =
  | Box<"NotFound", SoftStr>
  | Box<"MethodNotAllowed", ReadonlyArray<Method>>
  | Box<"BadRequest", SoftStr>
  | Box<"Unsupported", SoftStr>
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
          : textResponse(
              "Internal Server Error",
              500,
            );

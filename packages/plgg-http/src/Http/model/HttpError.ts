import { SoftStr, match, defineVariant } from "plgg";
import {
  Method,
  HttpStatus,
  HttpResponse,
  textResponse,
} from "plgg-http/index";

/*
 * Routing/handling failures as values, modeled as a plgg `Box` union so they
 * can be carried through `Result` and folded into a response at the seam. Each
 * variant's `content` is a structured object payload (not a bare string), so the
 * vocabulary composes with the rest of the `Box`-wrapped error model. Each
 * variant is a `defineVariant` so its tag literal is written exactly once.
 */
const NotFound = defineVariant("NotFound")<{
  path: SoftStr;
}>();
const MethodNotAllowed = defineVariant(
  "MethodNotAllowed",
)<{ allowed: ReadonlyArray<Method> }>();
const BadRequest = defineVariant("BadRequest")<{
  message: SoftStr;
}>();
const Unsupported = defineVariant("Unsupported")<{
  message: SoftStr;
}>();
const Unauthorized = defineVariant("Unauthorized")<{
  message: SoftStr;
}>();
const Forbidden = defineVariant("Forbidden")<{
  message: SoftStr;
}>();
const StatusError = defineVariant("StatusError")<{
  status: HttpStatus;
  message: SoftStr;
}>();
const InternalError = defineVariant(
  "InternalError",
)<{ message: SoftStr }>();

/**
 * The union of routing/handling failures.
 */
export type HttpError =
  | ReturnType<typeof NotFound.make>
  | ReturnType<typeof MethodNotAllowed.make>
  | ReturnType<typeof BadRequest.make>
  | ReturnType<typeof Unsupported.make>
  | ReturnType<typeof Unauthorized.make>
  | ReturnType<typeof Forbidden.make>
  | ReturnType<typeof StatusError.make>
  | ReturnType<typeof InternalError.make>;

/**
 * No route matched the request path.
 */
export const notFound = (
  path: SoftStr,
): HttpError => NotFound.make({ path });

/**
 * The path matched but no route accepts the request method.
 */
export const methodNotAllowed = (
  allowed: ReadonlyArray<Method>,
): HttpError => MethodNotAllowed.make({ allowed });

/**
 * The request was malformed.
 */
export const badRequest = (
  message: SoftStr,
): HttpError => BadRequest.make({ message });

/**
 * The request method is not supported by this server.
 */
export const unsupported = (
  message: SoftStr,
): HttpError => Unsupported.make({ message });

/**
 * The request lacks valid authentication credentials (401). Distinct from
 * {@link forbidden}: the client is unauthenticated, not merely under-privileged.
 */
export const unauthorized = (
  message: SoftStr,
): HttpError => Unauthorized.make({ message });

/**
 * The client is authenticated but not permitted to access the resource (403).
 */
export const forbidden = (
  message: SoftStr,
): HttpError => Forbidden.make({ message });

/**
 * A failure at an arbitrary status code, for cases the explicit variants do
 * not cover. The carried {@link HttpStatus} keeps the code in valid range.
 */
export const statusError = (
  status: HttpStatus,
  message: SoftStr,
): HttpError =>
  StatusError.make({ status, message });

/**
 * An unexpected failure occurred while handling the request.
 */
export const internalError = (
  message: SoftStr,
): HttpError => InternalError.make({ message });

/*
 * Pattern matchers for folding an {@link HttpError} with `match`, so call sites
 * reference the variant by name (`match(e)([notFound$(), …])`) rather than a
 * bare tag string. Each mirrors its constructor above.
 */
export const notFound$ = NotFound.pattern;
export const methodNotAllowed$ =
  MethodNotAllowed.pattern;
export const badRequest$ = BadRequest.pattern;
export const unsupported$ = Unsupported.pattern;
export const unauthorized$ = Unauthorized.pattern;
export const forbidden$ = Forbidden.pattern;
export const statusError$ = StatusError.pattern;
export const internalError$ = InternalError.pattern;

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
  match(error)(
    [
      notFound$(),
      (): HttpResponse =>
        textResponse("Not Found", 404),
    ],
    [
      methodNotAllowed$(),
      (e): HttpResponse =>
        textResponse("Method Not Allowed", 405, {
          allow: unique(e.content.allowed).join(", "),
        }),
    ],
    [
      badRequest$(),
      (e): HttpResponse =>
        textResponse(e.content.message, 400),
    ],
    [
      unsupported$(),
      (e): HttpResponse =>
        textResponse(e.content.message, 501),
    ],
    [
      unauthorized$(),
      (e): HttpResponse =>
        textResponse(e.content.message, 401),
    ],
    [
      forbidden$(),
      (e): HttpResponse =>
        textResponse(e.content.message, 403),
    ],
    [
      statusError$(),
      (e): HttpResponse =>
        textResponse(
          e.content.message,
          e.content.status.content,
        ),
    ],
    [
      internalError$(),
      (): HttpResponse =>
        textResponse("Internal Server Error", 500),
    ],
  );

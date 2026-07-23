import { SoftStr, defineVariant } from "plgg";
import { HttpError } from "plgg-http";

/**
 * A transport-level failure on the client: the request never produced an HTTP
 * response at all (DNS failure, connection refused, a malformed URL, an aborted
 * read). Distinct from any {@link HttpError} the *server* models — a non-2xx
 * status is still a perfectly valid {@link HttpResponse}, not this.
 */
const Network = defineVariant("NetworkError")<{
  message: SoftStr;
}>();

export type NetworkError = ReturnType<
  typeof Network.make
>;

/**
 * Constructs a {@link NetworkError} carrying the underlying failure message as a
 * structured object payload (matching the rest of the `Box`-wrapped error
 * vocabulary).
 */
export const networkError = (
  message: SoftStr,
): NetworkError => Network.make({ message });

/**
 * The client refused to follow a redirect. The client sends every request with
 * `redirect: "manual"` so a 3xx is never auto-followed — custom auth headers
 * (`x-api-key`, …) survive a same-site redirect and would otherwise leak to the
 * redirect target. A redirect surfaces as this typed error for the caller to
 * inspect rather than being silently chased. (`redirect: "manual"` yields an
 * opaque response, so the concrete 3xx status / `Location` are not available.)
 */
const Redirect = defineVariant("RedirectError")<{
  message: SoftStr;
}>();

export type RedirectError = ReturnType<
  typeof Redirect.make
>;

/**
 * Constructs a {@link RedirectError}.
 */
export const redirectError = (
  message: SoftStr,
): RedirectError => Redirect.make({ message });

/**
 * The client's error vocabulary: the shared {@link HttpError} model from
 * `plgg-http`, widened with the client-only {@link NetworkError} and
 * {@link RedirectError}. Keeping these here rather than in the shared model
 * leaves the server's error fold untouched — a server never has a transport
 * failure talking to itself — while client and server still share one
 * `HttpError` vocabulary (via plgg-http).
 */
export type ClientError =
  | HttpError
  | NetworkError
  | RedirectError;

/**
 * Pattern matcher for folding a {@link ClientError} with `match`, so call sites
 * reference the variant by name (`match(e)([networkError$(), …])`) rather than a
 * bare tag string.
 */
export const networkError$ = Network.pattern;

/**
 * Pattern matcher for the {@link RedirectError} variant.
 */
export const redirectError$ = Redirect.pattern;

/**
 * Type guard for the client-only {@link NetworkError} variant.
 */
export const isNetworkError = (
  error: ClientError,
): error is NetworkError => Network.is(error);

/**
 * Type guard for the client-only {@link RedirectError} variant.
 */
export const isRedirectError = (
  error: ClientError,
): error is RedirectError => Redirect.is(error);

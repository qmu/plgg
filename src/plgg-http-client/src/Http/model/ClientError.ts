import { Box, SoftStr, box } from "plgg";
import { HttpError } from "plgg-http-router";

/**
 * A transport-level failure on the client: the request never produced an HTTP
 * response at all (DNS failure, connection refused, a malformed URL, an aborted
 * read). Distinct from any {@link HttpError} the *server* models — a non-2xx
 * status is still a perfectly valid {@link HttpResponse}, not this.
 */
export type NetworkError = Box<"NetworkError", SoftStr>;

/**
 * Constructs a {@link NetworkError} carrying the underlying failure message.
 */
export const networkError = (
  message: SoftStr,
): NetworkError => box("NetworkError")(message);

/**
 * The client's error vocabulary: the shared {@link HttpError} model reused from
 * `plgg-http-router`, widened with the client-only {@link NetworkError}. Keeping
 * `NetworkError` here rather than in the router's union leaves the server's
 * error fold untouched — a server never has a transport failure talking to
 * itself — while client and server still share one `HttpError` vocabulary.
 */
export type ClientError = HttpError | NetworkError;

/**
 * Type guard for the client-only {@link NetworkError} variant.
 */
export const isNetworkError = (
  error: ClientError,
): error is NetworkError =>
  error.__tag === "NetworkError";

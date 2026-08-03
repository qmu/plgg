import { SoftStr, Option } from "plgg";
import { Method } from "plgg-http";

/**
 * An AWS credential set. `sessionToken` is present only for
 * temporary (STS) credentials, in which case SigV4 both
 * signs and sends an `x-amz-security-token` header — so it
 * is an {@link Option}, never a nullable field.
 */
export type Sigv4Credentials = Readonly<{
  accessKeyId: SoftStr;
  secretAccessKey: SoftStr;
  sessionToken: Option<SoftStr>;
}>;

/**
 * Where a signature is valid: one AWS region and one
 * service. Together with the request date these form the
 * credential scope (`20150830/us-east-1/service/aws4_request`)
 * that binds a signature to a place, a day, and a service.
 */
export type Sigv4Scope = Readonly<{
  region: SoftStr;
  service: SoftStr;
}>;

/**
 * One header or query parameter as it appears **on the
 * wire**: a name and a value, in order, repeats allowed.
 *
 * This is deliberately NOT a `Dict`. Canonicalization is
 * defined over the wire message, and a map cannot express
 * what SigV4 must handle: the same header sent twice (whose
 * values are joined), or the same query key repeated (whose
 * values are sorted). A `Dict`-shaped input would silently
 * drop one of them and produce a signature AWS rejects —
 * or worse, one it accepts for a request the caller did not
 * mean to send. {@link sigv4Pairs} adapts a `Dict` for the
 * common single-valued case.
 */
export type Sigv4Pair = Readonly<{
  name: SoftStr;
  value: SoftStr;
}>;

/**
 * The request being signed, in the form canonicalization
 * needs it. `path` is the URI path only (never the full
 * URL, never the query); `query` and `headers` are ordered
 * wire pairs; `body` is the exact payload bytes as text,
 * empty for a body-less request.
 *
 * The `host` header is not synthesized — SigV4 signs what
 * is sent, so the caller supplies it exactly as the request
 * will carry it.
 */
export type Sigv4Request = Readonly<{
  method: Method;
  path: SoftStr;
  query: ReadonlyArray<Sigv4Pair>;
  headers: ReadonlyArray<Sigv4Pair>;
  body: SoftStr;
}>;

/**
 * The signing instant, pre-formatted in the two shapes
 * SigV4 uses: `amzDate` is the full ISO-8601 basic
 * timestamp (`20150830T123600Z`) that goes in the string to
 * sign and the `x-amz-date` header, and `dateStamp` is its
 * date half (`20150830`) that scopes the signing key.
 *
 * Both are derived from one `Date` by {@link sigv4Instant}.
 * They are carried as data rather than read from a clock
 * inside the signer, so signing is a pure function of its
 * inputs and a test can pin the exact instant AWS's
 * published vectors use.
 */
export type Sigv4Instant = Readonly<{
  amzDate: SoftStr;
  dateStamp: SoftStr;
}>;

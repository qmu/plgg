import {
  Box,
  Bin,
  SoftStr,
  Str,
  Option,
  Result,
  InvalidError,
  invalidError,
  refinedBrand,
  isSoftStr,
  box,
  ok,
  err,
  pipe,
  cast,
  forProp,
  forOptionProp,
  asStr,
  chainResult,
  mapErr,
  decodeJson,
} from "plgg";
import {
  Base64UrlStr,
  decodeBase64Url,
  utf8String,
} from "plgg-auth/Jose/model/Base64Url";
import {
  JoseError,
  decodeFailure,
  joseErrorFromInvalid,
} from "plgg-auth/Jose/model/JoseError";

/**
 * A branded JWS compact serialization (RFC 7515
 * §7.1): three dot-separated base64url segments.
 * Branded so an arbitrary string can never be
 * mistaken for a structurally valid JWS.
 */
export type CompactJws = Box<
  "CompactJws",
  string
>;

const compact = refinedBrand<
  "CompactJws",
  string,
  InvalidError
>(
  "CompactJws",
  (v): v is string =>
    isSoftStr(v) &&
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(
      v,
    ),
  () =>
    invalidError({
      message:
        "not a compact JWS (three dot-separated base64url segments)",
    }),
);

/** Type guard for {@link CompactJws}. */
export const isCompactJws = compact.is;

/**
 * Validates an unknown value into a
 * {@link CompactJws} at a boundary.
 */
export const asCompactJws = compact.as;

/** The underlying string of a {@link CompactJws}. */
export const compactJwsString = compact.unwrap;

/** The three segments of a compact JWS. */
export type JwsParts = Readonly<{
  header: Base64UrlStr;
  payload: Base64UrlStr;
  signature: Base64UrlStr;
}>;

/**
 * Splits a {@link CompactJws} into its segments.
 * The brand guarantees three dot-separated
 * base64url segments, so each part is boxed
 * directly, preserving the `Base64UrlStr`
 * invariant; the failure branch guards a box
 * built outside `asCompactJws`.
 */
export const parseCompactJws = (
  jws: CompactJws,
): Result<JwsParts, JoseError> => {
  const [header, payload, signature] =
    compactJwsString(jws).split(".");
  return header !== undefined &&
    payload !== undefined &&
    signature !== undefined
    ? ok({
        header: box("Base64UrlStr")(header),
        payload: box("Base64UrlStr")(payload),
        signature: box("Base64UrlStr")(signature),
      })
    : err(
        decodeFailure(
          "compact JWS does not split into three segments",
        ),
      );
};

/**
 * The JOSE header fields this library reads.
 * `kid` is optional in the wild (RFC 7515 vectors
 * omit it), so absence is an `Option`, not a
 * parse failure.
 */
export type JwsHeader = Readonly<{
  alg: Str;
  kid: Option<Str>;
}>;

/**
 * Validates an unknown value into a
 * {@link JwsHeader} at the decode boundary.
 */
export const asJwsHeader = (
  v: unknown,
): Result<JwsHeader, InvalidError> =>
  cast(
    v,
    forProp("alg", asStr),
    forOptionProp("kid", asStr),
  );

/**
 * Decodes the protected header out of
 * already-split segments — shared by both
 * verification paths, which parse the compact
 * form exactly once.
 */
export const jwsHeaderOfParts = (
  parts: JwsParts,
): Result<JwsHeader, JoseError> =>
  pipe(
    decodeBase64Url(parts.header),
    mapErr(joseErrorFromInvalid("DecodeFailure")),
    chainResult((bytes: Bin) =>
      pipe(
        utf8String(bytes),
        mapErr(
          joseErrorFromInvalid("DecodeFailure"),
        ),
      ),
    ),
    chainResult((json: SoftStr) =>
      pipe(
        decodeJson(json),
        mapErr(
          joseErrorFromInvalid("DecodeFailure"),
        ),
      ),
    ),
    chainResult((v: unknown) =>
      pipe(
        asJwsHeader(v),
        mapErr(
          joseErrorFromInvalid("DecodeFailure"),
        ),
      ),
    ),
  );

/**
 * Decodes the protected header of a compact JWS
 * without verifying anything.
 */
export const decodeJwsHeader = (
  jws: CompactJws,
): Result<JwsHeader, JoseError> =>
  pipe(
    parseCompactJws(jws),
    chainResult(jwsHeaderOfParts),
  );

import {
  PromisedResult,
  SoftStr,
  Dict,
  Defect,
  pipe,
  tryCatch,
  mapResult,
  matchOption,
} from "plgg";
import {
  Sigv4Credentials,
  Sigv4Instant,
  Sigv4Pair,
  Sigv4Request,
  Sigv4Scope,
} from "plgg-fetch/domain/model/Sigv4";
import {
  hmacSha256,
  sha256Hex,
  toHex,
  utf8Bytes,
} from "plgg-fetch/vendors/webcrypto";

/**
 * The signing algorithm identifier SigV4 puts on the first
 * line of the string to sign and at the head of the
 * `Authorization` header.
 */
const ALGORITHM = "AWS4-HMAC-SHA256";

/**
 * The fixed terminator of both the credential scope and the
 * signing-key derivation chain.
 */
const TERMINATOR = "aws4_request";

/**
 * RFC 3986 percent-encoding, which is stricter than
 * `encodeURIComponent`: `!`, `'`, `(`, `)` and `*` are
 * unreserved to `encodeURIComponent` but reserved to
 * RFC 3986, and AWS canonicalizes by RFC 3986. Leaving them
 * raw yields a signature AWS rejects for any request
 * carrying one.
 *
 * `encodeURIComponent` already emits uppercase hex over
 * UTF-8 bytes, which is exactly what SigV4 wants — so this
 * needs no byte-level encoder and no platform API.
 */
const uriEncode = (value: SoftStr): SoftStr =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c: string): string =>
      `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );

/**
 * Case-insensitive-free byte ordering for the two places
 * SigV4 sorts (header names, canonical query pairs). Spelled
 * out rather than relying on `sort()`'s default so the
 * comparison is visibly a byte comparison, which is what the
 * specification requires.
 */
const byteOrder = (
  a: string,
  b: string,
): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Canonicalizes the URI path: every segment
 * percent-encoded, the `/` separators preserved, and an
 * empty path rendered as `/`.
 *
 * **No path normalization.** SigV4 defines normalization
 * (collapsing `.`, `..` and doubled slashes) as a
 * per-service behaviour, and S3 — the service most often
 * signed by hand — explicitly does NOT normalize. Doing it
 * here would corrupt S3 keys that legitimately contain
 * those segments, so the path is signed exactly as given;
 * a caller for a normalizing service normalizes before it
 * signs. This mirrors AWS's own test-suite partition, which
 * keeps its path-normalization cases in a separate group
 * from the basic set.
 */
export const canonicalUri = (
  path: SoftStr,
): SoftStr =>
  path === ""
    ? "/"
    : path.split("/").map(uriEncode).join("/");

/**
 * Canonicalizes the query string: each name and value
 * percent-encoded, then the pairs sorted by encoded name
 * and, within a repeated name, by encoded value. A
 * value-less parameter signs as `name=`, and an empty query
 * signs as the empty string.
 */
export const canonicalQuery = (
  query: ReadonlyArray<Sigv4Pair>,
): SoftStr =>
  [
    ...query.map(
      (pair: Sigv4Pair): SoftStr =>
        `${uriEncode(pair.name)}=${uriEncode(pair.value)}`,
    ),
  ]
    .sort(byteOrder)
    .join("&");

/**
 * Trims a header value and collapses every run of spaces to
 * one — including inside a quoted value, which AWS's own
 * `get-header-value-trim` vector pins (`"a   b   c"` signs
 * as `"a b c"`).
 */
const normalizeHeaderValue = (
  value: SoftStr,
): SoftStr => value.trim().replace(/ +/g, " ");

/**
 * Groups header values by lowercased name into sorted
 * entries.
 *
 * **Repeated values are joined in wire order, never
 * sorted.** AWS's `get-header-value-order` vector sends
 * `value4, value1, value3, value2` and signs exactly that
 * sequence. Sorting them is a plausible-looking mistake
 * that produces a signature AWS rejects.
 */
const groupedHeaders = (
  headers: ReadonlyArray<Sigv4Pair>,
): ReadonlyArray<
  readonly [string, ReadonlyArray<SoftStr>]
> =>
  Object.entries(
    headers.reduce(
      (
        acc: Dict<string, ReadonlyArray<SoftStr>>,
        pair: Sigv4Pair,
      ): Dict<string, ReadonlyArray<SoftStr>> =>
        pipe(
          pair.name.toLowerCase(),
          (name: string) => ({
            ...acc,
            [name]: [
              ...(acc[name] ?? []),
              normalizeHeaderValue(pair.value),
            ],
          }),
        ),
      {},
    ),
  ).sort(([a], [b]) => byteOrder(a, b));

/**
 * The `;`-joined, sorted list of lowercased header names
 * the signature covers — the `SignedHeaders` component of
 * both the canonical request and the `Authorization`
 * header.
 */
export const signedHeaders = (
  headers: ReadonlyArray<Sigv4Pair>,
): SoftStr =>
  groupedHeaders(headers)
    .map(([name]): string => name)
    .join(";");

/**
 * The canonical headers block: one `name:value` line per
 * signed header, sorted by name, each line newline-
 * terminated (so the block ends with the blank line the
 * canonical-request format requires).
 */
const canonicalHeaders = (
  headers: ReadonlyArray<Sigv4Pair>,
): SoftStr =>
  groupedHeaders(headers)
    .map(
      ([name, values]): SoftStr =>
        `${name}:${values.join(",")}\n`,
    )
    .join("");

/**
 * The canonical request — SigV4's normalized rendering of
 * the HTTP message, whose hash the signature is ultimately
 * taken over. Pure: the payload hash is supplied rather
 * than computed, so this is directly checkable against
 * AWS's published vectors.
 */
export const canonicalRequest = (
  request: Sigv4Request,
  payloadHash: SoftStr,
): SoftStr =>
  [
    request.method,
    canonicalUri(request.path),
    canonicalQuery(request.query),
    canonicalHeaders(request.headers),
    signedHeaders(request.headers),
    payloadHash,
  ].join("\n");

/**
 * The credential scope —
 * `<date>/<region>/<service>/aws4_request` — which binds a
 * signature to one day, one region and one service.
 */
export const credentialScope = (
  instant: Sigv4Instant,
  scope: Sigv4Scope,
): SoftStr =>
  [
    instant.dateStamp,
    scope.region,
    scope.service,
    TERMINATOR,
  ].join("/");

/**
 * The string to sign: the algorithm, the request timestamp,
 * the credential scope, and the hex SHA-256 of the
 * canonical request. Pure, for the same reason
 * {@link canonicalRequest} is.
 */
export const stringToSign = (
  instant: Sigv4Instant,
  scope: Sigv4Scope,
  canonicalRequestHash: SoftStr,
): SoftStr =>
  [
    ALGORITHM,
    instant.amzDate,
    credentialScope(instant, scope),
    canonicalRequestHash,
  ].join("\n");

/**
 * Splits one instant into the two shapes SigV4 needs: the
 * ISO-8601 basic timestamp (`20150830T123600Z`) and its
 * date half (`20150830`). Derived from the UTC ISO string
 * by dropping the separators, so it never depends on the
 * host's locale or timezone.
 */
export const sigv4Instant = (
  at: Date,
): Sigv4Instant =>
  pipe(
    at.toISOString().replace(/[-:]|\.\d{3}/g, ""),
    (amzDate: string): Sigv4Instant => ({
      amzDate,
      dateStamp: amzDate.slice(0, 8),
    }),
  );

/**
 * Adapts a plgg `Dict` of headers or query parameters to
 * the ordered wire pairs canonicalization takes. For the
 * common single-valued case; a request that repeats a
 * header or a query key builds its {@link Sigv4Pair} array
 * directly, because a `Dict` cannot hold the repeat.
 */
export const sigv4Pairs = (
  dict: Dict<string, SoftStr>,
): ReadonlyArray<Sigv4Pair> =>
  Object.entries(dict).map(
    ([name, value]): Sigv4Pair => ({
      name,
      value,
    }),
  );

/**
 * Everything one signing call needs, as one value: who is
 * signing, where the signature is valid, when, and what.
 * A single argument rather than four, so the whole
 * operation lifts through `tryCatch` in one piece.
 */
export type Sigv4SignInput = Readonly<{
  credentials: Sigv4Credentials;
  scope: Sigv4Scope;
  instant: Sigv4Instant;
  request: Sigv4Request;
}>;

/**
 * What signing produced. `authorization` is the ready
 * header value; `canonicalRequest` and `stringToSign` come
 * back alongside it because AWS echoes its own version of
 * both in a `SignatureDoesNotMatch` response, and having
 * ours next to it turns a mismatch into a one-diff answer
 * rather than a guess.
 */
export type Sigv4Signed = Readonly<{
  authorization: SoftStr;
  signature: SoftStr;
  canonicalRequest: SoftStr;
  stringToSign: SoftStr;
}>;

/**
 * The hex SHA-256 of a request payload — the
 * `HashedPayload` line of the canonical request, and the
 * value S3 additionally wants echoed in an
 * `x-amz-content-sha256` header. Exposed so a caller can
 * put that header on the request BEFORE signing, since the
 * signature must cover every header actually sent.
 */
export const sigv4PayloadHash = tryCatch(
  (body: SoftStr): Promise<SoftStr> =>
    sha256Hex(body),
);

/**
 * Derives the SigV4 signing key: HMAC-SHA256 chained over
 * `"AWS4" + secret` → date → region → service →
 * `aws4_request`. Each link keys the next, so the resulting
 * key is usable only for that day, that region and that
 * service — the property that bounds the blast radius of a
 * leaked signature.
 */
const signingKey = (
  input: Sigv4SignInput,
): Promise<Uint8Array> =>
  hmacSha256(
    utf8Bytes(
      `AWS4${input.credentials.secretAccessKey}`,
    ),
    input.instant.dateStamp,
  )
    .then((kDate: Uint8Array) =>
      hmacSha256(kDate, input.scope.region),
    )
    .then((kRegion: Uint8Array) =>
      hmacSha256(kRegion, input.scope.service),
    )
    .then((kService: Uint8Array) =>
      hmacSha256(kService, TERMINATOR),
    );

/**
 * Renders the `Authorization` header value from its three
 * components.
 */
const authorizationOf = (
  input: Sigv4SignInput,
  signature: SoftStr,
): SoftStr =>
  [
    `${ALGORITHM} Credential=${input.credentials.accessKeyId}/${credentialScope(input.instant, input.scope)}`,
    `SignedHeaders=${signedHeaders(input.request.headers)}`,
    `Signature=${signature}`,
  ].join(", ");

/**
 * Signs a request with AWS Signature Version 4, returning
 * the `Authorization` value together with the intermediate
 * strings.
 *
 * **The request must already carry every header it will be
 * sent with** — `host`, `x-amz-date`, and
 * `x-amz-security-token` for temporary credentials. SigV4
 * signs the message as sent, so a header added after
 * signing is a header the signature does not cover and AWS
 * rejects the request. Nothing is synthesized here for that
 * reason: what you pass is exactly what is signed.
 *
 * The whole chain is lifted through `tryCatch`, so a Web
 * Crypto rejection (the vendor seam's only failure mode)
 * folds to a {@link Defect} rather than escaping as a
 * throw — one boundary rather than an error arm threaded
 * through every step.
 */
export const sigv4Sign = tryCatch(
  (input: Sigv4SignInput): Promise<Sigv4Signed> =>
    sha256Hex(input.request.body)
      .then((payloadHash: SoftStr) =>
        canonicalRequest(
          input.request,
          payloadHash,
        ),
      )
      .then((creq: SoftStr) =>
        sha256Hex(creq).then(
          (creqHash: SoftStr) => ({
            canonicalRequest: creq,
            stringToSign: stringToSign(
              input.instant,
              input.scope,
              creqHash,
            ),
          }),
        ),
      )
      .then((strings) =>
        signingKey(input)
          .then((key: Uint8Array) =>
            hmacSha256(key, strings.stringToSign),
          )
          .then((raw: Uint8Array): Sigv4Signed =>
            pipe(
              toHex(raw),
              (
                signature: SoftStr,
              ): Sigv4Signed => ({
                authorization: authorizationOf(
                  input,
                  signature,
                ),
                signature,
                canonicalRequest:
                  strings.canonicalRequest,
                stringToSign:
                  strings.stringToSign,
              }),
            ),
          ),
      ),
);

/**
 * The header {@link Dict} to spread into the outgoing
 * request: the `Authorization` value, plus
 * `x-amz-security-token` when the credentials are
 * temporary.
 *
 * The token header is emitted here **as well as** being
 * signed, so the request passed in must already carry it
 * among its `headers`. This function adds no header the
 * signature does not cover.
 */
export const sigv4Auth = (
  input: Sigv4SignInput,
): PromisedResult<
  Dict<string, SoftStr>,
  Defect
> =>
  sigv4Sign(input).then(
    mapResult(
      (
        signed: Sigv4Signed,
      ): Dict<string, SoftStr> => ({
        authorization: signed.authorization,
        ...pipe(
          input.credentials.sessionToken,
          matchOption(
            (): Dict<string, SoftStr> => ({}),
            (
              token: SoftStr,
            ): Dict<string, SoftStr> => ({
              "x-amz-security-token": token,
            }),
          ),
        ),
      }),
    ),
  );

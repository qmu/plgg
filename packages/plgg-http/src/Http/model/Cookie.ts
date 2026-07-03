import {
  Box,
  Bool,
  SoftStr,
  Num,
  Time,
  Option,
  Result,
  Dict,
  InvalidError,
  invalidError,
  refinedBrand,
  isSoftStr,
  some,
  none,
  ok,
  err,
  pipe,
  fromNullable,
  chainOption,
  matchOption,
  mapResult,
} from "plgg";
import {
  HttpRequest,
  HttpResponse,
  getHeader,
} from "plgg-http/index";

/**
 * A branded cookie name: an RFC 6265 `token`.
 * Branded so an arbitrary string (separators,
 * spaces, control characters) can never reach a
 * `Set-Cookie` line.
 */
export type CookieName = Box<
  "CookieName",
  string
>;

const cookieName = refinedBrand<
  "CookieName",
  string,
  InvalidError
>(
  "CookieName",
  (v): v is string =>
    isSoftStr(v) &&
    /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(v),
  () =>
    invalidError({
      message:
        "a cookie name must be a non-empty RFC 6265 token",
    }),
);

/** Type guard for {@link CookieName}. */
export const isCookieName = cookieName.is;

/** Validates an unknown value into a {@link CookieName}. */
export const asCookieName = cookieName.as;

/** The underlying string of a {@link CookieName}. */
export const cookieNameString = cookieName.unwrap;

/**
 * A branded cookie value: zero or more RFC 6265
 * `cookie-octet`s (no control characters,
 * whitespace, double quotes, commas, semicolons,
 * or backslashes).
 */
export type CookieValue = Box<
  "CookieValue",
  string
>;

const cookieValue = refinedBrand<
  "CookieValue",
  string,
  InvalidError
>(
  "CookieValue",
  (v): v is string =>
    isSoftStr(v) &&
    /^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]*$/.test(
      v,
    ),
  () =>
    invalidError({
      message:
        "a cookie value must contain only RFC 6265 cookie-octets",
    }),
);

/** Type guard for {@link CookieValue}. */
export const isCookieValue = cookieValue.is;

/** Validates an unknown value into a {@link CookieValue}. */
export const asCookieValue = cookieValue.as;

/** The underlying string of a {@link CookieValue}. */
export const cookieValueString =
  cookieValue.unwrap;

/** The RFC 6265bis SameSite enforcement modes. */
export type SameSite = "Strict" | "Lax" | "None";

/**
 * A typed `Set-Cookie` header: name/value plus
 * the attributes this library serializes.
 * Absence is `Option`, never `undefined`.
 */
export type SetCookie = Readonly<{
  name: CookieName;
  value: CookieValue;
  path: Option<SoftStr>;
  domain: Option<SoftStr>;
  maxAge: Option<Num>;
  expires: Option<Time>;
  httpOnly: Bool;
  secure: Bool;
  sameSite: Option<SameSite>;
}>;

/** A bare cookie: no attributes set. */
export const cookie = (
  name: CookieName,
  value: CookieValue,
): SetCookie => ({
  name,
  value,
  path: none(),
  domain: none(),
  maxAge: none(),
  expires: none(),
  httpOnly: false,
  secure: false,
  sameSite: none(),
});

/**
 * The recommended session-cookie baseline:
 * `Path=/; HttpOnly; Secure; SameSite=Lax`.
 * Auth flows (e.g. an OIDC provider's session)
 * should start here and loosen deliberately, not
 * the other way around.
 */
export const sessionCookie = (
  name: CookieName,
  value: CookieValue,
): SetCookie => ({
  ...cookie(name, value),
  path: some("/"),
  httpOnly: true,
  secure: true,
  sameSite: some("Lax"),
});

/** Sets the `Path` attribute (data-last). */
export const withPath =
  (path: SoftStr) =>
  (c: SetCookie): SetCookie => ({
    ...c,
    path: some(path),
  });

/** Sets the `Domain` attribute (data-last). */
export const withDomain =
  (domain: SoftStr) =>
  (c: SetCookie): SetCookie => ({
    ...c,
    domain: some(domain),
  });

/** Sets the `Max-Age` attribute in seconds (data-last). */
export const withMaxAge =
  (seconds: Num) =>
  (c: SetCookie): SetCookie => ({
    ...c,
    maxAge: some(seconds),
  });

/** Sets the `Expires` attribute (data-last). */
export const withExpires =
  (at: Time) =>
  (c: SetCookie): SetCookie => ({
    ...c,
    expires: some(at),
  });

/** Sets the `SameSite` attribute (data-last). */
export const withSameSite =
  (mode: SameSite) =>
  (c: SetCookie): SetCookie => ({
    ...c,
    sameSite: some(mode),
  });

/** Marks the cookie `HttpOnly` (data-last). */
export const httpOnlyCookie = (
  c: SetCookie,
): SetCookie => ({ ...c, httpOnly: true });

/** Marks the cookie `Secure` (data-last). */
export const secureCookie = (
  c: SetCookie,
): SetCookie => ({ ...c, secure: true });

const sameSiteNoneInsecure = (
  c: SetCookie,
): boolean =>
  matchOption(
    () => false,
    (mode: SameSite) =>
      mode === "None" && !c.secure,
  )(c.sameSite);

/**
 * Serializes a {@link SetCookie} to its header
 * value. `SameSite=None` without `Secure` is
 * rejected (browsers discard it, so emitting it
 * would be a silent no-op).
 */
export const serializeCookie = (
  c: SetCookie,
): Result<SoftStr, InvalidError> =>
  sameSiteNoneInsecure(c)
    ? err(
        invalidError({
          message:
            "SameSite=None requires Secure (browsers reject it otherwise)",
        }),
      )
    : ok(
        [
          `${cookieNameString(c.name)}=${cookieValueString(c.value)}`,
          ...matchOption(
            (): ReadonlyArray<string> => [],
            (p: SoftStr) => [`Path=${p}`],
          )(c.path),
          ...matchOption(
            (): ReadonlyArray<string> => [],
            (d: SoftStr) => [`Domain=${d}`],
          )(c.domain),
          ...matchOption(
            (): ReadonlyArray<string> => [],
            (n: Num) => [`Max-Age=${n}`],
          )(c.maxAge),
          ...matchOption(
            (): ReadonlyArray<string> => [],
            (t: Time) => [
              `Expires=${t.toUTCString()}`,
            ],
          )(c.expires),
          ...(c.httpOnly ? ["HttpOnly"] : []),
          ...(c.secure ? ["Secure"] : []),
          ...matchOption(
            (): ReadonlyArray<string> => [],
            (mode: SameSite) => [
              `SameSite=${mode}`,
            ],
          )(c.sameSite),
        ].join("; "),
      );

const unquote = (value: SoftStr): SoftStr =>
  value.startsWith('"') && value.endsWith('"')
    ? value.slice(1, -1)
    : value;

/**
 * Parses a request `Cookie` header value into a
 * `Dict`. Malformed pairs (no `=`, empty name)
 * are skipped, later duplicates win, and
 * DQUOTE-wrapped values are unwrapped. The
 * computed-key accumulation creates own
 * properties only, so a `__proto__` cookie name
 * cannot pollute the result.
 */
export const parseCookies = (
  header: SoftStr,
): Dict<string, SoftStr> =>
  header
    .split(";")
    .map((pair) => pair.trim())
    .filter((pair) => pair.length > 0)
    .reduce<Dict<string, SoftStr>>(
      (acc, pair) => {
        const eq = pair.indexOf("=");
        return eq <= 0
          ? acc
          : {
              ...acc,
              [pair.slice(0, eq).trim()]: unquote(
                pair.slice(eq + 1).trim(),
              ),
            };
      },
      {},
    );

/**
 * Looks up an own key only — these maps are
 * built from untrusted client input and inherit
 * `Object.prototype` (mirrors HttpRequest's
 * `lookup`).
 */
const lookupOwn = (
  map: Dict<string, SoftStr>,
  name: SoftStr,
): Option<SoftStr> =>
  Object.prototype.hasOwnProperty.call(map, name)
    ? fromNullable(map[name])
    : none();

/**
 * Reads one cookie from a request's `Cookie`
 * header as an `Option` (data-last).
 */
export const getCookie =
  (name: SoftStr) =>
  (request: HttpRequest): Option<SoftStr> =>
    pipe(
      getHeader(request, "cookie"),
      chainOption((header: SoftStr) =>
        lookupOwn(parseCookies(header), name),
      ),
    );

/**
 * Appends a `Set-Cookie` to a response
 * (data-last). Multiple cookies fold into one
 * `set-cookie` Dict entry joined on `"\n"` — the
 * one header that cannot be comma-joined — and
 * the serving seam (`toNativeResponse`) splits
 * on `"\n"` and `append`s each line as its own
 * header. `"\n"` cannot appear in a serialized
 * cookie (the brands exclude control
 * characters), so the join is unambiguous.
 */
export const withSetCookie =
  (c: SetCookie) =>
  (
    response: HttpResponse,
  ): Result<HttpResponse, InvalidError> =>
    pipe(
      serializeCookie(c),
      mapResult(
        (line: SoftStr): HttpResponse => ({
          ...response,
          headers: {
            ...response.headers,
            "set-cookie": pipe(
              lookupOwn(
                response.headers,
                "set-cookie",
              ),
              matchOption(
                () => line,
                (prev: SoftStr) =>
                  `${prev}\n${line}`,
              ),
            ),
          },
        }),
      ),
    );

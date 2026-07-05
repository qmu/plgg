import {
  type SoftStr,
  type Option,
  type PromisedResult,
  err,
  pipe,
  some,
  none,
  matchOption,
} from "plgg";
import {
  type HttpResponse,
  type HttpError,
  type SetCookie,
  type CookieName,
  type CookieValue,
  forbidden,
  getCookie,
  getHeader,
  cookie,
  withPath,
  withSameSite,
} from "plgg-http";
import {
  type Context,
} from "plgg-server/Http/model/Context";
import {
  type Middleware,
  type Next,
} from "plgg-server/Http/model/Handler";

/** Methods that never change state — CSRF is skipped for them. */
const SAFE_METHODS: ReadonlyArray<string> = [
  "GET",
  "HEAD",
  "OPTIONS",
];

/**
 * A fresh CSPRNG double-submit token — 32 bytes of
 * `crypto.getRandomValues` hex-encoded, safe to place in both
 * a cookie value and a hidden form field.
 */
export const issueCsrfToken = (): SoftStr => {
  const bytes = crypto.getRandomValues(
    new Uint8Array(32),
  );
  // byte-buffer seam: hex-encode the random bytes.
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += (bytes[i] ?? 0)
      .toString(16)
      .padStart(2, "0");
  }
  return hex;
};

/**
 * The double-submit CSRF cookie: **non-HttpOnly** (the page
 * script/form must read it to echo the token),
 * `SameSite=Strict`, `Secure`, and `Path`-scoped to the
 * protected subtree.
 */
export const csrfCookie = (
  name: CookieName,
  token: CookieValue,
  path: SoftStr,
): SetCookie => ({
  ...pipe(
    cookie(name, token),
    withPath(path),
    withSameSite("Strict"),
  ),
  secure: true,
});

/**
 * Constant-time string equality (XOR-accumulate over
 * equal-length inputs) — the same shape as ticket 18's
 * password verify, so a token comparison cannot leak via
 * timing. Unequal lengths fail without a fast-path branch on
 * content.
 */
const constantTimeEqual = (
  a: SoftStr,
  b: SoftStr,
): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  // char-scan seam: accumulate the XOR of every code unit.
  let acc = 0;
  for (let i = 0; i < a.length; i++) {
    acc |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return acc === 0;
};

/** Reads the submitted token from the header, else the form body. */
const submittedToken = (
  c: Context,
  fieldName: SoftStr,
): Option<SoftStr> =>
  matchOption<SoftStr, Option<SoftStr>>(
    () =>
      fromField(
        new URLSearchParams(c.req.body).get(
          fieldName,
        ),
      ),
    (h: SoftStr) => some(h),
  )(getHeader(c.req, "x-csrf-token"));

const fromField = (
  v: string | null,
): Option<SoftStr> =>
  v === null ? none() : some(v);

/**
 * Double-submit CSRF guard: on an unsafe method, the cookie
 * token and the submitted token (an `X-CSRF-Token` header or
 * a form field) must be present and equal (constant-time),
 * else 403. Safe methods pass through untouched. Generic — no
 * auth coupling — so any state-changing form reuses it.
 */
export const requireCsrf =
  (
    cookieName: SoftStr,
    fieldName: SoftStr,
  ): Middleware =>
  (
    c: Context,
    next: Next,
  ): PromisedResult<HttpResponse, HttpError> =>
    SAFE_METHODS.includes(c.req.method)
      ? next(c)
      : matchOption<
          SoftStr,
          PromisedResult<HttpResponse, HttpError>
        >(
          () => rejected(),
          (cookieTok: SoftStr) =>
            matchOption<
              SoftStr,
              PromisedResult<
                HttpResponse,
                HttpError
              >
            >(
              () => rejected(),
              (sent: SoftStr) =>
                constantTimeEqual(cookieTok, sent)
                  ? next(c)
                  : rejected(),
            )(submittedToken(c, fieldName)),
        )(getCookie(cookieName)(c.req));

const rejected = (): PromisedResult<
  HttpResponse,
  HttpError
> =>
  Promise.resolve(
    err(forbidden("CSRF token mismatch")),
  );

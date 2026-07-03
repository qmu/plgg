import {
  Dict,
  SoftStr,
  pipe,
  tryCatch,
  toOption,
  getOr,
} from "plgg";

/**
 * Decodes a form token, falling back to the raw
 * value on malformed percent-encoding — the same
 * degradation strategy as plgg-router's
 * `parseQuery` (algorithm shared by parallel
 * definition; peer packages do not import each
 * other's implementation).
 */
const safeDecode = (part: SoftStr): SoftStr =>
  pipe(
    tryCatch((p: SoftStr) =>
      decodeURIComponent(p),
    )(part),
    toOption,
    getOr(part),
  );

/**
 * Decodes one `application/x-www-form-urlencoded`
 * token: `+` means space (translated before
 * percent-decoding, so an encoded `%2B` stays a
 * literal plus).
 */
const decodeToken = (part: SoftStr): SoftStr =>
  safeDecode(part.replace(/\+/g, " "));

/**
 * Parses an `application/x-www-form-urlencoded`
 * body into a `Dict`. The seam
 * (`toHttpRequest`) already lands such bodies as
 * text in `request.body`, so this is a pure
 * string step. Empty pairs are dropped; a key
 * with no `=` maps to the empty string; later
 * duplicates win. The computed-key accumulation
 * creates own properties only, so a `__proto__`
 * field cannot pollute the result.
 */
export const parseForm = (
  body: SoftStr,
): Dict<string, SoftStr> =>
  body
    .split("&")
    .filter((pair) => pair.length > 0)
    .reduce<Dict<string, SoftStr>>(
      (acc, pair) => {
        const eq = pair.indexOf("=");
        return {
          ...acc,
          [decodeToken(
            eq === -1 ? pair : pair.slice(0, eq),
          )]: decodeToken(
            eq === -1 ? "" : pair.slice(eq + 1),
          ),
        };
      },
      {},
    );

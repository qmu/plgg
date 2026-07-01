import {
  Dict,
  SoftStr,
  pipe,
  tryCatch,
  toOption,
  getOr,
} from "plgg";

/**
 * Decodes a query token, falling back to the raw value on malformed
 * percent-encoding — same degradation strategy as the path matcher's decode.
 */
const safeDecode = (part: SoftStr): SoftStr =>
  pipe(
    tryCatch((p: SoftStr) => decodeURIComponent(p))(
      part,
    ),
    toOption,
    getOr(part),
  );

/**
 * Parses a `?key=val&key2=val2` search string into a plgg `Dict`, percent-
 * decoding keys and values (degrading to the raw token on malformed input). A
 * leading `?` is optional; empty pairs are dropped; a key with no `=` maps to
 * the empty string. Later duplicates win.
 *
 * plgg-server parses query via the Web `URL`; in a pure-data context this does
 * it directly so the core stays free of any platform `URL` dependency.
 */
export const parseQuery = (
  search: SoftStr,
): Dict<string, SoftStr> =>
  (search.startsWith("?")
    ? search.slice(1)
    : search
  )
    .split("&")
    .filter((pair) => pair.length > 0)
    .reduce<Dict<string, SoftStr>>((acc, pair) => {
      const eq = pair.indexOf("=");
      const key = safeDecode(
        eq === -1 ? pair : pair.slice(0, eq),
      );
      const value = safeDecode(
        eq === -1 ? "" : pair.slice(eq + 1),
      );
      return { ...acc, [key]: value };
    }, {});
